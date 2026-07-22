# creative-frontend

Five specialist Claude Code agents for GPU-heavy, animation-heavy frontends. Each is a
**builder and a reviewer**: it can implement in its domain and it carries a triage
checklist for reviewing that domain.

```bash
/plugin marketplace add manu-brighter/claude-code-kit
/plugin install creative-frontend
```

## Read this before using them

Each agent contains a fenced section:

```markdown
## PROJECT GROUND TRUTH — replace this section with your own
```

That block holds exact file paths, exact tier numbers, and an explicit list of
decisions that look like bugs but are not — taken from the real project these were
written for ([a WebGL portfolio site](https://github.com/manu-brighter/manus-portfolio)).

It is **filled in rather than blank on purpose.** A blank template teaches nothing;
seeing what usable ground truth looks like is most of the value. But an agent pointed at
files that do not exist in *your* project will confidently invent findings, so replace
that block before relying on one.

Everything outside the block is domain knowledge that holds anywhere: solver math,
shader formulas, spec-level browser behaviour, WCAG rules, Core Web Vitals mechanics.

## Why the ground-truth block exists at all

These five replaced two older agents that had rotted. A code review of the rewrite
verified every technical claim against source and caught three that were confidently
wrong about the codebase — each of which would have fired as a false blocker against
working, tuned code. The pattern behind all three was the same: **canonical best
practice stated as if it described the project.**

Two rules in every agent here are the antidote, and they are the most transferable thing
in this plugin:

- **Authority order** — the source outranks the project brief, which outranks the agent
  file. If the file disagrees with the code, the code wins and the file is stale.
- **A "what this repo deliberately does NOT do" list** — so a considered decision is
  never mistaken for a defect. It is the single cheapest way to stop an agent from
  re-reporting the same non-finding forever.

## Agents

| Agent | Owns | Highlights |
|---|---|---|
| [**fluid-sim-engineer**](agents/fluid-sim-engineer.md) | Physics passes of a GPU fluid sim, the orchestrator, quality tiers | Full Navier-Stokes pass order with the reason each step cannot move, the math each pass expresses, 17 failure modes with symptom → cause → fix, known-good parameter ranges, boundary conditions, and which tier knob is cheapest for what |
| [**shader-artisan**](agents/shader-artisan.md) | Render passes, shared shader includes, compile helpers | Print-media rendering that reads as the real process: AM halftone in screen space, Bayer dithering, soft posterize, Scharr contours, OKLab duotone (with conversion code), subtractive overprint, wet edge, granulation, paper grain — plus the precision decision table and the ANGLE/WebGL2 rules that decide whether it compiles |
| [**webgl-perf-guardian**](agents/webgl-perf-guardian.md) | Frame budget, measurement, bundle, CI budgets | Why a continuous RAF loop structurally caps your Lighthouse score (and what is an honest fix versus gaming it), GPU frametime via timer queries, static-export constraints, responsive images without a framework component, and a measurement playbook that says how to attribute each regression |
| [**motion-a11y-choreographer**](agents/motion-a11y-choreographer.md) | Scroll/motion choreography and accessibility | The single-RAF contract, the ScrollTrigger pin-spacer `removeChild` crash on route change, StrictMode teardown discipline, IntersectionObserver thresholds on tall elements, easing craft, reduced motion under WCAG 2.3.3/2.2.2, and the axe traps this class of site keeps rediscovering |
| [**i18n-copy-steward**](agents/i18n-copy-steward.md) | Multi-locale strings and copy discipline | Keeping strings inside the i18n system, ICU placeholder and apostrophe traps, why a derived message type will *not* catch a key missing in one locale, and how to make house copy rules enforceable instead of vibes |

## Routing between them

They deliberately overlap in knowledge but not in ownership:

- Physics passes (advect, curl, divergence, pressure, vorticity, splat) →
  **fluid-sim-engineer**. Render passes and shared includes → **shader-artisan**.
- Tier *values* → **fluid-sim-engineer**. Tier *budget* and frametime measurement →
  **webgl-perf-guardian**.

## License

MIT
