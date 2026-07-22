---
name: generalize
description: >-
  Use when the user wants to turn a personal skill, agent, or project into a clean, publishable
  version for others — stripping everything that ties it to *them* (real name, employer, private
  project names, internal tools/systems, local paths, emails, customer/ticket IDs) while KEEPING
  the functional preferences that make it good (e.g. "use trailing commas", commit conventions,
  code style). Produces a generalized COPY and a change report; never touches the original. Trigger
  on: "generalize this skill/agent/project", "make this shareable/publishable", "clean it up before
  I push it to GitHub", "remove my personal info", "anonymize this", "prep this for open-sourcing",
  and the German equivalents "generalisieren", "anonymisieren", "für andere veröffentlichen", "auf
  GitHub publishen", "veröffentlichungsreif machen", "persönliche Infos rausnehmen". Use this
  whenever someone is about to share something they built for private use, even if they don't say
  the word "generalize".
---

# Generalize for publishing

Turn something built for one person's private use into something a stranger can install and use
cleanly. The author baked their own world into it — their name, their employer, their repo names,
their machine paths, their internal ticketing system. A reader who installs it should see none of
that, yet the thing should still *work* and still be as opinionated and useful as the original.

**Announce at start:** "I'm using the generalize skill." Then run Step 0.

The reason this skill exists: stripping personal context by hand is easy to get wrong in two
opposite ways — leaving in a stray email or repo name (leaks private info, embarrasses the author),
or over-scrubbing until you delete the very preferences and workflow that gave the skill its value
(now it's a generic, useless husk). The whole craft here is a precise three-way sort, done
consistently across every surface, on a copy, with a report so the author can verify nothing
important was lost.

---

## Step 0 — Identify the input and set the language

1. **Determine what you were handed** and its type — it changes which surfaces you scan:
   - a **skill** (a folder with `SKILL.md`, maybe `references/`, `scripts/`, `assets/`),
   - an **agent** (a single `.md` with frontmatter + system prompt),
   - a **project** (a repo/directory of code, docs, config).
   If it's ambiguous or you were pointed at a parent folder, confirm the target before proceeding.

2. **Detect the language** of the human-readable prose (the SKILL.md body, agent prompt, README,
   comments — not code identifiers). **If it is not English, ask once** whether to also translate
   to English while generalizing:

   > "Der Input ist auf Deutsch. Beim Generalisieren fürs Publishen ist Englisch meist die bessere
   > Wahl für ein breites Publikum — soll ich mit übersetzen, oder die Originalsprache behalten?"

   Translating is usually right for a public audience, but it's the author's call — respect the
   answer. **If the input is already English, skip this question** entirely. When translating,
   translate prose only: leave code, command names, API field names, config keys, and identifiers
   untouched, and keep the skill/agent `name` slug as-is.

3. **Learn who the author is.** The sharpest signal for "what counts as personal" is the author's
   own context. Read their global instructions and memory — `~/.claude/CLAUDE.md`, any project
   `CLAUDE.md` / `AGENTS.md`, and the memory index if present — to build a concrete strip-list of
   *their* specific identifiers: real name, employer/org, product and project names, internal tools
   and systems, git host, usernames, email, home directory. You'll hunt for these exact strings on
   top of the generic heuristics below.

---

## The core move: a three-way sort

Every personal-looking thing falls into one of three buckets. Getting this sort right *is* the
skill. Don't think "delete vs keep" — think in three:

| Bucket | What it is | What to do |
|---|---|---|
| **REMOVE** | Identity & private world. Nothing generic is lost by deleting it. | Delete it. |
| **GENERICIZE** | Something useful whose *specifics* are personal. The idea travels; the instance doesn't. | Rewrite to a generic form or a named placeholder. |
| **KEEP** | Functional preferences and the actual logic — the reason the thing is worth publishing. | Leave it. |

### REMOVE — identity and private world

Delete outright. A reader gains nothing from these and the author probably doesn't want them public:

- Real name, usernames, handles, email addresses, signatures, author bios ("I'm X, I've worked at
  Y for 5 years").
- Employer / organization name, team names, internal-only product names.
- Private or internal project and repository names.
- Internal infrastructure and tooling that only exists inside one company: ticketing systems,
  release-management systems, internal wikis, internal git host URLs, servers, hostnames, VPNs,
  orchestration setups.
- Local environment specifics: absolute local paths (`C:\Users\<name>\…`, `/home/<name>/…`),
  machine names, personal domains, server IPs.
- Secrets and private identifiers: API keys, tokens, customer IDs, candidate/record IDs, internal
  ticket numbers, test-account credentials.

### GENERICIZE — keep the value, drop the specifics

This is the subtle bucket and where most of the judgment lives. The thing is genuinely useful, but
it names the author's specific world. Transform it, don't delete it:

- **Attributed preference → plain rule.** `Alex prefers trailing commas` → `Use trailing commas.`
  The preference stays (it's part of the skill); the attribution goes.
- **Hardwired personal target → generic instruction.** `push to develop on the ACME GitLab` →
  `push to your remote's integration branch`. Keep the workflow, drop the specific host/repo.
- **Company-specific list → generic concept + neutral examples.** A bespoke commit-type taxonomy or
  branch-naming scheme tied to one team → keep the *pattern*, replace the org-specific parts with
  standard or placeholder examples.
- **Personal path in an example → placeholder.** `C:\dev\acme-core\src` → `path/to/your/project`.
- **Real value a consumer must supply → named placeholder.** A hardcoded API base URL, org slug, or
  project ID in a script or config → `<API_BASE_URL>`, `<your-org>`, `<project-id>`, and note it in
  the report so the consumer knows to fill it in.

Two different placeholder styles, by context:
- **In prose / instructions to Claude** (SKILL.md body, agent prompt): rewrite to natural generic
  phrasing ("your remote", "your project root"). Don't litter instructions with `<angle>` tokens —
  they read as unfinished.
- **In code / config that needs a real value**: use a clearly-named placeholder (`<YOUR_TOKEN>`,
  `path/to/project`) so it's obvious the consumer must set it. Flag every one in the report.

### KEEP — the spine

Leave these alone. They're *why* someone would install this:

- Coding-style preferences that shape output: trailing commas, quote/indent style, an
  encoding rule (e.g. "new files always UTF-8"), naming conventions.
- The actual instructions, steps, structure, logic, and examples that do the work.
- Universal engineering practices, even if the author wrote them as personal rules — e.g. "never
  push to protected branches `main`/`master`/`develop`", "no AI attribution in commits". These are
  good defaults for anyone.
- General-purpose tool usage (git, `gh`, `glab`, common CLIs) — as tools. Only genericize the
  *instance-specific config* around them (which host, which repo).
- Tone and language conventions that are part of the skill's design.

> **Don't over-strip.** The failure mode that hurts most is scrubbing so hard the skill loses its
> opinions. A generalized skill should still be confident and specific about *how* it works — it
> just shouldn't be about one particular person. When unsure whether something is a KEEP preference
> or a personal artifact, lean toward keeping it and flag it in the report rather than silently
> deleting.

---

## Surfaces to scan

Be exhaustive within the input — a single missed email defeats the purpose. Cover:

- **Skill**: `SKILL.md` frontmatter (`name`, `description`) and body; every file under `references/`,
  `scripts/` (including code comments and hardcoded paths/values), and `assets/`.
- **Agent**: the frontmatter `description` and the full system-prompt body.
- **Project**: `README`, `CLAUDE.md` / `AGENTS.md`, everything under `docs/`, code **comments**,
  config files (`.env` / `.env.example`, `docker-compose*.yml`, CI configs, editor configs),
  package metadata (`author`, `homepage`, repo URLs in `package.json` / `composer.json` / etc.),
  and any example/fixture data.
- **Everywhere**, run these generic heuristics on top of the author's strip-list: email addresses,
  absolute home/user paths, URLs pointing at internal/personal hosts, and long digit-strings that
  look like IDs in example context.

---

## Workflow

1. **Scan** every relevant surface and build an inventory of findings, each tagged REMOVE /
   GENERICIZE / KEEP-but-noteworthy per the sort above. Note file + location for each.

2. **Confirm the output location.** Default: a sibling copy named `<original>-generalized/`. Propose
   it and confirm — for a large project, say so and let the author redirect (e.g. to a fresh clone
   they intend to publish). **Never modify the original.** Copy the whole tree first, then transform
   only within the copy.

3. **Apply the transforms** to the copy: delete the REMOVE items, rewrite the GENERICIZE items,
   translate prose if that was agreed. Keep diffs minimal and surgical — don't reformat or
   restructure beyond the targeted changes, so the author can eyeball what actually changed.

4. **Write the report** (see below), then give the author a short chat summary: what type it was,
   whether it was translated, the output path, and the count of removed / genericized / flagged
   items. Point them at the report and at anything under "Needs your review."

---

## The report

Write `GENERALIZATION-REPORT.md` as a **sibling of the output folder** (not inside it — it's a
working artifact, not something to publish). Structure:

```markdown
# Generalization report — <name>

- Type: skill | agent | project
- Language: <detected> → <kept | translated to English>
- Output: <path to the generalized copy>

## Removed (N)
- `file:loc` — what it was (e.g. author email) → deleted

## Genericized (N)
- `file:loc` — `before` → `after`

## Kept preferences (so you can confirm nothing valuable was lost)
- trailing-commas rule, commit convention pattern, …

## ⚠️ Needs your review (N)
- `file:loc` — why it's a judgment call, and what you decided by default
```

The **"Needs your review"** section is the most important part: list every genuine borderline call
— things that could be a personal artifact *or* a legitimate preference (a bespoke commit format, a
domain-specific example, a LICENSE naming the author as copyright holder), the default you chose,
and why. This is where the author's judgment beats yours; make it easy for them to override.

---

## Guardrails / red flags

- **Don't translate or rename code.** Identifiers, command names, config keys, and API fields must
  keep working. Translation is for prose only.
- **Don't break references.** If you rename or remove something, fix every internal link/path that
  pointed at it. A generalized skill that no longer loads its own `references/` file is broken.
- **LICENSE / copyright:** don't silently strip an author's name from a LICENSE or copyright line —
  authorship attribution is often *intended* to survive open-sourcing. Flag it under "Needs your
  review" and let the author decide.
- **Don't add attribution of your own** — no "generated by", no AI/tool signatures, anywhere.
- **When a personal thing is load-bearing** (the skill literally only makes sense for one internal
  system), don't fake a generalization. Say so plainly in the report and ask the author how to
  handle it — sometimes the honest answer is "this part isn't publishable as-is."
