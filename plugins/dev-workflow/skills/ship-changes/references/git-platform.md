# Git platform reference (GitLab / GitHub)

Command cheatsheet for the ship-changes skill. Flags vary between CLI versions: if a command
fails, check `glab <cmd> --help` / `gh <cmd> --help` and adapt. Prefer JSON output + parsing over
scraping human-readable text where a `--output json` / `--json` option exists.

## Detect the platform

```bash
REMOTE_URL=$(git remote get-url origin)
```

- Contains `github.com` (or a known GitHub Enterprise host) → **GitHub**, use `gh`.
- Contains `gitlab` or matches a host that `glab auth status` is logged into → **GitLab**, use `glab`.
- Otherwise → ask the user which platform / CLI to use.

If the matching CLI is not authenticated (`glab auth status` / `gh auth status`), stop and tell
the user the login command to run themselves; don't try to fix auth on your own.

---

## GitLab (`glab`)

**Does an MR already exist for this branch?**
```bash
glab mr list --source-branch "$(git branch --show-current)"
# or inspect the branch's MR directly:
glab mr view "$(git branch --show-current)"
```
If one is listed, reuse it (grab its IID / URL); do not create another.

**Create an MR** (after the branch is pushed). Write the body to a file to preserve formatting:
```bash
glab mr create \
  --source-branch "$(git branch --show-current)" \
  --target-branch "<target>" \
  --title "<title>" \
  --description "$(cat /path/to/mr-body.md)" \
  --remove-source-branch
```
- Do **not** use `--fill` if you have a real description; `--fill` just uses the commit message.
- Add `--draft` if the change isn't ready for review attention yet (ask if unsure).
- Never auto-assign reviewers unless the user asks.

**Pipeline status for the branch/MR:**
```bash
glab ci status --branch "$(git branch --show-current)"   # current pipeline status
glab ci list --branch "$(git branch --show-current)"     # recent pipelines
```

**Failing job logs:**
```bash
glab ci view --branch "$(git branch --show-current)"     # jobs + statuses
glab ci trace <job-id-or-name>                            # full log of a job
```

Poll `glab ci status` until the pipeline reaches a terminal state (`success` / `failed` /
`canceled`). Some `glab` versions can watch live; if it returns immediately, poll on an interval.

---

## GitHub (`gh`)

**Does a PR already exist for this branch?**
```bash
gh pr view --json number,url,state 2>/dev/null || echo "no PR"
gh pr list --head "$(git branch --show-current)" --json number,url,state
```
If one exists, reuse it.

**Create a PR** (after the branch is pushed):
```bash
gh pr create \
  --base "<target>" \
  --head "$(git branch --show-current)" \
  --title "<title>" \
  --body-file /path/to/pr-body.md
```
Add `--draft` if not ready for review.

**Check status:**
```bash
gh pr checks                    # status of all checks for the current PR
gh run list --branch "$(git branch --show-current)" --limit 5
gh run view <run-id> --log-failed   # only the failing step logs
gh run watch <run-id>               # block until the run completes
```

---

## MR / PR description template

If the repository ships a template, use it and fill it in: GitLab
`.gitlab/merge_request_templates/`, GitHub `.github/pull_request_template.md` (or
`.github/PULL_REQUEST_TEMPLATE/`). Otherwise use this, dropping sections that don't apply.
**No AI attribution anywhere.**

```markdown
## What & why
<1–3 sentences: what this changes and the reason.>

## Related
- Issue: <link, or "–">
- Depends on: <other MR/PR links, or "–">
- Changelog / release entry: <link or text, if the project's process has one, or "–">

## How to test
- Steps: <how to reach and verify the change, if needed>
- Test data: <accounts, records or IDs needed to reproduce, or "–">

## Notes
<migrations, follow-ups, anything a reviewer should know. Omit if empty.>
```

You cannot know the issue link, the release entry, the test steps, or the test data on your own:
ask the user for these and present a filled-in draft they can edit before the MR/PR is created.
