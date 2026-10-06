# Review focus and severity

## Severity

| Level | When | Merge |
|:--|:--|:--|
| **Fatal** | Security hole (secret/token in code, logs or query string, injection, auth/permission bypass, internal data leaking out), data loss or corruption, crash/500 on every normal call of the main path, breaking change to an API with existing consumers | must not go in like this |
| **Major** | Real bug with a concrete failure scenario, spec/code/test contradict each other, test tests nothing or hides a bug, 500 or wrong status code in an error or edge case, regression against the target branch, implementation deviates from the issue/MR goal | blocks the approval |
| **Minor** | Consistency with the codebase, naming, typos, outdated docblocks, missing types, unused code, scope creep, test gaps without a concrete bug, small simplifications, pre-existing issues | optional |
| **Aside** | Not a finding: especially well solved, unusual or funny. At most 2–3, and only if something really stands out | – |

When in doubt, rate lower. A wrong finding costs the user more credibility than a missed nit, so prefer fewer, solid findings.

## What to look for

A default checklist derived from real reviews, roughly by frequency. Adapt it to your stack and habits when you calibrate (see `style.md`).

1. **Correctness with a concrete scenario**: casts that swallow null/missing values (e.g. PHP `(int)` making `??` useless), inverted conditions, recursion without a base case, wrong scales (0–1 vs. 0–100), PATCH overwriting fields that were not sent, index access without `ORDER BY`, off-by-one, null paths.
2. **Contract spec ↔ code ↔ test**: status codes (201 Created vs. 204 No Content, 400 vs. 422, declared codes the code never returns), paths (missing version segment, `{id}` vs. `%s`), `nullable`, `required`, schema refs, tags, descriptions that are no longer true, copied and outdated spec versions.
3. **Tests**: always green (subset comparison against an empty array, assertion on the wrong object), fixture does not cover the case (e.g. no soft-deleted record), duplicate validation, test name does not match its content, error case untested.
4. **Error handling**: the caught exception not passed on as the previous/cause (the error tracker loses the root cause), catching a base exception type that misses runtime errors (e.g. PHP `catch (Exception)` does not catch `TypeError`), swallowed exceptions, internal URLs/details in error messages that leave the system, silent fallbacks to demo/default configuration in production.
5. **Consistency with the codebase**: the same problem is already solved elsewhere -> link to the existing pattern. Naming (e.g. camelCase fields), the same typing as neighboring models, the same exception classes. Don't demand anything the repo uses nowhere else (e.g. `strict_types` when no file has it).
6. **Scope**: changes that don't belong to the MR (formatting, an unrelated feature) -> Minor, "doesn't really belong in this MR".
7. **Pre-existing**: only mention it if the MR touches the spot or it is directly relevant. Always Minor, clearly marked ("already like this on develop").
8. **Small stuff**: typos (code, changelog, messages), docblock contradicting the signature, copied docblocks, search & replace accidents, missing commit hash in the changelog, unused variables/imports, deprecated code, hardcoded texts instead of translations, dev-only dependencies used in production code, a new production dependency for a single constant.
9. **Compatibility**: the project's language/runtime version (e.g. enums under PHP 7.4), framework generation (e.g. Vue 2 Options API vs. Composition API), project standards (linters, formatters, trailing commas).
10. **Security**: secrets, tokens in query strings/logs/error tracking, SQL built by string concatenation (especially in legacy code), `v-html`/`innerHTML` with user input, missing validation at system boundaries.

## Not a finding

- Generated files (lockfiles, generated API clients, snapshots, minified files, DB dumps): only check for plausibility.
- Pure linter stuff the pipeline catches anyway.
- Matters of taste without a link to a convention of the codebase.
- Points already raised in the MR discussion (by anyone, including bots like GitLab Duo), unless there is a new aspect or the thread is resolved but not addressed.
- Legacy encodings: if the repo has non-UTF-8 files (e.g. ISO-8859-1), umlauts that look broken in the API diff are not a finding. Newly introduced UTF-8 bytes in such a file are, but only with evidence from the MR head: `glab api "projects/<enc>/repository/files/<path-enc>?ref=<head_sha>" --hostname <host>` -> decode `content` (base64) and check for UTF-8 sequences `\xc3[\x80-\xbf]`. The API diff is already converted to UTF-8 and is useless for this.
