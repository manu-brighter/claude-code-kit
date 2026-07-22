# dev-workflow

Five general-purpose Claude Code skills. Project-agnostic — they adapt to whatever
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
