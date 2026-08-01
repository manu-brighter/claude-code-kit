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
 * DESIGN: allowlist, not denylist. A denylist of forbidden commands leaks
 * forever — every shell has one more way to write a file. So a segment is denied
 * unless it consists of an approved binary, an approved subcommand, and
 * arguments that contain no shell metacharacter and no output-redirecting or
 * code-executing flag. Anything unparseable, unfamiliar, or merely ambiguous is
 * denied.
 *
 * Contract: reads the hook payload as JSON on stdin, writes a PreToolUse
 * decision as JSON on stdout, exits 0. Only ever emits `deny` or no decision at
 * all — it never emits `allow`, because an explicit allow would suppress the
 * operator's own permission prompt and auto-approve the call. Staying silent
 * lets normal permission handling proceed.
 */

/** Approved binaries → approved subcommands. `null` means the binary takes none. */
const COMMANDS = {
  git: ['log', 'diff', 'show', 'ls-files', 'status'],
  npm: ['ls'],
  pip: ['list'],
  cargo: ['tree'],
  jq: null,
};

/**
 * Shell metacharacters. Their presence anywhere in a segment is fatal: they are
 * how redirection (`>`), substitution (`$(…)`, backtick), and subshells (`(…)`)
 * smuggle a second command past a check on the first one. Note `*`, `?` and `\`
 * are deliberately absent — they cannot start a new command, and excluding them
 * would break legitimate pathspecs and Windows paths.
 */
const METACHARACTER = /[<>$`(){}]/;

/** Operators that start a new command. Longest-first so `&&` never splits as `&`. */
const SEPARATOR = /&&|\|\||;|\||&|\r|\n/;

/**
 * Flags that redirect output to a file or hand execution to another program.
 * These are the ones that turn a read-only verb into a write or an RCE:
 * `git -c core.pager=…` and `git -c alias.…` execute arbitrary shell,
 * `git diff --output=` writes a file, `--upload-pack`/`--exec` run a binary.
 */
const FORBIDDEN_FLAG =
  /^(-c|-C|-o|--output|--exec|--upload-pack|--receive-pack|--ext-diff|--config|--git-dir|--work-tree|--namespace|--no-pager=|--pager)(=|$)/;

/**
 * Decide on one payload.
 *
 * @returns {{action: 'deny', reason: string} | {action: 'passthrough'}}
 */
function evaluate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      action: 'deny',
      reason: 'read-only-guard: hook payload is not an object — denying (fail closed).',
    };
  }

  // Not a Bash call: emit no decision so the operator's normal permission
  // handling applies. Never return `allow` here — that would auto-approve
  // Write and Edit if this hook were ever wired with a broad matcher.
  if (payload.tool_name !== 'Bash') return { action: 'passthrough' };

  const input = payload.tool_input;
  const command = input && typeof input.command === 'string' ? input.command : '';
  if (!command.trim()) {
    return {
      action: 'deny',
      reason: 'read-only-guard: missing or empty Bash command — denying (fail closed).',
    };
  }

  const segments = command
    .split(SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return {
      action: 'deny',
      reason: 'read-only-guard: no executable segment found — denying (fail closed).',
    };
  }

  for (const segment of segments) {
    const verdict = checkSegment(segment);
    if (verdict) return { action: 'deny', reason: verdict };
  }

  return { action: 'passthrough' };
}

/** @returns {string | null} a denial reason, or null if the segment is acceptable. */
function checkSegment(segment) {
  if (METACHARACTER.test(segment)) {
    return (
      `read-only-guard: "${segment}" contains a shell metacharacter (redirection, ` +
      'substitution or subshell). During a read-only audit these can hide a mutating ' +
      'command inside an allowed one. Report the command in your Coverage Gaps ' +
      'section for a human to run.'
    );
  }

  // Quoted arguments containing spaces will split wrongly here. That can only
  // produce a false denial, never a false approval, which is the correct
  // direction to fail.
  const tokens = segment.split(/\s+/).filter(Boolean);
  const [binary, ...rest] = tokens;

  const subcommands = Object.prototype.hasOwnProperty.call(COMMANDS, binary)
    ? COMMANDS[binary]
    : undefined;

  if (subcommands === undefined) {
    return (
      `read-only-guard: "${binary}" is not on the R5 allowlist. Permitted: ` +
      `${Object.keys(COMMANDS).join(', ')}. Use your Read, Grep and Glob tools for ` +
      'anything file-related — they respect the operator\'s hooks, which shell ' +
      'equivalents bypass.'
    );
  }

  if (subcommands !== null) {
    // The subcommand must be the very first argument. This also rejects global
    // options placed before it (`git -c core.pager=… log`), which is the point:
    // `-c` is arbitrary code execution.
    const subcommand = rest[0];
    if (!subcommand || !subcommands.includes(subcommand)) {
      return (
        `read-only-guard: "${binary} ${subcommand || ''}".trim() is not permitted. ` +
        `Allowed subcommands for ${binary}: ${subcommands.join(', ')}.`
      );
    }
  }

  for (const token of rest) {
    if (FORBIDDEN_FLAG.test(token)) {
      return (
        `read-only-guard: "${token}" can redirect output to a file or execute another ` +
        'program, which would break the read-only guarantee (R4). Describe the command ' +
        'in your report instead.'
      );
    }
  }

  return null;
}

function render(result) {
  if (result.action === 'passthrough') return '{}';
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: result.reason,
    },
    systemMessage: result.reason,
  });
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });
  process.stdin.on('end', () => {
    let result;
    try {
      result = evaluate(JSON.parse(raw));
    } catch {
      result = {
        action: 'deny',
        reason: 'read-only-guard: unparseable hook payload — denying (fail closed).',
      };
    }
    // Write without process.exit(): on POSIX, stdout to a pipe is asynchronous
    // and exiting immediately can truncate the payload, which would leave no
    // parseable decision at all.
    process.stdout.write(render(result));
    process.exitCode = 0;
  });
}

if (require.main === module) main();

module.exports = { evaluate, checkSegment, COMMANDS };
