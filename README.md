<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,40:0f1b35,100:1a0d37&height=180&section=header&text=claude-code-kit&fontSize=42&fontColor=a78bfa&fontAlignY=38&desc=Skills%20and%20agents%20for%20Claude%20Code&descAlignY=57&descColor=8892b0&animation=fadeIn" width="100%" />

<div align="center">

![Claude Code](https://img.shields.io/badge/Claude%20Code-Marketplace-a78bfa?style=for-the-badge&logo=anthropic&logoColor=white&labelColor=0d1117)&nbsp;
![Plugins](https://img.shields.io/badge/2%20plugins-10%20items-64ffda?style=for-the-badge&logoColor=white&labelColor=0d1117)&nbsp;
![License](https://img.shields.io/badge/license-MIT-8892b0?style=for-the-badge&labelColor=0d1117)

</div>

<br>

> A Claude Code plugin marketplace with two plugins: **`dev-workflow`**, five
> general-purpose skills for overhauling, documenting and publishing a codebase, and
> **`creative-frontend`**, five specialist agents for GPU-heavy frontends — WebGL fluid
> simulation, GLSL print rendering, performance budgeting, motion plus accessibility,
> and i18n.

<br>

---

## Install

Add the marketplace once, then install whichever plugin you want:

```bash
/plugin marketplace add manu-brighter/claude-code-kit
/plugin install dev-workflow
/plugin install creative-frontend
```

<details>
<summary><b>Prefer a single skill without the plugin system?</b></summary>

<br>

Every skill is a self-contained folder. Clone the repo and copy the one you want into
your skills directory:

```bash
git clone https://github.com/manu-brighter/claude-code-kit
cp -r claude-code-kit/plugins/dev-workflow/skills/full-project-rework \
      ~/.claude/skills/full-project-rework
```

Agents work the same way — copy a single `.md` file into `.claude/agents/` in your
project. If your installation uses a different path (e.g. `.claude-private/skills/`),
copy there instead.

</details>

<br>

---

## `dev-workflow` — five skills

General-purpose, project-agnostic. Useful in any codebase.

| Skill | What it does |
|---|---|
| [**full-project-rework**](plugins/dev-workflow/skills/full-project-rework) | A complete autonomous three-phase overhaul: parallel analyzer subagents scan 20 categories, reviewer subagents triage what actually ships, implementer subagents apply the approved changes as atomic commits on a dedicated branch. One command, no micromanaging. |
| [**project-refresh**](plugins/dev-workflow/skills/project-refresh) | Audits everything documentation-adjacent — README, project brief, CHANGELOG, `docs/`, deployment config, i18n catalogs — against the actual state of the code, and fixes what has drifted. Lightweight; no branch, no pipeline. |
| [**generalize**](plugins/dev-workflow/skills/generalize) | Turns something you built for yourself into something a stranger can install: strips your name, employer, private repo names and local paths, while **keeping** the opinions that made it good. Produces a copy plus a change report; never touches the original. |
| [**list-skills**](plugins/dev-workflow/skills/list-skills) | A compact table of every skill you have installed, grouped into your own, plugin-provided, and built-in. Replaces scrolling the verbose system list. |
| [**erklaerbaer**](plugins/dev-workflow/skills/erklaerbaer) | Breaks any concept, error or piece of jargon down for someone with zero background knowledge. Friendly bear persona, everyday analogies, ASCII diagrams. Bilingual: answers in the language you write in. |

Both `full-project-rework` and `project-refresh` are **explicit-invocation only** — they
never trigger on a vague "clean up my code". That is deliberate.

<br>

---

## `creative-frontend` — five agents

Specialists for GPU-heavy, animation-heavy frontends. These carry real
primary-source research (Stam and GPU Gems for the fluid solver, the Khronos specs for
WebGL, WCAG and axe rules for accessibility, web.dev for Core Web Vitals) rather than
generic advice.

| Agent | Domain |
|---|---|
| [**fluid-sim-engineer**](plugins/creative-frontend/agents/fluid-sim-engineer.md) | Navier-Stokes pass pipeline, orchestrator, quality tiers, splat and ambient physics. 17 checkable failure modes with symptom, cause and fix. |
| [**shader-artisan**](plugins/creative-frontend/agents/shader-artisan.md) | GLSL ES 3.00 print-media rendering: halftone, dithering, posterize ladders, Sobel contours, OKLab duotone, overprint, wet edge, paper grain — plus the precision and ANGLE rules that decide whether it compiles at all. |
| [**webgl-perf-guardian**](plugins/creative-frontend/agents/webgl-perf-guardian.md) | Why a continuous RAF loop caps your Lighthouse score, how to measure real GPU frametime, bundle budgets, static-export constraints, and how to write CI budgets that do not lie. |
| [**motion-a11y-choreographer**](plugins/creative-frontend/agents/motion-a11y-choreographer.md) | One shared RAF for GSAP, smooth scroll and a 3D canvas; the pin-spacer crash on route change; StrictMode teardown; reduced motion; and the accessibility traps this class of site keeps rediscovering. |
| [**i18n-copy-steward**](plugins/creative-frontend/agents/i18n-copy-steward.md) | Keeping strings inside the i18n system, ICU placeholder traps, catalog parity across locales, and making house copy rules actually enforceable. |

<br>

### These agents ship a ground-truth block you are meant to replace

Each agent has a fenced section:

```markdown
## PROJECT GROUND TRUTH — replace this section with your own
```

It contains **exact paths, exact numbers, and an explicit list of decisions that look
like bugs but are not** — taken from the real project these were written for. It is
filled in rather than blank on purpose: a blank template teaches nothing, and seeing
what usable ground truth looks like is most of the value.

**Replace that block before using an agent seriously.** An agent pointed at files that
do not exist will confidently invent findings — which is exactly the failure these were
rebuilt to avoid. The two agents that preceded them had rotted into stating canonical
best practice as if it described the codebase; a code review caught three such claims
that would have fired as blockers against working, tuned code. The antidote is baked
into every agent here as two rules:

- an **authority order** — the source outranks the project brief, which outranks the
  agent file;
- a **"what this repo deliberately does NOT do"** list, so a considered decision is
  never mistaken for a defect.

<br>

---

## Repository structure

```
claude-code-kit/
├── .claude-plugin/marketplace.json
└── plugins/
    ├── dev-workflow/
    │   ├── .claude-plugin/plugin.json
    │   └── skills/<skill>/SKILL.md
    └── creative-frontend/
        ├── .claude-plugin/plugin.json
        └── agents/<agent>.md
```

<br>

---

## License

MIT. Use them, fork them, rewrite the ground-truth blocks for your own project.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:a78bfa,50:64ffda,100:0d1117&height=100&section=footer" width="100%" />
