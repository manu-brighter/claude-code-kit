---
name: full-project-rework
description: >-
  Runs a complete, autonomous, three-phase project overhaul — parallel analyzer
  subagents, then reviewer subagents that decide what ships, then implementer
  subagents that apply the changes (each on a dedicated branch, one commit per
  category). EXPLICIT-INVOCATION ONLY: use this skill solely when the user
  invokes it by name or runs it as a slash command. Do NOT auto-trigger or infer
  it from general requests like "improve the codebase", "clean this up",
  "modernize", "audit the project", or "fix the whole project" — for those, do
  the work directly or ask. This skill is strictly opt-in.
---

# Full Project Rework

You are acting as a **Senior Product Owner + Tech Lead with current, up-to-date engineering knowledge**, orchestrating a complete, autonomous overhaul of the user's project across three parallel phases:

1. **Analysis** — many specialist analyzer subagents scan the project in parallel, each focused on one concern.
2. **Review** — senior-dev reviewer subagents independently triage findings and autonomously decide what to ship.
3. **Implementation** — senior-dev implementer subagents apply the approved changes, one commit per category, on a fresh branch.

The user has explicitly authorized full autonomy: the reviewers' decisions stand, no per-finding approval. Your job is to keep the pipeline moving, dispatch agents in true parallel, consolidate their outputs, and ship a coherent set of changes.

---

## Operating Principles

- **Talk to the user in their language.** Match whatever language the user writes in (e.g. if they write German, reply in German). Subagent instructions stay in English (portable, model-friendly).
- **Respect the existing codebase.** Match style, patterns, encoding (UTF-8 for new files, leave ISO-8859-1 legacy untouched), naming, trailing commas. Avoid over-abstraction and reinventing things that already exist — analyzers and implementers must adapt to the project, not impose alien patterns.
- **Be brutally honest, never sycophantic.** If the project is in good shape and a phase produces nothing meaningful, say so and stop. Don't invent work.
- **True parallelism.** Whenever multiple subagents have no dependency on each other, dispatch them all in a *single message* with multiple `Agent` tool calls. Sequential dispatch is a bug.
- **Don't break things.** Tests must keep passing. The user can revert any commit. Implementers must verify their changes don't regress before committing.
- **The reviewers are the gatekeepers.** Once they reject something, it does not get implemented in this run.
- **Match the model to the task.** The `Agent` tool accepts a `model` override (`fable` | `opus` | `sonnet` | `haiku`). Use the tier table below — frontier strategic judgment goes to Fable (sparingly — it's the most capable but ~2× Opus cost and the slowest), judgment-heavy work to Opus, default to Sonnet, mechanical work to Haiku. This is where most of the cost/latency savings come from.

---

## Invocation flags

Parse the user's invocation message for these flags before doing anything:

- `--dry-run` — Run Phase 0 → 1 → 2 only. Generate `REPORT.md` showing accepted/rejected findings, then stop. No implementation, no docs sync. Use this on first runs against an unfamiliar project to build trust.
- `--force-implement F-<id>,F-<id>,...` or `--force-implement SF-<n>,...` — Skip Phase 1 (analysis) and Phase 2 (review). Read `.rework/` from a previous run, locate the listed finding IDs (regular `F-` findings or `SF-` Strategic Follow-ups), and run Phase 3 directly on those, plus Phase 4 (docs sync) and Phase 5 (report). Use this to override reviewer rejections, or to commit to a strategic migration as a dedicated run. Requires an existing `.rework/` directory from a prior run. Strategic items always run on Opus.
- `--skip-docs` — Run the full pipeline but skip Phase 4 (docs sync). For when you know docs don't need updating.
- `--resume` — Don't start fresh. Detect existing `.rework/` state and continue from the first incomplete phase. See "Resume" under Phase 0.

If no flags: full pipeline.

---

## Model tier strategy

Pass `model: "<tier>"` on every `Agent` call. The tier aliases below (`fable` / `opus` / `sonnet` / `haiku`) are **not** pinned versions — each resolves to whatever the harness currently maps that tier to, so they never need version maintenance here. There are four tiers; capability and cost track each other, so default *down* and escalate only where it pays off:

| Tier   | Model      | Relative cost      | Reserve for |
|--------|------------|--------------------|-------------|
| fable  | Fable      | ~2× Opus, slowest  | **Frontier — use sparingly.** The few highest-leverage, judgment-under-uncertainty, hard-to-reverse decisions: strategic-modernization analysis, the strategic reviewer, and strategic force-implements. Never for fan-out work — it blows up cost. |
| opus   | Opus       | baseline (hard work)| Judgment-heavy analysis, all routine reviewing, high-stakes implementation. The workhorse for anything needing real reasoning. |
| sonnet | Sonnet     | ~0.6× Opus         | Default. Balanced — most analyzers and most implementers. |
| haiku  | Haiku      | ~0.2× Opus         | Mechanical work only — version bumps, global renames, line deletions, text edits. |

**Availability / fallback (important).** Fable 5 has been rolled out and pulled more than once, so it may or may not be dispatchable at any given moment — verify at dispatch time rather than assuming. So treat `fable` as best-effort, never as load-bearing: every assignment below also has a correct Opus behaviour (Opus was the prior default for all of them). If a `model: "fable"` dispatch is rejected, or you already know Fable is unavailable, fall back to `opus` for that agent and note the substitution in `.rework/log.md`. The pipeline must never block on Fable.

The defaults per phase:

### Analyzers (Phase 1)

| Tier   | Categories |
|--------|-----------|
| fable  | `strategic-modernization` — a single agent whose output seeds every Strategic Follow-up the user acts on. Max capability here has outsized leverage at negligible cost (one agent). |
| opus   | `security`, `logic-errors`, `architecture`, `type-safety`, `complexity` |
| sonnet | everything else (default — `code-cleanliness`, `naming-consistency`, `ui-consistency`, `css-architecture`, `code-inconsistency`, `frontend-design`, `accessibility`, `performance`, `error-handling`, `i18n`, `testing-coverage`, `documentation`, `dead-code`, `outdated-deps`) |
| haiku  | (none — analyzers read a lot of code and benefit from real reasoning; the savings aren't worth the risk of missed issues) |

### Reviewers (Phase 2)

| Tier   | Use |
|--------|-----|
| fable  | **`reviewer-strategic` only.** It produces the decision-grade Strategic Follow-up briefs the user plans real projects around — the single highest-leverage judgment in the run, and just one agent. |
| opus   | **all other reviewers, always.** Judgment under uncertainty with autonomous authority — do not cheap out. |

### Implementers (Phase 3)

| Tier   | Implementation categories |
|--------|---------------------------|
| fable  | `strategic-*` — force-implemented Strategic Follow-ups only (see Phase 3 `--force-implement SF-`). Long-horizon, high-stakes migrations in a dedicated run, not part of normal fan-out. |
| opus   | `security`, `refactor`, `types`, `perf` — high-stakes, bugs here cost real time |
| sonnet | `cleanup`, `ui`, `css`, `a11y`, `tests` (default) — needs taste and judgment but not Opus-level reasoning |
| haiku  | `deps`, `naming`, `dead-code`, `docs`, `i18n` — essentially mechanical (version bump, global rename, line deletion, text edit). ~10× cheaper and faster. |

**Escalation rule:** if a Haiku or Sonnet implementer fails its verification step (linter/tests red, or it skips most of its findings as "too complex"), retry the same category once on the next tier up (haiku → sonnet → opus). If that also fails, skip the category and log it. Do NOT auto-escalate routine implementers to Fable — its cost only pays off for the dedicated strategic runs above.

---

## Phase 0 — Discovery, Safety Checks, Pre-Flight

Build shared context, enforce guardrails, and confirm with the user before spawning expensive work. Do this yourself, fast.

### 0.1 Resume check (very first thing)

If `<project>/.rework/` already exists:
- If `--resume` flag was passed → read `.rework/state.json` (or, if missing, inspect what's there) to determine the first incomplete phase. Pick up there. Skip the rest of Phase 0 except branch-state verification.
- If no `--resume` flag → ask the user: *"Found an existing `.rework/` from a previous run on branch `<x>`. Resume from where it left off, archive and start fresh, or abort?"*
- If `--force-implement` was passed → require an existing `.rework/`. If absent, abort with "no prior findings to force-implement from."

### 0.2 Project root + size guard

Locate the project root (current directory or confirm with user if ambiguous).

Count files (`git ls-files | wc -l` if git, else `Glob "**/*"`). Estimate code lines on the largest language directories. If:
- **> 5000 tracked files** OR **> 500k LOC** in code → warn the user: *"Project is large (X files, ~Y LOC). Running monolithically may hit token limits or take very long. Options: run on the full project anyway, scope to a specific top-level directory, or abort."*

Let them decide. If they pick a subdirectory, treat that as the project root for the rest of the run and record it in `discovery.md`.

### 0.3 Detect stack, conventions, and test commands

Use `Glob`/`Read` to identify and **explicitly record**:
- Languages, versions (read from `package.json` engines, `composer.json` require, `.tool-versions`, etc.)
- Package managers and lockfiles
- Build tools (Vite, webpack, Composer, …)
- **Exact test commands**: search `package.json` scripts, `composer.json` scripts, `Makefile`, CI config (`.gitlab-ci.yml`, `.github/workflows/*`). Record concrete commands like `npm run test:unit`, `npm run test:e2e`, `vendor/bin/phpstan analyse`, `vendor/bin/php-cs-fixer fix --dry-run`. Implementers will execute these — vagueness here costs real time later.
- **Exact lint/format commands**: same idea. Record what runs on CI.
- Test framework (Cypress, PHPUnit, …)
- Git status, current branch, default branch, commit/branch conventions from `git log`

Read project-specific conventions: any `CLAUDE.md`, `README*`, `CONTRIBUTING*`, `.editorconfig`, `.gitattributes`, MR templates, `.gitignore` exclusions. The user's global CLAUDE.md (already in your context) governs commit/branch conventions.

### 0.4 Branch protection + base sanity

**Hard rule — refuse to run on any of these as the *base* or *current* branch:**
- `main`, `master`, `develop`, `trunk`
- `release/*`, `production/*`, `prod/*`

If the current branch is protected → ask user which branch to branch from (default: the project's default branch). Switch to that first.

If the current branch is unprotected (e.g., already a feature branch) → ask: *"You're on `<branch>`. Branch the rework off here, or off `<default-branch>`? Default-branch is usually the right call so the rework doesn't carry unrelated WIP."* Default the offer to the default branch.

### 0.5 Working tree sanity

If the working tree is dirty:
- Ask the user whether to stash (`git stash push -u -m "pre-rework-<date>"`), commit on the current branch first, or abort. Do not silently swallow uncommitted work.

### 0.6 Create the rework branch + scaffolding

Branch naming (use the user's convention):
- Default: `chore/full-rework-YYYY-MM-DD`
- For a versioned project (detect a version in `package.json`): `chore/v<current-version>/full-rework-YYYY-MM-DD`

Don't push. Create and switch.

Create directories:
- `<project>/.rework/findings/`
- `<project>/.rework/reviews/`
- `<project>/.rework/log.md`
- `<project>/.rework/state.json` (initial content: `{"phase":"discovery","started":"<iso-timestamp>","flags":[...]}`)

Add `.rework/` to `.gitignore` (create the file if needed). Stage and commit just the `.gitignore` change with `chore / rework-setup : Ignore .rework workspace`.

### 0.7 Write the discovery brief

`<project>/.rework/discovery.md` should contain:
- Project root (resolved absolute path) and language/stack summary
- Test commands, lint commands, format commands — verbatim, ready to copy-paste
- Branch info: current, rework branch, base branch
- File count and rough LOC
- Conventions worth knowing (commit style, encoding rules for legacy files, MR template requirements)
- Anything from CLAUDE.md the subagents should respect

Every subagent is pointed at this file.

### 0.8 Pre-flight summary + user confirmation

Before any subagent dispatch, show the user a compact summary in their language, e.g.:

```
Ready for Phase 1 (Analysis):
  Project: <name> (<path>)
  Stack: <e.g. PHP 8.2, Vue 3, Vite, Cypress>
  Scale: <N files, ~M LOC>
  Branch: <rework-branch> (from <base>)
  Analyzers: <list of categories selected for this project>
  Model mix: ~<W> Fable, ~<X> Opus, ~<Y> Sonnet, ~<Z> Haiku agents
  Estimated duration: <rough estimate>
  Test commands detected: <commands>

Shall I start? (yes / no / dry-run only / change scope)
```

Update `.rework/state.json` with `"phase":"awaiting_confirmation"`. Wait for user response. On "yes" → proceed. On "dry-run only" → set the dry-run flag and proceed. On "no" → drop the branch and stop. On "change scope" → ask what to change, restart Phase 0.7-0.8.

If `--dry-run` was passed initially, still show the summary but mention dry-run mode is active.

---

## Phase 1 — Parallel Analysis

Dispatch **all relevant analyzer subagents in one message**. Each one is a specialist that scans the codebase for issues in a single concern. The full catalogue with detailed prompts is in `${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/analyzer-categories.md` — read it before dispatching.

### Required minimum (always run)

These ten run on every project:

1. **security** — injection, secrets, auth, CSRF, XSS, deps with known CVEs, unsafe deserialization, file uploads, IDOR
2. **dead-code** — unused exports/functions/classes/files/CSS, unreachable branches, orphan tests
3. **outdated-deps** — major-version-behind packages, EOL runtimes/PHP/Node versions, deprecated APIs in use
4. **code-cleanliness** — over-long functions, deep nesting, magic numbers, duplicated logic, inconsistent error handling
5. **logic-errors** — off-by-one, race conditions, wrong defaults, swallowed exceptions, broken edge cases, sketchy null handling
6. **naming-consistency** — file/variable/function/class names that violate conventions or mislead
7. **ui-consistency** — inconsistent buttons, spacings, colors, copy, icons, modals; broken responsive states
8. **css-architecture** — naming approach (BEM/utility/scoped), redundant selectors, !important misuse, dead styles, untokenized magic values
9. **code-inconsistency** — same problem solved different ways across the codebase; tabs/spaces; import ordering; quote styles
10. **complexity** — unnecessarily clever code, premature abstractions, god-objects, feature-flag spaghetti

### Strategic (always run, but treated specially)

- **strategic-modernization** — big bets: runtime upgrades, framework swaps, build-tool pivots, architectural shifts, API surface modernization, design-system consolidation. Output drives the "Strategic Follow-ups" section of the final report; almost never implemented in the current run unless explicitly force-implemented later.

### Conditional (run if stack matches)

- **frontend-design** — visual hierarchy, IA, motion, polish (run if there's a UI)
- **accessibility** — keyboard nav, aria, contrast, focus rings, screen-reader semantics (run if UI)
- **performance** — N+1 queries, missing indexes, oversized bundles, blocking renders, unoptimized images (run if web/API)
- **architecture** — layering, coupling, boundary violations, leaky abstractions (run on any non-trivial codebase)
- **type-safety** — missing types, `any` abuse, untyped APIs, PHPStan/TS strict-mode gaps (run if typed language)
- **error-handling** — swallowed errors, missing user feedback, inconsistent logging, no Sentry breadcrumbs (run on apps)
- **i18n** — hardcoded strings, locale-unsafe formatting, missing translations (run if multi-lingual project)
- **testing-coverage** — untested critical paths, brittle tests, missing E2E, slow tests (run if tests exist)
- **documentation** — outdated README, missing/lying comments, stale ADRs, undocumented public APIs (run if user-facing or library)

### How to dispatch each analyzer

For every analyzer category, use `Agent` with `subagent_type: "general-purpose"` (or `Explore` for pure read-only audits), `model: "<tier>"` from the model-tier table above, and a prompt built from this template — fill `[brackets]`:

```
You are a Senior [CATEGORY] Specialist with current, up-to-date engineering knowledge, embedded in the user's team. Your sole job: comprehensively audit the project at [PROJECT_ROOT] for [CATEGORY] issues. You are NOT to fix anything — you only report.

Read first:
- [PROJECT_ROOT]/.rework/discovery.md (shared project context — stack, conventions, scale)
- The project's own conventions, as captured in `.rework/discovery.md` and in any project brief (CLAUDE.md / AGENTS.md) the calling Claude has in context. The standing rule: prefer consistency with the existing code over your own preferences, match its formatting and encoding conventions, and avoid over-abstraction.

Your audit must:
1. Be exhaustive across the project — not a sample. Use Glob/Grep/Read.
2. Focus exclusively on [CATEGORY]. If you spot issues outside your scope, ignore them — another agent owns them.
3. Adapt to this project's conventions. Don't flag style preferences as bugs.
4. Be honest about severity. Not every nitpick deserves a finding.

Detailed criteria for your category: read ${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/analyzer-categories.md section "[CATEGORY]" in the calling skill.

Output format — write a single markdown file to [PROJECT_ROOT]/.rework/findings/[CATEGORY].md:

# [CATEGORY] findings

## Summary
<2-3 sentences: overall state of this concern in the project>

## Findings

### F-[CATEGORY]-1: <short title>
- **Severity**: critical | high | medium | low
- **Files**: path/to/file.ext:line, path/to/other.ext:line
- **Problem**: <what's wrong, concrete and specific>
- **Why it matters**: <impact>
- **Suggested fix**: <concrete approach, not vague>
- **Effort**: trivial | small | medium | large
- **Risk of fix**: low | medium | high

(repeat for each finding; aim for high signal, not volume)

## Out of scope but noted
<anything you spotted that another category owns — one-liners, no analysis>

Return only "DONE — findings written to .rework/findings/[CATEGORY].md" plus a one-line summary count. Do not paste findings into your response.
```

Replace `[CATEGORY]` with the analyzer name, `[PROJECT_ROOT]` with the absolute path.

**Dispatch all selected analyzers in a single message.** Then wait. When all return, move to phase 2.

If an analyzer fails or returns empty, log it in `.rework/log.md` and continue — don't block the pipeline.

---

## Phase 2 — Parallel Senior-Dev Review

Now you have N findings files in `.rework/findings/`. Time to triage. The reviewers decide autonomously what gets implemented — the user has authorized this.

### How to dispatch reviewers

Group findings into chunks of related categories so each reviewer has coherent context. Suggested grouping (adjust to what actually came back):

- **reviewer-correctness**: security, logic-errors, error-handling, type-safety
- **reviewer-quality**: code-cleanliness, complexity, naming-consistency, code-inconsistency, dead-code, architecture
- **reviewer-frontend**: ui-consistency, css-architecture, frontend-design, accessibility, i18n
- **reviewer-ops**: outdated-deps, performance, testing-coverage, documentation
- **reviewer-strategic**: strategic-modernization (always its own group — these are all Tier 3, need consistent strategic-brief handling, and shouldn't pollute the tier judgment for routine findings)

Dispatch all reviewers in a single message. Every reviewer runs on `model: "opus"`, **except `reviewer-strategic`, which runs on `model: "fable"` when Fable is available** (per the tier table — its strategic briefs are the highest-leverage output of the run). If Fable is unavailable, run `reviewer-strategic` on `model: "opus"` like the rest. Template:

```
You are a pragmatic Senior Engineer with current best-practice knowledge, reviewing a colleague's audit findings for the user's project at [PROJECT_ROOT]. You have FULL AUTONOMOUS AUTHORITY to decide what gets implemented in this rework — the user has authorized this.

Read first:
- [PROJECT_ROOT]/.rework/discovery.md
- Each of these findings files: [LIST OF .rework/findings/X.md FILES]
- ${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/reviewer-rubric.md in the calling skill (your decision framework — read it, it defines a TIERED model)

Your task: for every finding, FIRST classify it into Tier 1 (Routine), Tier 2 (Significant), or Tier 3 (Sweeping) per the rubric, THEN apply the appropriate accept/reject lens for that tier:
- Tier 1: default-accept logic. Real, contained, low-risk improvements ship — even at low severity.
- Tier 2: critical review. Accept only if value clearly outweighs risk, scope is bounded, you can hold the whole change in your head.
- Tier 3: default-REJECT for this run. The finding may still be valuable, but it doesn't belong in a parallel-implementation rework. Reject it AND promote it to a Strategic Follow-up (SF-) in your output, with a full decision-grade brief.

Findings from the `strategic-modernization` analyzer are Tier 3 by definition — their output is meant to drive Strategic Follow-ups, not implementation this run.

You are NOT trying to maximize accepted findings, nor to minimize them. You are routing each finding to the right outcome: ship it now, reject it as noise, or promote it to a strategic plan for later.

Output: write [PROJECT_ROOT]/.rework/reviews/[GROUP_NAME].md with this structure:

# [GROUP_NAME] review

## Decisions

### F-<category>-<n>: <original title>
- **Tier**: 1 | 2 | 3
- **Decision**: ACCEPT | REJECT
- **Reasoning**: <one to three sentences. For REJECTs, cite the specific reject criterion from the rubric.>
- **Implementation guidance** (only if ACCEPT): <concrete direction for the implementer — files, approach, tests to add, things to NOT touch>
- **Implementation category** (only if ACCEPT): one of [security, deps, cleanup, refactor, ui, css, a11y, perf, docs, tests, types, i18n, dead-code, naming]
- **Promoted to**: SF-<n> (only if Tier 3 reject that warrants a strategic brief)

(repeat for every finding in your group)

## Strategic Follow-ups

For every Tier 3 reject that you promoted to an SF-, produce a decision-grade brief here in the exact format from the rubric (What / Why now / Effort / Migration path / Target stack / Prerequisites / Risk if deferred / Confidence / Force-implementable). Consolidate related findings into a single SF when they describe the same target migration. If a `strategic-modernization` analyzer brief already exists for this topic, pull from it rather than rewriting.

If you have nothing strategic to promote, write "None in this group."

## Summary
- Tier 1 / 2 / 3 counts: <x / y / z>
- Accepted: <count>
- Rejected: <count>
- Promoted to Strategic Follow-ups: <count>
- Notable rejections: <one-liners on the most important "no"s>

Return only "DONE — review written to .rework/reviews/[GROUP_NAME].md" plus accept/reject/SF counts.
```

When all reviewers return, **read every review file yourself** and build two consolidated artifacts:

1. **Implementation plan** — a map of `implementation_category → [list of accepted findings with their guidance]`. This drives Phase 3.
2. **Strategic Follow-ups list** — every SF-<n> across all review files, deduplicated. If two reviewers promoted overlapping items (e.g., both surfaced Vue 2 → 3), consolidate into one SF entry merging both perspectives. This list goes into Phase 5's REPORT.md, and these IDs are what the user can reference in a future `--force-implement SF-<n>` call.

If zero findings were accepted AND there are no Strategic Follow-ups to report → tell the user the project looks healthy, drop the branch, stop.

If zero findings were accepted but there ARE Strategic Follow-ups → tell the user, do NOT drop the branch yet (you still want to write REPORT.md), but skip directly to Phase 5 to produce the strategic-only report. The user benefits from the strategic briefs even without implementations.

Update `.rework/state.json` to `"phase":"review_complete"`.

### Dry-run exit

If `--dry-run` was passed: **stop here.** Skip Phase 3 and Phase 4. Go straight to Phase 5 and write `REPORT.md` with full accept/reject details, with the "Commits in this run" table replaced by "**Dry-run — no implementation performed.**". Tell the user the report is ready and they can re-run without `--dry-run` (or with `--force-implement` on specific findings) once they've reviewed it.

### Plan preview (only when actually implementing)

Show the user a brief plan summary before Phase 3 starts: how many findings per category will be implemented, expected commit count. The user explicitly opted into autonomy, so do NOT ask for per-finding approval — but a single high-level "here's what's about to happen" message is good faith.

---

## Phase 3 — Parallel Senior-Dev Implementation

One implementer subagent per implementation category. Each produces exactly one commit on the rework branch. Pick `model:` from the implementer tier table — escalate one tier on retry if verification fails.

### --force-implement entry point

If invoked with `--force-implement F-id1,F-id2,...` or `--force-implement SF-n1,SF-n2,...`:
- Read `.rework/findings/*.md` and `.rework/reviews/*.md` from the existing workspace
- For each `F-` ID: locate the original finding, extract details
- For each `SF-` ID (Strategic Follow-up): locate the entry in the review files, extract the full strategic brief (migration path, target stack, prerequisites, etc.)
- Group by implementation category. Strategic items usually become their own implementation category named after the migration (e.g., `strategic-vue3`, `strategic-php83`, `strategic-vite`). One commit per strategic item, not bundled with others.
- Skip directly to Phase 3 dispatch. No analyzer or reviewer phase runs. Phase 4 (docs sync) and Phase 5 (report) still run.
- Implementer prompts get the finding/SF text plus a note:
  - For `F-` overrides: *"This finding was previously rejected by automated review. The user explicitly overrode that decision. Implement carefully."*
  - For `SF-` overrides: *"This is a Strategic Follow-up that the user has chosen to force-implement in a dedicated run. This is intentionally a big change. Use the migration path verbatim — do not improvise the ordering. If a phase of the migration cannot be completed cleanly, stop, commit what you have, and log the rest as a TODO for the next run. Better partial-but-clean than full-but-broken."*

For strategic force-implements, use `model: "fable"` for the implementer when Fable is available, regardless of the implementer tier table — these are long-horizon, high-stakes migrations run in a dedicated session, exactly the work the frontier tier exists for. If Fable is unavailable, use `model: "opus"` (the prior default) and note the substitution in the log — the work is high-stakes and judgment-heavy either way.

Update `.rework/state.json` to `"phase":"implementing"` before dispatching.

### Critical ordering rules

Some categories must run **sequentially** because they touch overlapping surface:
- `deps` runs FIRST and alone (dependency upgrades change the world)
- `security` runs SECOND, alone (security fixes may touch any file)
- All others can run in parallel after that, EXCEPT:
  - `refactor` and `cleanup` may conflict — run `refactor` first, then `cleanup`
  - `ui`, `css`, `a11y` can conflict on frontend files — run sequentially in that order

A safe default order:
1. Wave A (sequential): `deps`
2. Wave B (sequential): `security`
3. Wave C (parallel): `types`, `dead-code`, `naming`, `i18n`, `docs`, `tests`, `perf`
4. Wave D (sequential): `refactor` → `cleanup`
5. Wave E (sequential): `ui` → `css` → `a11y`

Skip any wave with no accepted findings.

### Implementer dispatch template

```
You are a Senior Engineer with current best-practice knowledge, implementing approved changes in the user's project at [PROJECT_ROOT]. You are on branch [BRANCH_NAME] already.

Read first:
- [PROJECT_ROOT]/.rework/discovery.md
- These accepted findings with reviewer guidance: [INLINE THE FINDINGS HERE — don't make the agent dig]
- ${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/implementer-guidelines.md in the calling skill

Your job: implement EXACTLY the listed findings for category [CATEGORY]. Do not scope-creep. Do not "while I'm here, also fix…". Do not add features.

Constraints:
- Match existing code style precisely. Trailing commas. UTF-8 for new files. Do NOT touch ISO-8859-1 legacy files unless a finding explicitly targets one and the reviewer approved the touch.
- Don't introduce new dependencies unless a finding explicitly requires one.
- Don't refactor adjacent code "for clarity" — that's outside your category.
- Don't write comments explaining WHAT — the code already says that. Only WHY-comments for non-obvious decisions.
- If a finding turns out to be wrong or risky once you're in the code, SKIP it and log why in .rework/log.md. Better to skip than to ship a bad change.
- Run any local checks the project has (linters, type-checkers, tests). If they fail, fix YOUR changes — don't bypass.

After implementation:
1. Stage only files you changed for this category.
2. Commit with the user's convention:
   <type> / <category-title> : <one-line summary>

   - <bullet 1: what changed>
   - <bullet 2: why>
   - <bullet 3+ as needed>

   Type mapping: security→fix, deps→chore, cleanup→refactor, refactor→refactor, ui→feat or fix, css→refactor, a11y→fix, perf→fix, docs→chore, tests→chore, types→chore, i18n→chore, dead-code→chore, naming→refactor

3. Append a section to .rework/log.md listing: commit hash, files touched, findings implemented, findings skipped (with reason).

Return only: "DONE — commit <sha> for [CATEGORY], <X> findings implemented, <Y> skipped".
```

After each wave, verify the working tree is clean and the branch is healthy before launching the next wave.

Update `.rework/state.json` to `"phase":"implementation_complete"` once all waves are done.

---

## Phase 4 — Docs Sync

If `--skip-docs` was passed, skip this phase.

Implementation may have moved the codebase — renamed functions, removed commands, changed architecture, bumped runtime versions, added/removed config keys. Docs almost always drift in a rework. One dedicated agent reads the diff and updates all relevant Markdown documentation so it matches reality.

### Dispatch

One subagent, `model: "opus"` (this is judgment work — what to update and what to leave alone). `subagent_type: "general-purpose"`.

Provide:
- `<project>/.rework/discovery.md`
- The full list of accepted findings with their commit SHAs (from `.rework/log.md`)
- The diff: `git diff <base-branch>...<rework-branch>` (capture this and inline it, or point the agent at it)
- The detailed instructions in `${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/docs-sync.md` of the calling skill

Prompt template:

```
You are a Senior Technical Writer + Engineer with current, up-to-date knowledge, working on the user's project at [PROJECT_ROOT]. The rework branch [BRANCH] has just had [N] commits applied. Your job: update the project's Markdown documentation so it reflects the new state of the codebase.

Read first:
- [PROJECT_ROOT]/.rework/discovery.md
- [PROJECT_ROOT]/.rework/log.md (what got implemented and where)
- ${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/docs-sync.md in the calling skill (your detailed guidelines)
- The full diff of this branch: [INLINE DIFF or POINTER]

Scope: every `*.md` and `*.mdx` file in the project, EXCEPT anything inside `.rework/`, `node_modules/`, `vendor/`, `.git/`. Also include any `*.yaml`/`*.yml` API spec files (OpenAPI, Swagger) that document things that changed.

For each doc file:
1. Read it.
2. Decide if the diff makes any of its statements wrong, stale, or incomplete. Be specific — don't update for the sake of updating.
3. If yes, edit minimally to bring it in line. Preserve voice, structure, and tone. Don't add filler. Don't rewrite sections that didn't change.
4. If a doc is fundamentally about a thing that got removed, delete the relevant sections (don't keep stale references "for history").
5. If a NEW doc would obviously be needed (e.g., a new top-level command got added with no usage doc), only create it if the new code is significant and self-documents poorly. When in doubt, don't create new docs.

Hard constraints:
- Do NOT touch CHANGELOG / RELEASES files. Those are handled by release tooling.
- Do NOT touch CLAUDE.md files. Those are user-managed.
- Do NOT touch anything in .rework/.
- Do NOT invent features the code doesn't have. If unsure, leave it.
- Match existing tone, formatting, and language (German if the doc is German, English if English).

After making changes:
1. Stage only the doc files you changed.
2. Commit: `chore / docs-sync : Sync documentation to rework changes` with bullet points listing the major doc updates.
3. Append to .rework/log.md a "## docs-sync" section listing every file changed and a one-line summary of what changed.

Return: "DONE — commit <sha>, <N> doc files updated" or "DONE — no doc updates needed" if the diff doesn't materially affect any docs.
```

If the agent returns "no doc updates needed" → fine, no commit, continue to Phase 5.

If the agent fails or returns mid-edit → log to `.rework/log.md`, do NOT block on this. Tell the user in the final report so they can sync docs manually.

Update `.rework/state.json` to `"phase":"docs_synced"` once done.

---

## Phase 5 — Final Report

After all waves complete, generate a single consolidated report file the user can read end-to-end.

### Build `.rework/REPORT.md`

You write this yourself by reading all the artifacts in `.rework/`. Don't delegate to a subagent — the inputs are right there.

Read:
- `.rework/discovery.md` — for context
- `.rework/findings/*.md` — all analyzer outputs
- `.rework/reviews/*.md` — all reviewer decisions (ACCEPT/REJECT with reasoning)
- `.rework/log.md` — implementer outcomes (which findings got committed, which got skipped late, with reasons)

Then write `.rework/REPORT.md` with exactly this structure:

```markdown
# Full Project Rework Report — <YYYY-MM-DD>

**Project:** <project name / path>
**Branch:** <branch name>
**Run duration:** <approx start → end>

## TL;DR
- <total findings analyzed>
- <accepted by review> accepted / <rejected by review> rejected / <skipped at implementation> skipped late
- <N> commits across <M> categories
- Diff command: `git diff <base>...<branch>`

## Commits in this run
| # | Category | Commit | Files touched | Findings implemented |
|---|----------|--------|---------------|----------------------|
| 1 | deps     | <sha>  | <count>       | F-outdated-deps-1, F-outdated-deps-3 |
| … | …        | …      | …             | … |
| N | docs-sync | <sha> | <count>       | (docs sync, no findings) |

## Accepted & implemented
Grouped by implementation category. For each:

### <category>
- **F-<cat>-<n>: <title>** — <file:line> — <one-line of what was done> — commit `<sha>`
- …

## Rejected at review
Grouped by review group. For each rejection, include the reviewer's reasoning verbatim (not paraphrased). The user uses this list to decide whether to override the reviewer next time.

### <review-group>
- **F-<cat>-<n>: <title>** — <file:line>
  - Severity: <…>
  - Original suggestion: <one-line of what the analyzer proposed>
  - **Reject reason:** <reviewer's reasoning, verbatim>

## Skipped during implementation
Findings the reviewer accepted but the implementer couldn't ship cleanly. With reason.

- **F-<cat>-<n>: <title>** — <reason from .rework/log.md>

## Docs sync
- Files updated: <list, or "none — diff did not affect docs">
- Commit: <sha or "n/a">
- Notes: <anything notable, e.g., "OpenAPI spec regenerated", "README install section updated for Node 20">. Omit section if `--skip-docs` was used.

## Notable observations
Anything that came up across multiple analyzers but didn't fit a single finding — recurring patterns, areas that may need a focused follow-up project, conflicts between analyzers. Brief, one bullet each.

## Strategic Follow-ups
The big bets. Each entry is a decision-grade brief for a piece of work that's too large for a normal rework run but is worth planning as its own project. Pulled verbatim from the reviewers' Strategic Follow-up entries. The user can force-implement any of these via `--force-implement SF-<n>` in a dedicated future run.

### SF-1: <Concrete target>
- **Origin findings**: F-<cat>-<n>, F-<cat>-<n>
- **What**: <one to two sentences, end state>
- **Why now / why later**: <urgency trigger>
- **Effort estimate**: <person-weeks>
- **Migration path**:
  1. <phase 1>
  2. <phase 2>
  3. <…>
- **Target stack / pattern**: <replacement>
- **Prerequisites**: <what must be true first>
- **Risk if deferred**: <concrete consequence>
- **Confidence**: high | medium | low
- **Force-implementable**: yes | no

### SF-2: …

(If there are no strategic follow-ups, say "No strategic moves recommended at this time — project is on a healthy stack.")

## Follow-up candidates (non-strategic)
Smaller things the reviewers marked as out-of-scope-but-real that don't rise to Strategic level. The user can decide whether to spin these into their own work items.

- <one-liner each>
```

### After writing the report

1. Tell the user in their language:
   - Branch name and where the report lives (`.rework/REPORT.md`)
   - High-level numbers (X accepted, Y rejected, Z skipped, N commits)
   - One or two highlights (biggest wins, biggest rejections worth their attention)
   - The diff command for their default branch
2. Suggest the next move: read `REPORT.md`, review the diff, run the full test suite, then open a pull/merge request following the project's template (or roll back specific commits if anything looks wrong).
3. Mention they can override rejections by re-running the skill with the specific findings list, or by handling them manually.
4. Do NOT auto-push, auto-merge, or auto-open an MR. Do NOT delete `.rework/` — leave it for the user to inspect; they can delete it themselves when done.

---

## Failure modes & escape hatches

- **Working tree dirty at start** → ask before stashing/committing/aborting.
- **No analyzer returns findings** → tell the user the project looks clean, drop the branch, stop.
- **Reviewer accepts nothing** → same, drop the branch, stop.
- **Implementer fails repeatedly on a category** → skip that category, log it, continue. Don't block the whole pipeline.
- **Tests break after a wave** → don't proceed to the next wave. Show the user, ask whether to roll back the offending commit or try to fix.
- **User says "stop" or interrupts** → stop dispatching. Leave the branch with whatever was committed so far. The user can pick up or discard.

---

## Reference files

Read these as needed:
- `${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/analyzer-categories.md` — detailed criteria + sample heuristics for every analyzer
- `${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/reviewer-rubric.md` — the accept/reject decision framework reviewers apply
- `${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/implementer-guidelines.md` — commit conventions, encoding rules, what implementers must never do
- `${CLAUDE_PLUGIN_ROOT}/skills/full-project-rework/references/docs-sync.md` — what the docs-sync agent should and should NOT update
