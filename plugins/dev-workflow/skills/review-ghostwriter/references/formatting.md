# Formatting in GitLab and GitHub comments

Principle: most comments need nothing but text, `inline code` and now and then a suggestion block. Everything below is a tool for exceptions. At most one or two extras per review, otherwise it feels overloaded.

Checked against GitLab 19.1 EE and GitHub.com (October 2026), using the docs and the source code.

## Pitfalls (always)

- **`$` variables, paths, hex values, code always in backticks.** Two `$` in running text render as a math formula on both platforms (`$e … $id` turns into formula gibberish).
- **No line starting with `/word`** outside code or quote blocks. GitLab runs it as a quick action when posting (`/approve`, `/label`, `/draft` …).
- **No `@mentions`** unless the user explicitly wants to pull the person in. They trigger notifications, even when added later by an edit.
- **`#123` / `!123`** become issue/MR references. If that's not intended: `\#123`.
- **No relative file links** (`[x](src/Foo.php#L13)`): in GitLab comments they point to the default branch, not the MR. Always absolute permalinks with the full SHA (see below).
- **Fence length in the review file**: the wrapper around each comment needs more backticks than any block inside the comment. Default 4, as soon as the comment itself contains a 4-backtick block, 5.

## Suggestions

**GitLab**
- ```` ```suggestion:-N+M ```` replaces the lines from anchor−N to anchor+M with its content.
- **Ranges are the default**: the link text shows the range (`#L46-48`), the user drags it, and GitLab then anchors on the **last** line. So the offset is relative to the last line: `-<n-1>+0` for n lines (3 lines -> `suggestion:-2+0`).
- Single line: ```` ```suggestion:-0+0 ```` (or just ```` ```suggestion ````).
- **Uncertain replacement text**: prefer a suggestion that only says what is still true, plus the condition in the text ("if … is gone with that"), over no suggestion at all.
- **An empty block deletes** the lines, handy for dead code.
- Several suggestion blocks per comment work (each gets its own apply button), all relative to the same anchor line, ranges must not overlap. Only if they really belong together.
- Max 100 lines up and down.
- Does **not** work on deleted (red) lines. Use ```` ```diff ```` then. Context lines work.

**GitHub**
- ```` ```suggestion ```` replaces the **whole selected range**. Unchanged lines in the range must be repeated exactly (including indentation). The link text shows the range, the user selects it when commenting.
- **One** suggestion block per comment, several are applied unreliably.
- Not on deleted lines. An empty block deletes (common in practice, not officially documented).

**Legacy encodings** (any non-UTF-8 file, e.g. ISO-8859-1): suggestions only if the replaced and new lines are pure ASCII. Otherwise applying would very likely write UTF-8 into the file. Use a `diff` block plus a short encoding hint instead.

## Before/after without a suggestion: `diff` block

When a suggestion is impossible or doesn't fit: the fix touches deleted lines, another file, several scattered places, or it's about the principle. Red/green on both platforms:

````markdown
```diff
- throw new ServerErrorHttpException('Could not be saved.');
+ throw new ServerErrorHttpException('Could not be saved.', 0, $e);
```
````

## Colored text (very rarely)

- **GitLab**: inline diff is the only real colored-text feature: `{+ new +}` (green background) and `{- old -}` (red background), alternatively `[+ +]` / `[- -]`, don't mix bracket types. Doesn't work together with inline code. Good for a word-level "X becomes Y" in running text, e.g. `status code {- 200 -} -> {+ 204 +}`. At most once per review.
- **GitHub**: no colored text. `style`/`<font>` get stripped. Use a `diff` block or **bold** instead.
- **Don't use**: KaTeX color (`$\color{red}{…}$`, renders in a math font, raw text in emails), `<span style>`, `<font>`. Color chips (`` `#F00` ``) only color a dot, only relevant when the comment is about CSS colors.

## Alerts (max 1 per review, Fatal only)

Colored box with an icon. Only for what really must not be missed (security, data loss), e.g. "the token must be rotated".

GitLab:
```markdown
> [!warning]
> The token must be rotated, just removing it is not enough.
```
GitHub: the same, but `> [!WARNING]` (uppercase). Types: note, tip, important, warning, caution.

## Collapsible: `<details>`

For derivations, logs, stack traces or a longer alternative, so the comment itself stays short. Blank lines around the content are required, otherwise the markdown inside doesn't render:

```markdown
<details><summary>Derivation</summary>

…markdown…

</details>
```

## Links to code

- **In the same MR**: diff anchors from `scripts/diff_anchor.py`.
- **Commenting on code outside the diff**: as a file comment (button in the file header of the diff), the spot as a permalink in the text. Commenting on expanded, unchanged lines also works on GitLab, but only use it if a range there is clearly better (rare).
- **Code outside the diff**, permalink with the full 40-character SHA (no branch link, those drift):
  - GitLab: `https://<host>/<project>/-/blob/<sha>/<path>#L10-20`
  - GitHub: `https://github.com/<o>/<r>/blob/<sha>/<path>#L10-L20` (range with a second `L`)
  - SHA: for code in the MR's project use `head_sha`. For another project the HEAD of its default branch: `glab api "projects/<enc>/repository/branches/<branch>"` -> `commit.id`, or `gh api repos/<o>/<r>/commits/<branch> -q .sha`.
- Link text per `style.md`: `[File.php#L10-20](…)`, another project `[project/File.php#L10-20](…)`.
- **MRs and issues**: GitLab references work directly. `!245+` shows the MR title, `#45+` the issue title, another project `group/project!245`. GitHub: `#123`, `owner/repo#123`.

## Other

- **Task list** `- [ ] …`: rarely, only if one comment has several checkable points for the author.
- **Table**: rarely, when comparing options.
- **Don't use**: Mermaid, footnotes, `<sub>`/`<sup>`, `<kbd>` (except for keyboard shortcuts), image sizes (no image comes along when copying anyway), TOC.
