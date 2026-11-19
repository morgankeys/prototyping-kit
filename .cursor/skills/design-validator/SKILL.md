---
name: design-validator
description: Install the kit's reference design-system validator into Code/ and wire the validate role. Copies the tested Stylelint-based validator from this skill, installs its pinned dependencies, fills in its config for the stack (global stylesheet, token files, manifest, component file types), runs it, and records the setup in Code/ARCHITECTURE.md. Use when the user invokes /design-validator, when /setup reaches the ds-validator item, when validate has no real command yet, or when the validator needs adapting to a new framework.
---

Read and follow `Agents/skills/design-validator/SKILL.md`.
