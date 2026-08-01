/**
 * Tests for read-only-guard. No dependencies — run with:
 *
 *   node --test plugins/security-audit/hooks/
 *
 * Every "must be denied" case below is a bypass that existed in an earlier
 * revision of this hook and was found in review. They are kept as regressions:
 * this file is a security control, and the failure mode of a security control is
 * silent.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluate } = require('./read-only-guard.js');

const GUARD = path.join(__dirname, 'read-only-guard.js');

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const denied = (payload) => evaluate(payload).action === 'deny';
const passed = (payload) => evaluate(payload).action === 'passthrough';

test('permits the R5 allowlist', () => {
  const allowed = [
    'git log --oneline -20',
    'git log --stat main...HEAD',
    'git diff --stat main...HEAD',
    'git show HEAD',
    'git ls-files',
    'git status --short',
    'npm ls --depth=0',
    'pip list',
    'cargo tree',
    'jq . package.json',
  ];
  for (const command of allowed) {
    assert.ok(passed(bash(command)), `should permit: ${command}`);
  }
});

test('denies redirection — cannot be used to write a file', () => {
  // Found in review: ALLOWED was a prefix match, so anything appended passed.
  // `git show <ref>:<path> >> ~/.bashrc` writes attacker-chosen content from the
  // audited repo into a shell rc file.
  const bypasses = [
    'git log > ~/.bashrc',
    'git show HEAD:evil.txt >> ~/.bashrc',
    'git diff --output=/tmp/pwned.txt',
    'git diff -o /tmp/pwned.txt',
    'jq . package.json > /tmp/out.json',
    'git log < /etc/passwd',
  ];
  for (const command of bypasses) {
    assert.ok(denied(bash(command)), `should deny: ${command}`);
  }
});

test('denies every command separator, including a single ampersand', () => {
  // Found in review: the split regex knew `&&` but not `&`, so anything after a
  // single `&` was judged as part of the allowed segment.
  const bypasses = [
    'git log & touch /tmp/pwned',
    'git log & mkdir /tmp/x',
    'git log && rm -rf /',
    'git log || curl https://evil.example',
    'git log; npm install evil-package',
    'git log | grep secret',
    'git log\ntouch /tmp/pwned',
    'git log\r\ntouch /tmp/pwned',
  ];
  for (const command of bypasses) {
    assert.ok(denied(bash(command)), `should deny: ${command}`);
  }
});

test('denies git subcommands that are not read-only', () => {
  // Found in review: the hook allowed status|branch|remote while R5 in the agent
  // permitted only log|diff|show|ls-files. `git branch -D` is data loss;
  // `git remote set-url` redirects a later push.
  const bypasses = [
    'git branch -D main',
    'git remote set-url origin https://evil.tld/x.git',
    'git checkout main',
    'git commit -m x',
    'git push origin main',
    'git',
  ];
  for (const command of bypasses) {
    assert.ok(denied(bash(command)), `should deny: ${command}`);
  }
});

test('denies command substitution and subshells', () => {
  const bypasses = [
    'git log $(rm -rf /)',
    'git log `rm -rf /`',
    'git log --grep=$(whoami)',
    '(git log)',
    'git log ${HOME}',
  ];
  for (const command of bypasses) {
    assert.ok(denied(bash(command)), `should deny: ${command}`);
  }
});

test('denies flags that execute another program', () => {
  // `git -c core.pager=…` and `-c alias.…` are arbitrary code execution.
  const bypasses = [
    'git -c core.pager=sh log',
    'git -c alias.x=!sh log',
    'git --git-dir=/tmp/evil log',
    'git log --ext-diff',
    'git ls-files --exec=sh',
  ];
  for (const command of bypasses) {
    assert.ok(denied(bash(command)), `should deny: ${command}`);
  }
});

test('denies binaries that are not on the allowlist', () => {
  const bypasses = [
    'cat /etc/passwd',
    'rm -rf /',
    'curl https://evil.example',
    'node evil.js',
    'npm install',
    'npm run build',
    'pip install evil',
  ];
  for (const command of bypasses) {
    assert.ok(denied(bash(command)), `should deny: ${command}`);
  }
});

test('fails closed on malformed payloads', () => {
  // Found in review: a `null` payload threw an uncaught TypeError, the process
  // exited non-zero with empty stdout, and a non-blocking hook error lets the
  // tool call proceed — i.e. it failed open.
  const malformed = [null, 5, 'hello', [], undefined];
  for (const payload of malformed) {
    assert.ok(denied(payload), `should deny payload: ${JSON.stringify(payload)}`);
  }
  assert.ok(denied({ tool_name: 'Bash' }), 'should deny missing tool_input');
  assert.ok(denied({ tool_name: 'Bash', tool_input: {} }), 'should deny missing command');
  assert.ok(denied(bash('   ')), 'should deny whitespace-only command');
  assert.ok(denied(bash('&&')), 'should deny separator-only command');
});

test('never emits allow for non-Bash tools', () => {
  // Found in review: returning an explicit `allow` suppresses the operator's own
  // permission prompt. Wired with a broad matcher, the read-only guard would have
  // auto-approved every Write.
  const other = [
    { tool_name: 'Write', tool_input: { file_path: '/etc/passwd', content: 'x' } },
    { tool_name: 'Edit', tool_input: { file_path: '/etc/hosts' } },
    { tool_name: 'Read', tool_input: { file_path: '/x' } },
  ];
  for (const payload of other) {
    const result = evaluate(payload);
    assert.strictEqual(result.action, 'passthrough', `${payload.tool_name} must pass through`);
    assert.ok(!('permissionDecision' in result), 'must not carry a decision');
  }
});

test('does not deny legitimate read-only commands that merely contain a scary word', () => {
  // Found in review: the old denylist matched inside arguments, so these were
  // wrongly blocked mid-audit with a message accusing the auditor of mutating state.
  const legitimate = [
    'git show HEAD:scripts/sh/build',
    'git log --grep=node',
    'git log --grep=rm',
    'git diff -- src/curl-client.ts',
    'git ls-files *.sql',
  ];
  for (const command of legitimate) {
    assert.ok(passed(bash(command)), `should permit: ${command}`);
  }
});

test('end-to-end: emits a parseable deny decision on stdout', () => {
  const run = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify(bash('git log && rm -rf /')),
    encoding: 'utf8',
  });
  assert.strictEqual(run.status, 0, 'must exit 0');
  const output = JSON.parse(run.stdout);
  assert.strictEqual(output.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.strictEqual(output.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /read-only-guard/);
});

test('end-to-end: unparseable stdin is denied, not crashed on', () => {
  const run = spawnSync(process.execPath, [GUARD], { input: 'not json', encoding: 'utf8' });
  assert.strictEqual(run.status, 0, 'must exit 0');
  assert.strictEqual(JSON.parse(run.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('end-to-end: an allowed command produces no decision', () => {
  const run = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify(bash('git log --oneline')),
    encoding: 'utf8',
  });
  assert.strictEqual(run.status, 0, 'must exit 0');
  assert.deepStrictEqual(JSON.parse(run.stdout), {}, 'must emit no decision');
});
