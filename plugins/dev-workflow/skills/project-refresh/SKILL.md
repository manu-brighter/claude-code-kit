---
name: project-refresh
description: >-
  Audits the project's documentation-adjacent artifacts — README, project brief,
  CHANGELOG, further docs (docs/, wiki exports), deployment info (compose files,
  reverse-proxy and orchestration config docs), and i18n/translation files —
  against the actual current state of the codebase, and fixes whatever has
  drifted out of date. Also translates new/changed UI strings directly into every
  existing locale file. EXPLICIT-INVOCATION ONLY: use this skill solely when the
  user invokes it by name or runs it as a slash command. Do NOT auto-trigger or
  infer it from generic requests like "update the docs", "sync the README", "add
  translations", or "bring the project up to date" — for those, do the work
  directly or ask which parts they mean. This skill is strictly opt-in, and
  distinct from `full-project-rework` (which is a heavy code-quality overhaul
  with its own docs-sync step) — this one is documentation, deployment-info and
  i18n only: lightweight, no branch, no multi-phase pipeline.
---

# Project Refresh

You run this after a chunk of real development work — a feature, a batch of fixes, a few sessions' worth of changes — to bring everything *around* the code back in sync: docs, deployment notes, translations. The core idea is **drift detection, not diff detection**: don't rely on `git diff` to figure out what to update. Instead, read each doc's claims and check whether they're still true of the codebase *right now*. Docs rot gradually across many sessions; a diff against one point in time misses that. (The one exception is CHANGELOG — see below, that's inherently diff-shaped.)

This is a personal workflow skill, not a project skill — it runs the same way regardless of which repo you're in (a frontend app, an API project, an infra repo, whatever), adapting to what it actually finds there.

## Operating principles

- **Ground truth is the current codebase.** For every concrete claim in a doc (a command, a file path, a described behavior, a config key), check whether it's still accurate. Fix what's wrong. Add brief coverage for significant undocumented additions. Don't touch what's still correct.
- **Respect each file's existing language, tone, and structure.** Never translate a German CLAUDE.md to English or vice versa. Preserve voice and formatting; don't rewrite sections that aren't stale.
- **Encoding rules apply as usual:** UTF-8 for anything you write or rewrite; never touch legacy ISO-8859-1 files unless a category explicitly needs it and it's unavoidable.
- **Edit directly, no gate.** This skill uses direct edits over a plan-then-approve flow — the user reviews via `git status`/`git diff` afterward. Don't ask for per-file permission. Do NOT commit or push anything yourself, under any circumstance — that's the user's call, on their own convention.
- **Skip what doesn't apply.** If a project has no `docs/` folder, no deployment config, or no locale files, drop that category silently. Don't build documentation infrastructure that didn't exist before — you're correcting what's there, not authoring a docs site from scratch.
- **When a whole new doc file feels warranted** (a significant, completely undocumented new area), ask the user first instead of creating it speculatively — that's a bigger judgment call than fixing an existing file.
- **Be honest if there's nothing to do.** If a category is already accurate, say so and move on. Don't manufacture busywork edits to look thorough.

## Step 1 — Quick discovery

Identify the project root, then skim (don't deep-read yet) to figure out what's actually present:

- **Core docs**: `README*`, `CLAUDE.md`/`AGENTS.md`, `CHANGELOG*`
- **Further docs**: `docs/`, wiki export folders, any other `*.md`/`*.mdx` outside the above
- **Deployment info**: `docker-compose*.yml` and their inline comments, Traefik label blocks, K8s/Rancher manifests, any deployment-specific README/doc
- **i18n**: locale/translation files — vue-i18n JSON/YAML, PHP language arrays, gettext `.po`, whatever convention the project uses. Identify the reference locale (the one developers actually type into templates/code first — usually the primary dev language) and every target locale that already has a file.

Also note the project's stack/conventions in passing (package manager, existing doc language, commit style) — you don't need a full discovery brief like a heavier rework skill, just enough to brief the subagents in step 2.

Check `git status` so you know what's already dirty before you start — this matters later when the user reviews the diff, so mention it if the tree wasn't clean going in.

Tell the user briefly what you found before starting (no need to wait for a go-ahead unless something looks off — e.g. an unexpectedly huge scope), for example:

```
Found for <project>:
- Core docs: README.md (DE), CLAUDE.md (DE), no CHANGELOG
- Further docs: docs/deployment.md
- Deployment: docker-compose.yml, Traefik labels
- i18n: src/locales/{de,en,fr,it}.json (reference: de)

Going straight in now; you review afterward via git diff.
```

If a category turns out to be empty, just leave it off this list.

## Step 2 — Update each in-scope category

If more than one category applies, dispatch one `Agent` (`subagent_type: "general-purpose"`, no model override — inherit whatever the session is already using) per category, all in a single message so they run in true parallel. They're only genuinely independent as long as no file belongs to two categories — so **assign each concrete file to exactly one subagent before dispatching**, otherwise two agents edit the same file in parallel and one clobbers the other. The common trap: a deployment-related doc that lives under `docs/` (e.g. `docs/deployment.md`) is claimed by both "Further docs" and "Deployment info" — give it to the Deployment subagent and tell the Further-docs one to leave it alone. If only one category applies, just do it yourself inline; spinning up a subagent for a single small category is overhead without benefit.

Every subagent prompt must inline these non-negotiables explicitly (don't assume it inherits them):
- Ground-truth-vs-doc audit approach (not diff-based, except where noted for CHANGELOG)
- Preserve each file's existing language/tone/structure
- UTF-8 new/rewritten content; never touch ISO-8859-1 legacy files
- Only touch first-party, hand-maintained files. Never edit anything generated or vendored (`node_modules/`, `vendor/`, `dist/`, `build/`, `coverage/`, `.git/`, `.rework/`, lock files, generated API/doc output) or files that are about process rather than project state (`LICENSE`/`LICENCE`, MR/PR templates). A Markdown file under any of those is out of scope — skip it, don't "fix" it.
- Never commit, never push, never stage — edit the working tree only
- Make no edits if nothing in this category is stale — but always report back either way (see the return format below)

Each subagent must end its run with a compact result the orchestrator can fold straight into the Step 3 summary without re-reading the tree: the files it touched (one line each on what changed), plus anything it's uncertain about (a translation to double-check, a doc it thinks should exist but didn't create). If it changed nothing, one line saying so.

### Core docs (README, CLAUDE.md, CHANGELOG)

For each present file, verify its concrete claims against reality:
- Do the commands it tells you to run still exist (check `package.json`/`composer.json` scripts, Makefiles)?
- Do the file/folder/module paths it references still exist?
- Are described features, architecture, or setup steps still accurate?
- Is there anything genuinely significant that shipped recently and isn't mentioned anywhere?

Fix what's wrong; add brief mentions of significant gaps. Don't pad a README with exhaustive detail it never had.

**CHANGELOG is the one diff-shaped exception**: since it's fundamentally "what changed lately," it's fine (expected, even) to look at recent `git log` / the diff since the last entry or tag to write the new entry. Match whatever format the file already uses — don't impose Keep-a-Changelog conventions on a project that's never used them.

### Further docs (docs/, wiki, Confluence exports)

Same drift audit as core docs, file by file — but only hand-written project docs. Skip generated/vendored Markdown entirely (per the exclusions above), and leave deployment-specific docs to the Deployment category so two subagents don't touch the same file. If a whole new area is significant and completely undocumented, flag it for the user to decide on rather than creating a new doc file unasked.

### Deployment info

Read deployment-related docs/comments and compare against the actual current `docker-compose.yml` / Traefik labels / K8s manifests: do documented ports, services, labels, and env vars still match reality? Is there a new service/container with no documentation at all? Fix drift, add brief coverage for new pieces — keep the level of detail proportional to what was already there.

### Translations / i18n

1. Confirm the reference locale and every existing target locale file (never invent a new language file that didn't already exist).
2. Diff key sets per target locale against the reference locale: which keys are missing entirely. Where you can tell a source string clearly changed but a translation wasn't touched, treat it as stale too — but if you're not sure whether an existing translation is actually stale, leave it alone rather than rewriting something that reads fine.
3. Translate every missing/stale key directly into each target locale file. Match the tone already established there (e.g. formal "Sie"-Form in business-software German) and the existing key naming/nesting conventions. Insert each new key at the position its counterpart occupies in the reference locale, not just appended at the end — that keeps the diff clean and lets the user eyeball exactly what changed.
4. If a term is domain-specific, ambiguous, or you're genuinely unsure of the right translation, still add your best attempt — don't leave a key untranslated — but flag it explicitly in the final summary so the user can double-check it.

## Step 3 — Summary

No report file in the repo — this is a quick workflow, not a heavy rework with a paper trail. Once everything's done, tell the user directly in chat:

- Files touched, grouped by category, one line each on what changed
- Anything you flagged as uncertain (translations to double-check, a new doc you think is warranted but didn't create)
- A reminder that nothing was committed — review via `git status`/`git diff`, then commit/push yourself in your own convention

## Failure modes

- **Category present but nothing stale** → say so briefly, don't force an edit.
- **Unsure whether a whole new doc file is warranted** → ask, don't create speculatively.
- **Locale files don't match any recognizable i18n convention** → skip the i18n category and tell the user rather than guessing at a structure.
- **A doc's claim is ambiguous or you can't verify it against the code** → leave it, note it in the summary, don't guess.
