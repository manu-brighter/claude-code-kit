#!/usr/bin/env node
/**
 * read-only-guard — PreToolUse hook that enforces the security-safety-auditor's
 * R5 Bash allowlist instead of merely asking for it.
 *
 * OPT-IN BY DESIGN. This file is deliberately NOT registered in a hooks.json,
 * because Claude Code's PreToolUse payload carries no reliable "which agent is
 * running" field. A registered hook would therefore deny Bash in *every* session,
 * not just the auditor's. Wire it up yourself, per project, when you want the
 * guarantee — see the plugin README.
 *
 * Written in Node rather than Python or shell on purpose: `node` is present
 * wherever Claude Code runs and is spelled the same on every platform. `python3`
 * does not exist on a default Windows install, where the name resolves to a
 * Microsoft Store stub that fails with a localized error.
 *
 * Contract: reads the hook payload as JSON on stdin, writes a PreToolUse
 * decision as JSON on stdout, exits 0. Fails closed — a payload it cannot parse
 * is denied, not waved through.
 */

const ALLOWED = [
  /^git\s+(log|diff|show|ls-files|status|branch|remote)\b/,
  /^npm\s+ls\b/,
  /^pip\s+list\b/,
  /^cargo\s+tree\b/,
  /^jq\b/,
];

/** Shell metacharacters that let a denied command hide behind an allowed one. */
const SUBSTITUTION = /\$\(|`|<\(|>\(/;

/** Anything that writes, installs, fetches, or runs project code. */
const NEVER = /\b(rm|mv|cp|chmod|chown|dd|mkfs|curl|wget|nc|ssh|scp|npm\s+(i|install|audit|run|exec)|npx|yarn\s+(add|install)|pnpm\s+(add|install)|pip\s+install|node|python3?|sh|bash|zsh|eval|tee|truncate)\b/;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
      systemMessage: reason,
    }),
  );
  process.exit(0);
}

function allow() {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    }),
  );
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    deny('read-only-guard: unparseable hook payload — denying (fail closed).');
  }

  if (payload.tool_name !== 'Bash') allow();

  const command = (payload.tool_input && payload.tool_input.command) || '';
  if (!command.trim()) {
    deny('read-only-guard: empty Bash command — denying (fail closed).');
  }

  if (SUBSTITUTION.test(command)) {
    deny(
      'read-only-guard: command substitution is not permitted during a read-only ' +
        'audit — it can hide a mutating command inside an allowed one. Report the ' +
        'command in your Coverage Gaps section for a human to run.',
    );
  }

  // Split on every chaining operator so `git log && rm -rf /` is judged per segment.
  const segments = command
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    if (NEVER.test(segment)) {
      deny(
        `read-only-guard: "${segment}" can mutate state, install, or execute code. ` +
          'The auditor is read-only (R4). Describe the command in your report instead.',
      );
    }
    if (!ALLOWED.some((pattern) => pattern.test(segment))) {
      deny(
        `read-only-guard: "${segment}" is not on the R5 allowlist. Permitted: git ` +
          'log/diff/show/ls-files/status/branch/remote, npm ls, pip list, cargo tree, ' +
          'jq. Use your Read, Grep and Glob tools for anything file-related.',
      );
    }
  }

  allow();
});
