---
name: ship-changes
description: >-
  Use when a code change is finished and the user wants to wrap it up / ship it,
  OR just wants the current changes reviewed and the fixes applied. Trigger on phrases like
  "commit and push and open an MR", "ship this", "ship it", "finish this branch", "wrap this up",
  "open a PR/MR and get it reviewed", "review my changes and apply the fixes", "let a subagent
  review this", "fertigmachen", "abschliessen", "commit + push + MR". The skill always starts by
  asking which of two modes to run: FULL (commit → push → open MR/PR if none exists → subagent
  review → apply agreed findings → commit → push → drive the pipeline to green) or LIGHT
  (subagent review → apply agreed findings locally, no git writes at all). Auto-detects GitLab
  (glab) vs GitHub (gh). Use this even when the user does not say the word "skill": any request to
  finalize, ship, or review-and-fix completed work should route here. NOT for reviewing someone
  else's MR/PR (review-ghostwriter).
---

# Ship Changes

End-to-end "get this work reviewed and out the door" workflow. Two modes, chosen up front.

**Announce at start:** "I'm using the ship-changes skill." Then immediately run Step 0.

The reason this skill exists: shipping a change is always the same sequence of small, error-prone
steps (commit with the right message, push the *right* branch, open an MR with the right context,
get a real review, act on it, babysit the pipeline). Doing them by hand invites mistakes:
pushing to a protected branch, an MR with no context, an unfixed red pipeline left behind. This
skill makes the sequence deterministic and safe.

---

## Step 0: Choose the mode (always ask first)

Use `AskUserQuestion` with exactly these two options. Choosing **Full** *is* the explicit
authorization to commit, push, and create an MR/PR in this run; do not ask for that permission
again. Choosing **Light** means: touch nothing in git or on the remote.

- **Full**: commit → push → open MR/PR if none exists → subagent review → apply agreed findings →
  commit → push → watch the pipeline and fix until green.
- **Light**: subagent review of the current changes → apply agreed findings **locally only**.
  No `git commit`, no `git push`, no MR/PR. (The user commits/ships themselves.)

Then follow the matching section below. The **review + apply-findings** part is identical in both
modes; only the git/remote wrapping differs.

---

## Hard safety rules (never break, in either mode)

These are central to what this skill does, so they are restated here rather than left to global
config:

- **Never push to a protected branch** (`develop`, `master`, `main`, or whatever the project
  protects). If the current branch is protected, you must create a feature branch first (see Full
  mode, Preflight). Feature branches are always pushed under their **own name**:
  `git push -u origin <feature-branch>`, never a refspec targeting a protected branch.
- **First push always names the branch explicitly** (`git push -u origin <feature-branch>`). A
  branch created from `origin/develop` *tracks* `origin/develop`; a bare `git push` would then aim
  at the protected branch and be rejected. Naming the branch on the first push sets tracking
  correctly.
- **Never `--force` / `--force-with-lease`** onto a protected branch. Ever.
- **No AI / Claude attribution anywhere**: not in commit messages, MR/PR titles or descriptions,
  comments, or anywhere else. No "Generated with", no "Co-Authored-By: Claude", no hints that AI
  was involved.
- **Commit messages and branch names follow the project's conventions.** See
  [Conventions](#conventions) for how to find them and the default to fall back on.

---

## Conventions

Before writing a commit message or proposing a branch name, find out how *this* project does it,
in this order:

1. Instructions the user or project already gave: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`,
   a commitlint / commitizen config, a PR/MR template.
2. Recent history: `git log --oneline -20` and `git branch -r` show the de-facto style for commit
   subjects and branch names. Match it.
3. Only if neither gives a clear answer, use this default:

**Commit message (default)**
```
<type> / <title> : Short description

- Bullet 1: what changed
- Bullet 2: why / what it achieves
```
Types: `feat`, `fix`, `chore`, `refactor`, `hotfix`, `tryout` (for experiments). Draft the type,
title, and bullets from the actual diff. English unless the project writes commits in another
language.

**Branch name (default)**: `<type>/<name>`, lowercase, words joined with hyphens, short and
descriptive (e.g. `feat/user-export`). Some projects add a version segment, e.g.
`<type>/v<version>/<name>`; if the history shows that pattern, follow it and ask for the version.

---

## Light mode

1. **Determine the review base.** Find the branch this work diverged from
   (`git merge-base HEAD origin/develop` / `origin/master` / `origin/main`, try in that order, or
   ask which base is correct). The review covers everything from that merge-base to the current
   **working tree**: committed, staged, unstaged and new untracked files.
2. **Review via subagent.** See [Running the review](#running-the-review). Hand the reviewer the
   full working delta: `git diff $(git merge-base HEAD origin/<base>)` (committed + staged +
   unstaged changes against the merge-base, so upstream commits don't show up as noise) plus the
   list from `git ls-files --others --exclude-standard` (new files that are not tracked yet; the
   reviewer reads them directly). Don't use `git add -N` for this, it writes to the index. Give
   it a one-line description of what the change does.
3. **Present findings and get approval** (see [Applying findings](#applying-findings-both-modes)).
4. **Apply the agreed findings locally.** Stop there. Report what changed and remind the user the
   changes are uncommitted; if they want to ship, they can re-run this skill in Full mode.

---

## Full mode

### Preflight

1. **Detect the platform.** See `references/git-platform.md`: GitLab → `glab`, GitHub → `gh`.
2. **Check the current branch.** If it is protected (`develop` / `master` / `main` or similar),
   you cannot commit-and-push here. Create a feature branch first: propose a name following the
   project's [conventions](#conventions) (ask for the parts you cannot infer, or let the user hand
   you the full branch name), then `git checkout -b <feature-branch>`. Only then continue.
3. **Determine the target/base branch** (usually `develop` or `main`; confirm if ambiguous).

### Commit

4. Check `git status`, then stage the change **by explicit path**, never `git add -A` / `git add .`
   (stray scratch files or a non-ignored `.env` must not end up in the MR/PR). If untracked or
   unrelated modified files make the scope ambiguous, list them and ask which belong to this
   change. That question is about scope, not a push confirmation. Commit with a message that
   follows the project's [conventions](#conventions); show the message and the staged file list,
   then commit. **No AI attribution.** If the working tree is already clean (the work is committed
   but not pushed), skip the commit and go straight to Push.

### Push

5. Push the feature branch by name: `git push -u origin <feature-branch>`. Do **not** ask for
   confirmation before pushing in Full mode; the mode choice already authorized it. The
   protected-branch rules above still apply absolutely.

### Open the MR/PR (only if none exists yet)

6. Check whether an MR/PR already exists for this branch (`references/git-platform.md`). If one
   exists, reuse it: skip creation, go to Review.
7. If none exists, draft the MR/PR description using `references/git-platform.md` (repo template
   first, otherwise the generic template there: what and why, linked issue, dependent MRs/PRs,
   changelog or release entry if the project's process has one, how to test, test data needed to
   reproduce). You **cannot** know the issue link, the release entry, or the test data on your
   own: ask the user for those specifics, presenting a filled-in draft they can edit. This input
   step is both necessary (you need the data) and the natural review of what goes public. Then
   create the MR/PR. **No AI attribution in title or body.**

### Review + apply

8. **Review via subagent** over the MR's range: `git diff origin/<target>...HEAD` (fetch first, so
   `origin/<target>` is current; three dots = from the merge-base). See
   [Running the review](#running-the-review).
9. **Present findings, get approval, apply**: see [Applying findings](#applying-findings-both-modes).
10. **Commit and push the adjustments** (same conventions, same push safety). If nothing needed
    fixing, say so and continue.

### Pipeline to green

11. If the project has CI, watch the pipeline for this branch/MR and drive it to green; see
    [Pipeline loop](#pipeline-loop-full-mode). When green (or if there is no pipeline), report done
    with the MR/PR link.

---

## Running the review

If the **`superpowers:requesting-code-review`** skill is installed, invoke it to dispatch the
reviewer subagent. Otherwise do it directly:

- Dispatch one reviewer subagent with a self-contained brief: what the change is supposed to do
  (one or two sentences), the exact range to review (Full: `git diff origin/<target>...HEAD`;
  Light: `git diff $(git merge-base HEAD origin/<base>)` plus the untracked file list), the
  project's conventions file if there is one, and the instruction to verify every finding against
  the actual code before reporting it.
- Ask for this output: **Strengths**, then **Issues** grouped as Critical / Important / Minor, each
  with `file:line`, the problem, and a suggested fix, then a one-line **Assessment** (ready to
  merge or not).
- The reviewer only reads; it must not edit files, commit, or push.

---

## Applying findings (both modes)

The reviewer returns Strengths + Issues (Critical / Important / Minor) + an Assessment.

1. **Summarize concisely** for the user, grouped by severity, one line each with the file:line.
2. **Ask which to apply.** Recommend a sensible default (typically all Critical + Important;
   Minor optional). This is the user's call about what ships, and this approval gate is always
   present, in both modes.
3. **Apply with rigor.** If **`superpowers:receiving-code-review`** is installed, follow it.
   Either way: verify each finding against the codebase before implementing, push back with
   technical reasoning if a finding is wrong for this code (don't apply it just because the
   reviewer said so), and fix one item at a time. No performative agreement.

---

## Pipeline loop (Full mode)

In Full mode, **fix and push autonomously until green; don't ask before pushing.**

1. Get the pipeline status for the branch/MR (`references/git-platform.md`). Poll at a sensible
   interval until it finishes; don't busy-wait.
2. **Green** → done. Report the MR/PR link and pipeline result.
3. **Red** → fetch the failing job(s) and their logs, diagnose the root cause, apply a fix, commit
   (conventions), push, and re-watch. Repeat.
4. **Cap: ~3 fix attempts.** This is a runaway backstop, not a "confirm before push" gate. If it's
   still red after ~3 rounds, stop and hand back to the user with the failing logs and your
   diagnosis. The failure is likely something you can't resolve blindly (flaky infra, missing
   secret, a decision to make). Don't loop forever.
5. Common early wins before deep diagnosis: if the project uses a formatter or static analyzer
   (e.g. `php-cs-fixer`, `phpstan`, `eslint`, `prettier`, `ruff`), a red "lint/style" job is
   usually fixed by running that tool locally and committing the result.

---

## Related skills

- `superpowers:requesting-code-review` / `superpowers:receiving-code-review` (optional): a more
  thorough review engine this skill delegates to when installed.
- `superpowers:finishing-a-development-branch` (optional): a more general merge/PR/discard menu;
  this skill is the opinionated MR-review-pipeline flow instead.

## Red flags: stop and reconsider

- About to `git push` and the target resolves to a protected branch → **stop**, you're on the
  wrong branch or pushing the wrong refspec.
- About to write "Generated with" / "Co-Authored-By: Claude" / any AI hint → **delete it.**
- Reviewer flagged something you can't verify → say so and push back; don't apply blindly.
- Pipeline still red after the cap → hand back with evidence; don't keep pushing attempts.
