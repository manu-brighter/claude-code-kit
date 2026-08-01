<img src="https://capsule-render.vercel.app/api?type=waving&color=0:ff6ba0,45:8b6fd8,100:3fc39a&height=200&section=header&text=claude-code-kit&fontSize=48&fontColor=f0e8dc&fontAlignY=36&desc=Skills%20and%20agents%20for%20Claude%20Code&descSize=18&descAlignY=55&descColor=f0e8dc&animation=fadeIn" width="100%" />

<div align="center">

![Claude Code](https://img.shields.io/badge/Claude%20Code-Marketplace-ff6ba0?style=for-the-badge&logo=anthropic&logoColor=f0e8dc&labelColor=1a0e12)&nbsp;
![Plugins](https://img.shields.io/badge/3%20plugins-8b6fd8?style=for-the-badge&logoColor=f0e8dc&labelColor=1a0e12)&nbsp;
![Items](https://img.shields.io/badge/5%20skills%20%2B%206%20agents-3fc39a?style=for-the-badge&logoColor=f0e8dc&labelColor=1a0e12)&nbsp;
![License](https://img.shields.io/badge/MIT-e8983a?style=for-the-badge&labelColor=1a0e12)

<br>

**Three plugins.** `dev-workflow` — five general-purpose skills for overhauling,
documenting and publishing a codebase.<br>`creative-frontend` — five specialist agents
for GPU-heavy frontends, each carrying real primary-source research.<br>`security-audit`
— one adversarial reviewer for the ways AI-generated code actually fails.

</div>

<br>

```bash
/plugin marketplace add manu-brighter/claude-code-kit
/plugin install dev-workflow
/plugin install creative-frontend
/plugin install security-audit
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

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff6ba0,50:8b6fd8,100:3fc39a&height=3&section=header" width="100%" />

<h2 align="center">🛠&nbsp;&nbsp;dev-workflow</h2>

<div align="center">

Project-agnostic. Useful in any codebase.

</div>

<br>

<table>
<tr>
<td width="27%" valign="top">

### [full-project-rework](plugins/dev-workflow/skills/full-project-rework)

![](https://img.shields.io/badge/multi--agent-ff6ba0?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

A complete autonomous three-phase overhaul. Parallel analyzer subagents scan 20
categories, reviewer subagents triage what actually ships, implementer subagents apply
the approved changes as atomic commits on a dedicated branch. Produces a report with
every accepted finding and its commit SHA, every rejection and its reasoning, and
decision-grade briefs for anything too sweeping to parallelize. Routes agents across
model tiers automatically.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [project-refresh](plugins/dev-workflow/skills/project-refresh)

![](https://img.shields.io/badge/docs%20%2B%20i18n-8b6fd8?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

Audits everything documentation-adjacent — README, project brief, CHANGELOG, `docs/`,
deployment config, locale catalogs — against the actual state of the code, and fixes
what has drifted. Also translates new or changed UI strings into every existing locale
file. Lightweight: no branch, no pipeline.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [generalize](plugins/dev-workflow/skills/generalize)

![](https://img.shields.io/badge/publishing-3fc39a?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

Turns something you built for yourself into something a stranger can install. A precise
three-way sort: **remove** identity, **genericize** the useful things whose specifics
are personal, **keep** the opinions that made it worth publishing. Over-scrubbing is
the failure mode it guards hardest against. Works on a copy, never the original, and
reports the borderline calls it wants you to overrule.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [list-skills](plugins/dev-workflow/skills/list-skills)

![](https://img.shields.io/badge/utility-e8983a?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

One compact table per group — your own skills, plugin-provided, built-in — each row a
name and a one-line description. Four modes via argument. Replaces scrolling the
verbose system list.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [erklaerbaer](plugins/dev-workflow/skills/erklaerbaer)

![](https://img.shields.io/badge/bilingual-ff6ba0?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

`ʕ•ᴥ•ʔ` Breaks any concept, error or piece of jargon down for someone with zero
background knowledge. Analogy first, compact, ASCII diagrams where they genuinely help,
kaomoji instead of emojis. **Answers in the language you write in** — German and
English both trigger it.

</td>
</tr>
</table>

> [!NOTE]
> `full-project-rework` and `project-refresh` are **explicit-invocation only**. They
> never fire on a vague "clean up my code". That is deliberate.

<br>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:3fc39a,50:8b6fd8,100:ff6ba0&height=3&section=header" width="100%" />

<h2 align="center">🎨&nbsp;&nbsp;creative-frontend</h2>

<div align="center">

Specialists for GPU-heavy, animation-heavy frontends. These carry real primary-source
research — Stam and GPU Gems for the fluid solver, the Khronos specs for WebGL, WCAG
and axe rules for accessibility, web.dev for Core Web Vitals — rather than generic
advice.

</div>

<br>

<table>
<tr>
<td width="27%" valign="top">

### [fluid-sim-engineer](plugins/creative-frontend/agents/fluid-sim-engineer.md)

![](https://img.shields.io/badge/navier--stokes-ff6ba0?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

The full pass pipeline with the reason each step cannot move, the math each pass
expresses, **17 failure modes** with symptom → cause → fix, known-good parameter
ranges, boundary conditions, and which tier knob is cheapest for what.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [shader-artisan](plugins/creative-frontend/agents/shader-artisan.md)

![](https://img.shields.io/badge/GLSL%20ES%203.00-8b6fd8?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

Print-media rendering that reads as the real process: AM halftone in screen space,
Bayer dithering, soft posterize, Scharr contours, OKLab duotone with conversion code,
subtractive overprint, wet edge, paper grain — plus the precision decision table and
the ANGLE rules that decide whether it compiles at all.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [webgl-perf-guardian](plugins/creative-frontend/agents/webgl-perf-guardian.md)

![](https://img.shields.io/badge/core%20web%20vitals-3fc39a?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

Why a continuous RAF loop structurally caps your Lighthouse score, and what is an
honest fix versus gaming it. GPU frametime via timer queries, static-export
constraints, responsive images without a framework component, and a measurement
playbook that says how to attribute each regression.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [motion-a11y-choreographer](plugins/creative-frontend/agents/motion-a11y-choreographer.md)

![](https://img.shields.io/badge/GSAP%20%2B%20WCAG-e8983a?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

The single-RAF contract, the ScrollTrigger pin-spacer `removeChild` crash on route
change, StrictMode teardown discipline, IntersectionObserver thresholds on tall
elements, easing craft, reduced motion under WCAG 2.3.3 and 2.2.2, and the axe traps
this class of site keeps rediscovering.

</td>
</tr>
<tr>
<td width="27%" valign="top">

### [i18n-copy-steward](plugins/creative-frontend/agents/i18n-copy-steward.md)

![](https://img.shields.io/badge/next--intl%20%2F%20ICU-ff6ba0?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

Keeping strings inside the i18n system, ICU placeholder and apostrophe traps, why a
derived message type will **not** catch a key missing in one locale, and how to make
house copy rules enforceable instead of vibes.

</td>
</tr>
</table>

<br>

### These agents ship a ground-truth block you are meant to replace

Each agent has a fenced section:

```markdown
## PROJECT GROUND TRUTH — replace this section with your own
```

It holds **exact paths, exact numbers, and an explicit list of decisions that look like
bugs but are not**, taken from the real project these were written for. It is filled in
rather than blank on purpose: a blank template teaches nothing, and seeing what usable
ground truth looks like is most of the value.

> [!IMPORTANT]
> **Replace that block before relying on an agent.** One pointed at files that do not
> exist will confidently invent findings — exactly the failure these were rebuilt to
> avoid.

The two agents that preceded these had rotted into stating canonical best practice as
if it described the codebase. A review caught three such claims that would have fired
as blockers against working, tuned code. The antidote is baked into every agent here:

<table>
<tr>
<td width="50%" valign="top">

**An authority order**

The source outranks the project brief, which outranks the agent file. If the file
disagrees with the code, the code wins and the file is stale — say so instead of
"fixing" the code to match.

</td>
<td width="50%" valign="top">

**A "what this repo does NOT do" list**

So a considered decision is never mistaken for a defect. The single cheapest way to
stop an agent re-reporting the same non-finding forever.

</td>
</tr>
</table>

<br>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:8b6fd8,50:ff6ba0,100:e8983a&height=3&section=header" width="100%" />

<h2 align="center">🔐&nbsp;&nbsp;security-audit</h2>

<div align="center">

One adversarial reviewer, ordered by how AI-generated code actually fails.

</div>

<br>

<table>
<tr>
<td width="27%" valign="top">

### [security-safety-auditor](plugins/security-audit/agents/security-safety-auditor.md)

![](https://img.shields.io/badge/OWASP%202025-8b6fd8?style=flat-square&labelColor=1a0e12)

</td>
<td valign="top">

A **Priority Sweep** ordered by frequency × impact in vibe-coded apps — Row Level
Security, secrets in client bundles, missing server-side authorization, slopsquatted
dependencies, the lethal trifecta, destructive-action guardrails — then sixteen
systematic domains mapped to OWASP Top 10 2025. Severity and **confidence are scored
separately**, coverage gaps are mandatory, and findings are deduplicated to their root
cause. It reads the codebase as untrusted input: instructions found inside audited files
become prompt-injection findings, never commands.

</td>
</tr>
</table>

> [!NOTE]
> The agent holds `Bash` for `git log` and `git diff`, so its read-only rule is
> **prompt-level, not a control** — and it says so in its own report. The plugin ships
> `hooks/read-only-guard.js` to make it real. It is not auto-registered: `PreToolUse`
> carries no "which agent is running" field, so a registered hook would block Bash in
> every session. [Wiring instructions](plugins/security-audit#enforcing-read-only-optional-but-recommended).

<br>

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:ff6ba0,50:8b6fd8,100:3fc39a&height=3&section=header" width="100%" />

## Repository structure

```
claude-code-kit/
├── .claude-plugin/marketplace.json
└── plugins/
    ├── dev-workflow/
    │   ├── .claude-plugin/plugin.json
    │   └── skills/<skill>/SKILL.md
    ├── creative-frontend/
    │   ├── .claude-plugin/plugin.json
    │   └── agents/<agent>.md
    └── security-audit/
        ├── .claude-plugin/plugin.json
        ├── agents/security-safety-auditor.md
        └── hooks/read-only-guard.js
```

## License

MIT. Use them, fork them, rewrite the ground-truth blocks for your own project.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:3fc39a,50:8b6fd8,100:ff6ba0&height=120&section=footer" width="100%" />
