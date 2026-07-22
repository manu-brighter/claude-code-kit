# Analyzer Categories — Detailed Criteria

Each section is meant to be read by the analyzer subagent assigned to that category. Sections are intentionally specific so the agent doesn't hallucinate generic "best practices" and instead audits for concrete things.

Severity guidance applies to every category:
- **critical**: actively broken, data loss, security hole, runtime error, breaks build
- **high**: clear defect, will hurt users or maintainers soon
- **medium**: real improvement, low risk
- **low**: nitpick — only include if many of them aggregate into a real problem

---

## security

What to look for:
- Hardcoded secrets, API keys, tokens, passwords (also in committed `.env*` files, fixtures, tests)
- SQL injection: string concatenation into queries, missing prepared statements
- XSS: untrusted input rendered without escaping (PHP echo, Vue `v-html`, React `dangerouslySetInnerHTML`, innerHTML, document.write)
- CSRF protection missing on state-changing endpoints
- Auth/authz bugs: missing checks, IDOR (user can access other users' resources by ID), trusting client-sent role/permission claims
- Insecure deserialization (`unserialize` on user input, `pickle`, `Marshal.load`)
- Unsafe file uploads: no MIME check, path traversal, executable extensions allowed
- Open redirects (returning to a URL from a query param without allow-list)
- Verbose error pages in production, stack traces leaked to clients
- Outdated crypto: MD5/SHA1 for passwords, ECB, weak randomness (`rand()` for security tokens)
- Missing security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- CORS wildcard with credentials
- Known CVEs in dependencies (cross-reference `composer.lock` / `package-lock.json` versions against known advisories)
- Session fixation, missing `HttpOnly`/`Secure`/`SameSite` on cookies
- Mass-assignment vulnerabilities in models (Yii, Laravel, etc.)

Don't flag:
- Theoretical risks with no exploit path
- Internal-only tools without auth where that's by design (note it once, don't repeat per file)

---

## dead-code

What to look for:
- Functions, classes, exports never imported or called anywhere in the project
- Files not referenced by any other file or entry point
- Unused `import` / `use` statements
- Unreachable code after `return`, `throw`, `exit`
- Always-true / always-false conditions
- Dead CSS selectors (no matching DOM, no Vue component using that class)
- Unused CSS variables, SCSS mixins, design tokens
- Orphan tests (testing functions that no longer exist)
- Commented-out code blocks older than 6 months (check `git blame`)
- Feature flags stuck "on" forever, with no off path remaining
- Deprecated API endpoints with zero traffic (if logs available)

Heuristics:
- Use `Grep` to count references. A symbol referenced only in its definition file is suspect.
- Be careful with dynamic dispatch (string-keyed lookups, reflection, magic methods, Vue dynamic components).

Don't flag:
- Public API surface intended for external consumers (libraries)
- Code clearly behind a documented feature flag with planned rollout

---

## outdated-deps

What to look for:
- Packages in `composer.json` / `package.json` that are 1+ major version behind current stable
- Runtime versions on EOL (PHP < 8.2, Node < 20 LTS, Vue 2 — Vue 2 is EOL since end of 2023)
- Deprecated APIs in use (filter_var deprecated flags, jQuery if vanilla works, moment.js when date-fns/dayjs/Temporal would do)
- Lockfile drift: `composer.lock` / `package-lock.json` not committed, or out of date with manifest
- Multiple HTTP clients / utility libs doing the same job (axios + fetch + got)
- Polyfills no longer needed (es5-shim in a project that targets evergreen)
- Build tools that have a clear modern replacement (webpack → Vite for SPAs; gulp/grunt → npm scripts)
- Known-deprecated packages (request, node-uuid, etc.)

For each finding, note:
- Current version → latest stable
- Breaking changes between them (briefly)
- Whether the upgrade is safe or requires migration work

---

## code-cleanliness

What to look for:
- Functions over ~50 lines without good reason
- Cyclomatic complexity > 10
- Nesting depth > 3
- Magic numbers and strings (status codes, role IDs, time intervals) that should be constants
- Duplicated logic (same 5+ lines repeated in 3+ places)
- Inconsistent error handling — some functions throw, others return false, others return null, with no pattern
- Long parameter lists (>4) where a config object would read better
- Mixed responsibilities in one function (does the thing AND logs AND validates AND notifies)
- Excessive use of static methods / global state where dependency injection would clarify

Adapt to project conventions:
- If the project is OOP and uses fluent interfaces, don't flag fluent calls as "too long"
- If the project favors functional pipelines, don't flag pipe chains

---

## logic-errors

What to look for:
- Off-by-one in pagination, slicing, loops
- Race conditions: read-then-write without locking, async operations whose ordering matters but isn't enforced
- Wrong defaults: empty array passed where null was expected, falsy checks that miss `0` or `""`
- Swallowed exceptions: `catch {}`, `catch (e) { /* ignore */ }`, broad `except: pass`
- Missing null/undefined handling at boundaries (API responses, DB results, user input)
- Comparison bugs: `==` vs `===` in JS, loose comparison in PHP, comparing different types
- Date/time bugs: timezone-naive operations, DST traps, mutating Date objects in place
- Floating-point equality
- Integer overflow on large IDs / counters
- Boolean parameter confusion at call sites (`createUser(true, false, true)` — what do those mean?)
- Inverted conditions (`if (!isValid) doValidThing()`)
- Async/await misuse: missing await, returning promises from sync paths, unhandled rejections

Be concrete. "Possible race condition" isn't useful; explain the exact interleaving that breaks.

---

## naming-consistency

What to look for:
- Inconsistent casing: camelCase vs snake_case for the same kind of thing (variables, methods, files)
- File naming inconsistent with project convention (one Component.vue and one component.vue)
- Misleading names (`getUser()` that also writes to DB, `isReady` that's a number)
- Abbreviations used inconsistently (`usr` vs `user`, `cfg` vs `config`)
- German/English mixing in identifiers without a clear convention
- Generic names that don't convey purpose (`data`, `info`, `helper`, `manager`, `util`, `temp`, `tmp`)
- Boolean names that don't read as questions (`active` vs `isActive`)
- Plural/singular mismatches (`users` containing a single user)
- Hungarian notation in modern code (`strName`, `arrItems`) — usually a smell

Adapt to project. A codebase might mix domain terms from another language (e.g. German nouns) with English code — that's fine if consistent.

---

## ui-consistency

What to look for:
- Button styles that vary across screens for the same intent (primary action has 3 different appearances)
- Spacing that doesn't follow a grid/scale (random `margin: 13px`, `padding: 7px`)
- Color values hardcoded instead of using tokens / CSS variables
- Icon set mixed (Font Awesome + Heroicons + custom SVGs without a system)
- Copy inconsistency (modal title says "Cancel", button says "Abbrechen", another says "Verwerfen")
- Modal/dialog patterns that differ structurally (some close on backdrop, some don't)
- Form layouts that differ (label position, error placement, required-marker style)
- Empty states / loading states / error states implemented differently per screen
- Mobile breakpoints inconsistent across components
- Dark mode broken or partially implemented
- Z-index chaos (no scale, magic numbers like `9999`)

---

## css-architecture

What to look for:
- Mixed approaches: utility (Tailwind) + BEM + scoped styles + inline — pick one
- Selector specificity wars (`!important` cascades)
- Redundant rules — same property declared 3 times in the cascade
- Magic values not tokenized (colors, spacings, font sizes scattered raw)
- Selectors so specific they break encapsulation (`.app .page .container .x .y`)
- Global resets fighting framework defaults
- Vendor prefixes still present that autoprefixer should handle
- Animation timing/easing inconsistent across components
- Z-index ladder undocumented and chaotic
- CSS files / `<style>` blocks larger than they need to be (lots of unused selectors)

If using Vue scoped styles, check that shared design tokens live in a real CSS variables file, not duplicated per component.

---

## code-inconsistency

What to look for:
- Same problem solved differently in different places (3 different date formatters, 2 different HTTP wrappers)
- Tabs vs spaces, mixed indent widths
- Quote style inconsistent (single vs double)
- Import ordering inconsistent
- Async style inconsistent (callbacks vs promises vs async/await in similar contexts)
- Error patterns inconsistent (throw vs return Result vs return null)
- Configuration spread across env + constants + hardcoded
- Multiple ways to read the same env variable / config
- Helpers that duplicate stdlib functionality
- Mix of conventions for handling optional values (`null` vs `undefined` vs missing key)

This category catches things that aren't wrong individually but make the codebase feel disjointed.

---

## complexity

What to look for:
- Premature abstraction: interfaces with one implementation, factories that just call `new X`, base classes used once
- Generic frameworks where 50 lines of straight code would do
- Configuration to handle cases that don't exist
- Pattern overuse: every class has a builder, every flow has an event emitter, every function takes a context
- Long inheritance chains
- God objects / god services that know everything
- Feature flags layered on feature flags
- Dynamic dispatch where static would be clearer
- Metaprogramming used for things normal code handles
- "Reusable" components used in exactly one place

The fix is often to delete code, not add more.

---

## frontend-design

What to look for:
- Weak visual hierarchy: everything the same size/weight
- Poor information architecture: critical actions buried, secondary actions prominent
- No breathing room: cramped layouts, insufficient spacing
- Typography: too many type sizes/weights, line-height too tight, line-length too wide (>75ch body text)
- Motion: missing transitions on state changes, OR animations that block interaction, OR cheesy bouncy easings on serious UI
- Empty/loading/error states that look unfinished (raw spinners, "Error" with no recovery action)
- Modals that should be inline editing, inline editing that should be modals
- Tables that should be cards on mobile, cards that should be tables on desktop
- Excessive use of icons without labels
- Inconsistent affordance: clickable things that don't look clickable, non-clickable things that do

---

## accessibility

What to look for:
- Keyboard navigation broken (focus traps, unreachable controls)
- Missing focus rings (or removed via `outline: none` without replacement)
- Missing `alt` on meaningful images
- Form inputs without `<label>` association
- Buttons that are actually `<div>`s
- Icon-only buttons without `aria-label`
- Color contrast below WCAG AA (4.5:1 text, 3:1 large)
- Color used as sole information carrier
- Modals without focus trap and ESC-to-close
- Tab order out of visual order
- Skipped heading levels (`h1` → `h3`)
- No skip-to-content link on heavy nav
- Auto-playing media without controls
- Animations without prefers-reduced-motion respect

---

## performance

What to look for:
- N+1 queries (ORM lazy loading in loops)
- Missing DB indexes on frequently-queried columns
- Full-table scans where partial index would help
- Synchronous I/O in request paths
- Bundle bloat: barrel imports, unused libraries shipped to client, no code splitting
- Images unoptimized (no responsive sizes, no modern formats, no lazy loading)
- Excessive re-renders / re-computations
- Cache misuse: cacheable responses without cache headers, OR aggressive caching of mutable data
- Memory leaks: event listeners never removed, subscriptions never unsubscribed
- Blocking scripts in `<head>`
- Web fonts loaded without `font-display: swap`
- API responses returning more data than needed

---

## architecture

What to look for:
- Layering violations: controllers querying the DB directly, models calling HTTP services
- Circular dependencies between modules
- Domain logic in the framework layer (Yii controllers full of business rules)
- Anemic models with logic spread across services
- Boundary leaks: DB column names exposed as API field names, framework types in domain code
- Coupling: changing X requires changing 7 unrelated files
- Missing seams for testing (everything reaches for globals / singletons)
- No clear separation between read paths and write paths if the domain is complex
- Frontend reaching directly into backend internals (URL patterns hardcoded, no client SDK)
- Module organization that no longer matches the domain (vestigial folders from a different architecture)
- God-modules that aggregate too many responsibilities

Findings can range from small to large. Tag honest effort estimates — a "split this service into two" finding is `effort=large` and the reviewer will route it appropriately. Don't artificially shrink the scope of a finding to make it look smaller than it is.

Wholesale architecture pivots (hexagonal, CQRS introduction, micro-frontend split, monorepo restructure) are not your category — those belong in `strategic-modernization`. Your scope is "structural improvements within the current overall architecture".

---

## strategic-modernization

This category exists specifically to surface **big bets** — the kind of change that meaningfully shifts the project's trajectory but is too large to ship in a normal rework run. Your output drives the "Strategic Follow-ups" section of the final report. You are NOT writing findings that will be implemented this run (unless the user explicitly force-implements them). You are writing decision-grade strategic recommendations.

You think like a Staff Engineer who's been embedded in this codebase for years and is briefing the team on what would actually move the needle.

What to look for:
- **Runtime / language upgrades that are real projects**: Vue 2 → 3, PHP 7.x → 8.x, Node 16 → 22, Python 2 → 3 holdovers, end-of-life framework versions
- **Build tooling pivots**: webpack → Vite, gulp/grunt → modern scripts, Lerna → pnpm workspaces, Rollup adoption
- **Framework or library swaps**: jQuery → vanilla/native, moment → Temporal/date-fns, Yii 1 → Yii 2, Symfony major upgrades, Vue Options API → Composition API across the project
- **Cross-cutting consolidation**: 3 different HTTP wrappers → one client; 2 different state stores → one; mixed CSS approaches → one tokenized system
- **Architectural pivots**: hexagonal / clean architecture introduction; CQRS for genuinely complex domains; introduction of a real service layer in a controller-heavy codebase; pulling Yii AR out of domain logic; introducing a typed DTO layer between API and domain
- **API surface modernization**: REST → typed contracts (OpenAPI as source of truth, codegen for clients), v1 → v2 endpoint families
- **Database modernization**: schema layer that fights ORM, missing migration discipline, denormalized blobs that should be relational, single-tenant assumptions that need to become multi-tenant
- **Testing strategy gaps**: missing E2E coverage for critical flows; legacy test framework holding back the rest (PHPUnit 4 → 10, Cypress → Playwright)
- **Type-safety transitions**: introducing TypeScript to a JS codebase, introducing PHPStan at a useful level to a project that has none, enabling strict null safety
- **Tooling that has clearly moved on**: deprecated linters, EOL formatters, package managers that the ecosystem left behind (Bower, npm 6, Composer 1)
- **Design system / UI consolidation**: ad-hoc component duplication → shared component library, untokenized colors → design tokens, mixed icon sets → unified system

For each strategic finding, produce a **decision-grade brief**, not a tweet. The reviewer will route this verbatim into the Strategic Follow-ups section, and the user will read it to decide whether to plan that work.

Required structure per finding:

```
### S-1: <Concrete target>
- **What**: <one to two sentences — what specifically changes>
- **Why now**: <the trigger — EOL date, accumulating cost, security risk, blocked feature, dev velocity drag>
- **Effort estimate**: <person-weeks, rough order of magnitude>
- **Migration path**: <ordered steps, not exhaustive but credible — 4-8 phases>
- **Target stack / pattern**: <what specifically replaces what>
- **Dependencies / prerequisites**: <what has to be true before this can start — e.g., test coverage threshold, freeze on feature X, training>
- **Risk if NOT done**: <concrete consequence in 6/12/24 months>
- **Compatible with**: <which smaller rework findings could / should be done in service of this>
- **Confidence**: high | medium | low — your conviction this is the right move
```

Severity in this category maps to urgency:
- `critical` — EOL or security-driven, cannot reasonably defer past 6 months
- `high` — significant cost accumulating, real velocity drag right now
- `medium` — clear net positive but not on fire
- `low` — speculative, premature, or low-confidence call → consider not including it

Honesty rules:
- Don't pad. If the codebase doesn't need a strategic intervention, your output can be one or two findings, or even zero with a "Project is on a healthy stack, no strategic moves recommended at this time."
- Don't recommend trendy things for trend's sake. "Microservices" because it's modern is not a strategic finding.
- Don't recommend something you can't articulate the migration path for. If you can't sketch the phases, the finding isn't ready.
- Specifically acknowledge when a swap would replace one tradeoff with another rather than be strictly better.
- If two strategic findings conflict (e.g., "migrate Vue 2 → 3" and "rebuild frontend in SvelteKit"), pick the one with better risk/reward and reject the other yourself; don't make the reviewer choose.

---

## type-safety

What to look for:
- `any` / `mixed` used where a real type is known
- Untyped function parameters or return types
- PHPStan / Psalm / TS strict-mode errors currently suppressed
- Type assertions hiding genuine bugs (`x as User` when `x` could be `null`)
- API responses typed as `any` at the boundary
- Enums simulated with string unions where a real enum would be safer
- Discriminated unions not used where they should be (`type: 'success' | 'error'` with conditional payload)
- Generic params shadowed by `any`

For PHP: check PHPStan level, look for `@var mixed` and `@param mixed` overrides.

---

## error-handling

What to look for:
- Catch-and-swallow without logging
- Errors logged but not surfaced to the user (silent failures)
- Inconsistent error response shapes from the API
- Stack traces leaked to end users
- User-facing error messages that are useless ("Something went wrong")
- No Sentry / monitoring breadcrumbs in error paths
- Retries with no backoff or with infinite retry
- Validation errors mixed with system errors
- Missing finally / cleanup in resource-acquiring code

---

## i18n

What to look for:
- Hardcoded user-facing strings in components / templates
- Date/number formatting that doesn't respect locale
- Translation files with missing keys for some locales
- Translation files with orphan keys (translated but no longer used)
- String concatenation for sentences (breaks word order in other languages)
- Missing pluralization handling
- Direction-unsafe layouts (RTL untested)
- Currency / unit assumptions

If the project has a primary non-English UI language: check for other-locale variants and consistency.

---

## testing-coverage

What to look for:
- Critical paths with no test coverage (auth, payments, data mutations)
- Tests that always pass regardless of code (no real assertions, mocking the thing under test)
- Tests testing implementation details that change frequently
- Brittle Cypress selectors (relying on CSS classes that change)
- Slow test suite (>5 min for what should be <1 min) with obvious causes
- Flaky tests (search history if available)
- Missing E2E coverage for user-visible flows
- Missing unit tests for complex pure functions

---

## documentation

What to look for:
- README that lies (claims things that aren't true anymore)
- README missing setup steps that everyone has to ask in chat about
- Comments that say WHAT the code does (noise) — flag for deletion
- Missing WHY-comments on non-obvious decisions (workarounds, hidden constraints)
- Outdated ADRs / design docs
- Public API surfaces (library exports, REST endpoints) without docs
- Confusing or missing OpenAPI / Swagger specs
- Commit messages that say "fix bug" with no context (note as pattern, not per-commit)
- Inline JSDoc / PHPDoc that contradicts the actual signature

---

## Cross-cutting reminders for every analyzer

- Always cite `file:line` precisely. "Somewhere in auth/" is useless.
- Be honest about scope. If your finding requires touching 50 files, mark effort=large and let the reviewer decide.
- Don't recommend installing a new dependency unless it's clearly the right call.
- Don't recommend "rewrite this module" — that's not a finding, that's a project.
- If the codebase is genuinely good in your area, your output can be short. Don't manufacture findings.
