---
name: implementation-pipeline
description: Guides Cursor agents through a generic #implements workflow with isolated worktrees, planning approval, implementation validation, and commit handoff. Use when the user mentions #implements, automated implementation pipelines, worktree-isolated coding, planner/reviewer/coder/enforcer workflows, or reusable agent harnesses.
---

# Implementation Pipeline

Use this skill with `.cursor/rules/pipeline.mdc`.

## Quick Start

When the user says `#implements`:

1. Read `.cursor/rules/pipeline.mdc` in full.
2. Parse the user's feature request and constraints.
3. Create a sibling worktree from the current branch after the published-branch gate passes.
4. Run the plan-review approval loop.
5. Run the implementation-enforcement approval loop.
6. Commit only after the developer approves.
7. Never merge automatically.

## Role Boundaries

- Planner: creates micro-step implementation plan.
- Adversarial reviewer: challenges scope, risk, and validation quality.
- Coder: implements only the approved plan.
- Enforcer: validates correctness, style, tests, and scope control.

Do not leak hidden context between roles. Pass explicit artifacts: request text, constraints, plan content, worktree path, and review findings.

## Safety

All implementation work belongs in the pipeline worktree. The original checkout remains the baseline and should not be modified by the pipeline.
