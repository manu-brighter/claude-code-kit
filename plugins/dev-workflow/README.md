# dev-workflow

Seven general-purpose Claude Code skills. Project-agnostic — they adapt to whatever
codebase they are run in rather than imposing a stack.

```bash
/plugin marketplace add manu-brighter/claude-code-kit
/plugin install dev-workflow
```

## Skills

### [full-project-rework](skills/full-project-rework)

A complete, autonomous, three-phase overhaul. Parallel analyzer subagents scan 20
categories (security, dead code, outdated deps, logic errors, naming, UI consistency,
CSS architecture, accessibility, performance, type safety and more). Reviewer subagents
triage every finding into Accept / Reject / Strategic Follow-up against a tiered rubric.
Implementer subagents apply the approved changes, one commit per category, on a
dedicated branch. Produces a report listing every accepted finding with its commit SHA,
every rejected one with the reasoning, and decision-grade briefs for anything too
sweeping to parallelize.

Routes agents to different model tiers automatically — frontier reasoning where it pays
off, cheap mechanical work where it does not.

**Explicit invocation only.** It will not trigger on "clean up my code".

### [project-refresh](skills/project-refresh)

Audits the documentation-adjacent surface — README, project brief, CHANGELOG, `docs/`,
deployment configuration, i18n catalogs — against the actual current state of the code,
and fixes what has drifted. Also translates new or changed UI strings into every
existing locale file.

Lightweight: no branch, no multi-phase pipeline. Distinct from `full-project-rework`,
which is a code-quality overhaul that happens to include a docs step.

**Explicit invocation only.**

### [ship-changes](skills/ship-changes)

The "get this work reviewed and out the door" workflow, with two modes chosen up front.
**Full** commits, pushes, opens the MR/PR if none exists, runs a subagent review, applies
the findings you approve, pushes again and drives the pipeline to green (with a cap of
about three fix attempts before it hands back). **Light** only reviews the current
changes and applies the approved fixes locally, without any git writes.

Commit messages and branch names follow the project's own conventions (CLAUDE.md,
CONTRIBUTING, commitlint, recent history) and only fall back to a documented default.
Hard safety rules: never push to a protected branch, name the branch explicitly on the
first push, no AI attribution anywhere. Auto-detects GitLab (`glab`) or GitHub (`gh`).
Uses the superpowers review skills when installed and has its own fallback when not.

### [review-ghostwriter](skills/review-ghostwriter)

Reviews a colleague's MR/PR and writes copy-ready comments **in your own voice** into a
temp Markdown file. It never posts anything; you decide what goes up. A reviewer subagent
does the review, then the main agent verifies every finding against the code and debates
disagreements with the reviewer (at most three rounds) until both agree, so false
positives don't reach your colleagues.

The file is deliberately minimal: findings grouped as Fatal / Major / Minor plus an
optional "Aside" for code that is especially good or funny. Each finding has a short
title, a jump link to the exact diff line (computed by a bundled script that matches
GitLab's and GitHub's anchor formats) and the comment itself, with suggestion blocks
whose line offsets fit how you will place them. Handles re-reviews, collapsed files and
platform pitfalls such as quick actions or `$` turning into math.

Ships with a sensible default voice. For the real effect, calibrate it once: the skill
explains how to pull your own past review comments with `glab` or `gh` and derive your
voice from them.

### [generalize](skills/generalize)

Turns something built for your private use into something a stranger can install
cleanly. The craft is a precise three-way sort: **remove** identity and private world,
**genericize** the useful things whose specifics are personal, and **keep** the
functional preferences that made it worth publishing in the first place.

Over-scrubbing is the failure mode it guards hardest against — a generalized skill
should still be confident and opinionated, just not about one particular person. Works
on a copy, never the original, and writes a change report whose most important section
is the borderline calls it wants you to overrule.

### [list-skills](skills/list-skills)

One compact table per group — your own skills, plugin-provided ones, built-in ones —
each row a name and a one-line description. Four modes via argument: everything, custom
only, plugins only, built-in only.

### [erklaerbaer](skills/erklaerbaer)

Breaks any context — a concept, code, an error message, jargon — down for someone with
zero background knowledge. Analogy first, compact, ASCII diagrams where they genuinely
help, kaomoji instead of emojis. Detects whether you want to understand it yourself or
need something forwardable, and **answers in the language you wrote in** (German and
English both trigger it).

Does not fire on normal developer-level questions — it needs an explicit
"explain this simply" signal.

## License

MIT
