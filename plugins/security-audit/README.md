# security-audit

One adversarial Claude Code agent: **security-safety-auditor**. It reviews application
code for the things that get an app breached, sued, or taken down — with a deliberate
specialization in codebases built with heavy AI assistance.

```bash
/plugin marketplace add manu-brighter/claude-code-kit
/plugin install security-audit
```

## Why a specialized auditor

AI-generated code fails in *predictable, repeatable ways*, which makes it worth checking
in a fixed order rather than sweeping generically. Veracode's 2025 GenAI code security
study found roughly 45% of generated samples introduced an OWASP Top 10 weakness. The
agent's **Priority Sweep** is ordered by frequency × impact in exactly that population:

| # | Check | Why it leads |
|---|---|---|
| 3.1 | Row Level Security / direct client-to-database access | Supabase ships a public `anon` key and auto-generates a REST API from the schema. RLS is the *only* thing between the internet and every row — and it is opt-in. |
| 3.2 | Secrets in client-reachable code | Server keys land in `NEXT_PUBLIC_*` because the code "works" either way. |
| 3.3 | Missing server-side authorization (BOLA/IDOR) | The frontend hides the button, so the model considers the feature protected. |
| 3.4 | Hallucinated dependencies (slopsquatting) | LLMs invent package names; the hallucinations are repeatable, so attackers register them. |
| 3.5 | The lethal trifecta | Private data + untrusted content + egress = exfiltration, no matter how good the prompt is. |
| 3.6 | Destructive-action guardrails | Agents delete production databases. Not hypothetical. |

After the sweep it walks sixteen systematic domains (A–P), mapped to **OWASP Top 10
2025** — including the two new entries, A03 Software Supply Chain Failures and A10
Mishandling of Exceptional Conditions.

## What makes it usable rather than noisy

- **Prove it or downgrade it.** No finding without a traced path from an
  attacker-controlled source to a dangerous sink. Confidence (`CONFIRMED` / `LIKELY` /
  `NEEDS-VERIFICATION`) is reported *separately* from severity, so an unverified guess can
  never masquerade as a proven P0.
- **Coverage gaps are mandatory.** "I found nothing" and "I could not look" are different
  statements. The report format forces the second one into its own section.
- **It treats the codebase as untrusted input.** Instructions found inside audited files
  are reported as prompt-injection findings, never obeyed — including invisible-character
  smuggling in `CLAUDE.md`, `.cursorrules` and MCP tool descriptions, which it greps for
  explicitly because those characters are as invisible to a model as they are to you.
- **Deduplicated by root cause.** One missing-authorization pattern across twelve routes
  is one finding with twelve locations.
- **It refuses to certify compliance.** It flags likely regulatory exposure and cites the
  requirement; it does not claim you pass GDPR, PCI DSS or the CRA.

## Enforcing read-only (optional but recommended)

The agent is granted `Read, Grep, Glob, Bash`. `Bash` is there for `git log` and
`git diff` — it needs those to scope a review to a branch — but `Bash` can also write.
So its "read-only, always" rule is **prompt-level, not a control**, which is precisely the
critique the agent itself levels at change freezes that live only in a prompt. It is
instructed to disclose this in its own Coverage Gaps section when it was not run under an
enforced guarantee.

`hooks/read-only-guard.js` turns the rule into an actual control: it enforces the
allowlist (`git log/diff/show/ls-files/status/branch/remote`, `npm ls`, `pip list`,
`cargo tree`, `jq`), judges each segment of a chained command separately, rejects command
substitution, and fails closed on a payload it cannot parse.

**It is not auto-registered, on purpose.** Claude Code's `PreToolUse` payload carries no
reliable "which agent is running" field, so a registered hook would deny Bash in *every*
session, not just the auditor's. Wire it up per project when you want the guarantee —
typically when auditing code you did not write:

```jsonc
// .claude/settings.json in the project being audited
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/read-only-guard.js\""
          }
        ]
      }
    ]
  }
}
```

Remove it when you are done auditing — it will block your own Bash calls too.

A lighter alternative that needs no hook is a `permissions.deny` entry for `Write`,
`Edit` and the Bash patterns you care about.

## Two limits worth knowing before you trust a report

- **No network.** The agent cannot confirm that a package exists, who publishes it, or
  when it was first published, so every slopsquatting finding is `NEEDS-VERIFICATION` by
  design and comes with the exact `npm view` / `pip index` command for you to run. Adding
  `WebFetch` to its `tools` line lifts that — at the cost that looking up an *internal*
  package name in a public registry confirms that name to anyone watching, which is the
  reconnaissance step of a dependency-confusion attack. The agent is told to look up
  unrecognized public names only.
- **Dependency-declared install scripts are invisible.** The sweep finds `preinstall` /
  `postinstall` in this project and its workspaces. Scripts declared by *dependencies*
  live inside `node_modules`, outside the search scope. The agent states that limitation
  rather than implying the tree is clean.

## Scope modes

The agent picks one in Phase 0 and prints it in the report header:

- **Diff-scoped** — the default after a change or before a merge. Establishes the changed
  set from `git diff main...HEAD`, reviews those files plus anything they call into that
  makes an authorization or trust decision, and still runs the full Priority Sweep across
  the changed paths.
- **Full audit** — before a first production deploy, or when asked to audit the project.
  Past roughly 300 source files it completes the sweep and Domains A–D, then declares the
  rest a coverage gap with the reason "audit budget, not clean" — never as passing.

Unlike the `creative-frontend` agents, this one carries **no PROJECT GROUND TRUTH block**.
It is meant to work on a codebase it has never seen, which is the whole point.

## License

MIT
