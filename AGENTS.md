# AGENTS.md — Project Agent Guide

This project uses `agent-harness` for reusable Cursor agent guidance, safety hooks, skills, rules, and the optional `#implements` implementation pipeline.

Replace the placeholders in this file with project-specific context after install. Keep harness-managed files generic when possible so future `agent-harness install` upgrades can apply cleanly.

---

## Project Structure

Document the project layout here. Example:

```
src/            # Application source
tests/          # Test files
scripts/        # Local automation
docs/           # Project documentation
```

Key routes, packages, services, or entry points: `<fill in for this project>`.

---

## Dev Environment

```bash
<package-manager> install       # Install dependencies
<package-manager> run dev       # Start development server
<package-manager> run build     # Production build
<package-manager> run lint      # Lint check
<package-manager> run test      # Test suite, if configured
```

Document any required local services, environment variables, or setup steps here.

---

## Before Committing

1. Run the project lint command and fix errors.
2. Run the relevant tests or build validation.
3. Run formatting checks if the project has them.
4. Do not commit `.env*`, credentials, private keys, service-role keys, or generated secrets.

---

## PR Instructions

- Keep PRs focused: one feature or fix per PR.
- Include what changed, why it changed, and how it was validated.
- Link issues, migrations, design references, or rollout notes when relevant.

---

## Code Style Guidelines

Customize this section for the stack. Good defaults:

- Prefer existing project patterns over new abstractions.
- Keep edits scoped to the request.
- Use descriptive file and symbol names.
- Avoid comments that narrate obvious code; comment non-obvious intent.
- Preserve public APIs and persisted data compatibility unless the user explicitly asks to break them.

---

## Architecture Rules

All rule files live in `.cursor/rules/`. Read the relevant files yourself based on the task. When in doubt, read the rule. The cost of reading an unnecessary rule is low; the cost of violating one is high.

### Read for every coding task

- **`.cursor/rules/agent-learnings.mdc`** — read before starting implementation work. Add repeatable mistakes and correct patterns here.
- **`.cursor/rules/code-validation.mdc`** — read before validating code changes. Default to focused tests; run full suites only when requested.
- **`.cursor/rules/agent-harness.mdc`** — read when changing harness-managed files or installer behavior.

### Special pipeline rule

- **`.cursor/rules/pipeline.mdc`** — read immediately and follow in full when the user's message contains `#implements`. Do not act on `#implements` without reading this file first.
- **`.cursor/rules/pipeline-trigger.mdc`** — always-on keyword trigger that points agents to the pipeline rule.

### Special critic rule

- **`.cursor/rules/agent-critic.mdc`** — read immediately and follow in full when the user's message contains `#critic`. Do not plan or implement from `#critic` until the critic workflow completes or the developer stops it.
- **`.cursor/rules/agent-critic-trigger.mdc`** — always-on keyword trigger that points agents to the critic rule.

### Read when working in specific domains

- **`.cursor/rules/supabase.mdc`** — read before writing database queries, auth checks, Supabase clients, middleware, storage config, migrations, or RLS-sensitive code.
- **`.cursor/rules/zustand-store-architecture.mdc`** — read before adding or editing shared client-side state with Zustand, or before deciding whether state belongs in a global store.

Add project-specific rules beside these files and index them here.

---

## Skills

Skills provide specialized guidance. Project skills live in `.cursor/skills/<name>/SKILL.md`. Read the full `SKILL.md` before acting when a task matches a skill description.

### Pipeline and Agent Workflow

- **`implementation-pipeline`** — read when using or modifying the `#implements` worktree pipeline.

### UI, UX, and Visual Work

- **`impeccable`** — read before designing, redesigning, polishing, auditing, or substantially changing frontend interfaces.
- **`uiux-animation`** — read when making decisions about animation, micro-interactions, transitions, or UI feel.
- **`taste-skill`** — placeholder skill for project-specific design taste guidance; extend it before relying on it.

### SEO and Content Visibility

- **`google-seo-expert`** — read when diagnosing or improving SEO, crawlability, indexing, structured data, Core Web Vitals, rankings, sitemap, robots, or rich snippets.

### GSAP Animation

- **`gsap-react`** — read before writing GSAP in React or Next.js components.
- **`gsap-scrolltrigger`** — read before implementing scroll-linked animation, pinning, scrub, or parallax.
- **`gsap-core`** — read for tweens, easing, stagger, `gsap.matchMedia()`, or reduced-motion patterns.
- **`gsap-timeline`** — read when sequencing animations.
- **`gsap-plugins`** — read before registering or using GSAP plugins.
- **`gsap-performance`** — read when optimizing animation smoothness or reducing jank.
- **`gsap-utils`** — read when using `gsap.utils` helpers.
- **`gsap-frameworks`** — read for Vue, Nuxt, Svelte, SvelteKit, or non-React GSAP usage.

### Other Specialized Tasks

- **`openai-docs`** — read before building with OpenAI APIs, choosing models, or writing prompts that depend on current OpenAI docs.
- **`imagegen`** — read before generating or editing raster images.

---

## Security Considerations

- Never commit secrets, `.env*`, credentials, private keys, or service-role keys.
- Keep server-only secrets out of browser/client bundles.
- Validate auth server-side for protected operations.
- Prefer least-privilege keys and scoped tokens.

---

## Harness Files

Managed by `agent-harness` and tracked in `.cursor/agent-harness-manifest.json`:

- `AGENTS.md`
- `.cursor/rules/agent-critic-trigger.mdc`
- `.cursor/rules/agent-critic.mdc`
- `.cursor/rules/agent-harness.mdc`
- `.cursor/rules/agent-learnings.mdc`
- `.cursor/rules/code-validation.mdc`
- `.cursor/rules/pipeline-trigger.mdc`
- `.cursor/rules/pipeline.mdc`
- `.cursor/rules/supabase.mdc`
- `.cursor/rules/zustand-store-architecture.mdc`
- `.cursor/skills/**`
- `.cursor/hooks.json`
- `.cursor/hooks/file-scope-guard.sh`
- `.cursor/hooks/tool-scope-guard.sh`
- `.cursor/hooks/subagent-audit.sh`
