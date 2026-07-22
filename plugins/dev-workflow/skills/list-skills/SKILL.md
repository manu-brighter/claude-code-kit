---
name: list-skills
description: >-
  Shows a compact overview of all available skills with a one-line description
  each — grouped into Custom (your own), Plugins/Add-ons, and built-in Claude
  Code skills. Meant as an at-a-glance overview so you don't lose track when you
  have many skills installed. Use this skill whenever the user wants to know
  which skills they have — even if they only say "which skills do I have", "skill
  overview", "list skills", "list custom skills", "show me my skills", "what
  skills are installed", "which custom skills exist", "short skill list",
  "overview of skills" or similar. Also triggers on questions about plugin skills
  or "which plugins/add-ons ship skills". Replaces the long, verbose scrolling
  through the system skill list with a terse table.
---

# Skill overview

A setup can have a lot of skills — your own, ones from plugins, and the built-in ones from Claude Code. The system list is long and verbose. This skill distills it down to **one compact table per group**, each row: skill name + a short description. Goal: everything at a glance, short and terse.

**Announce at start:** "I'm using the list-skills skill."

## Modes (argument)

The skill has four modes, controlled by the argument on invocation:

| Argument | Shows |
|----------|-------|
| *(none)* / `all` | Everything: Custom + Plugins + Built-in |
| `custom` | Only your own skills |
| `plugins` / `plugin` | Only plugin/add-on skills |
| `builtin` | Only built-in Claude Code skills |

On an unclear argument: show everything.

## Where the data comes from

The **most reliable source** is the skill list that's already in context anyway — the block that starts with *"The following skills are available for use with the Skill tool:"* (i.e. the available skills from the system prompt). It's always current and contains exactly the **active** skills. Use this list primarily — don't search the filesystem.

Why not just search for every `SKILL.md` on disk: under `~/.claude/plugins/` there's, alongside the installed plugins (`plugins/cache/`), the complete **catalogue** of all available plugins (`plugins/marketplaces/`) with dozens of SKILL.md files that are mostly **not active**. A naive glob would therefore list masses of inactive skills. The context list doesn't have that noise.

## Categorization

Classify each entry from the context list:

1. **Plugin skill** — name contains a colon (`plugin:skill`, e.g. `superpowers:brainstorming`). The part before the `:` is the plugin. Group by plugin.
2. **Custom or Built-in** — name without a prefix. To tell the two apart, list your own skill folders once:

   ```bash
   ls -1 "$HOME/.claude/skills" 2>/dev/null   # your own (global)
   ls -1 .claude/skills 2>/dev/null           # your own (project-local, if inside a project)
   ```

   The folder names are your **Custom skills**. A skill without a prefix that appears in this list → **Custom**. Not in it → **Built-in** (Claude Code native, e.g. `verify`, `run`, `code-review`, `loop`, `init`, `review`, `security-review`, `simplify`).

3. **Watch for name collisions.** A base name can appear in *two* groups at once — e.g. `code-review` as a plugin (`code-review:code-review`) **and** as a built-in skill. That's not a duplicate to merge: list both in their respective group and, at the end, note via `> Note:` that the prefix is required on invocation (`code-review:code-review`) to address them unambiguously.

## Merge duplicates

You may have auto-generated copies in the list — typically `ship-changes-skill-3b112c8f`, `ship-changes-skill-a4351f5b`, … (pattern: `<base>-skill-<hex-hash>`, or several entries with **identical** descriptions).

- Do **not** list these individually. Merge them into their base skill and append the count, e.g. `ship-changes (+8 auto-generated copies)`.
- A `<base>-skill-<hash>` copy belongs to the base skill `<base>` — so it lands in that skill's group (usually Custom).

## Condense descriptions

Boil each description down to **~4–8 words** (in the user's language). Just the core: *what the skill does*. Drop trigger phrases ("use this skill when…"), examples, lists of triggers, and repetition. It's about scannability, not completeness — the full description is visible in the skill itself.

## Output format

One small Markdown table per group, with a heading `### Group (count)` and columns `Skill | Description`. Order in `all` mode:

1. **Custom** first (what interests the user most)
2. **Plugins**, alphabetically by plugin name (one table per plugin)
3. **Built-in** last

At the very top, a line with the total count, e.g. `**42 skills active** — 5 custom, 30 from plugins, 7 built-in`.

At the end, **only if** duplicates/leftovers were spotted, a short `> Note:` — e.g. that there are N auto-generated `ship-changes` copies that could be cleaned up. No note if everything's clean.

### Example

```
**42 skills active** — 5 custom, 30 from plugins, 7 built-in

### Custom (5)
| Skill               | Description                          |
|---------------------|--------------------------------------|
| rms-entry           | Release note from diff/MR/issue      |
| ship-changes        | Commit, push, MR + review            |
| generalize          | Anonymize skill/project              |
| project-refresh     | Sync docs/deployment/i18n with code  |
| full-project-rework | Full code-quality overhaul           |

### superpowers (14)
| Skill                   | Description                     |
|-------------------------|---------------------------------|
| brainstorming           | Clarify intent before creative work |
| systematic-debugging    | Structured debugging            |
| test-driven-development | TDD: test first, then code      |

### Built-in (Claude Code) (7)
| Skill    | Description                      |
|----------|----------------------------------|
| verify   | Verify a change end-to-end       |
| run      | Launch app & check a change      |

> Note: 8 auto-generated `ship-changes` copies found — clean up if desired.
```

## Fallback (no context block available)

If the skill list is missing from context (e.g. when started as a subagent), read from the filesystem:

- Custom: `~/.claude/skills/*/SKILL.md` and (if inside a project) `.claude/skills/*/SKILL.md`
- Plugins: **only** `~/.claude/plugins/cache/**/skills/*/SKILL.md` — **not** `plugins/marketplaces/` (that's just the catalogue, see above)
- Built-in skills can't be determined this way (they don't exist as files) — in that case drop that group and mention it briefly.

Name + description are in the YAML frontmatter of each `SKILL.md`.
