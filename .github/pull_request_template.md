## Summary

<!-- One or two sentences: what this changes and why. -->

## What changed

<!-- Short bullets, grouped by area (Code/, Docs/, Agents/). -->

-

## Verification

CI runs `lint`, `check`, `build`, `validate`, and the component catalog checks. Deviations
that `validate` lists don't fail it; a scoping error or a stale backlog does. These are the ones it can't:

- [ ] `/token-usage-review` (changed tokens; `full` before a promotion to `main`)
- [ ] Checked the affected pages in the dev server

## Design system deviations

<!-- Any hardcoded value or missing token introduced here, and why. Write "None" if
     there are none. Do not suppress a rule or delete a backlog entry to avoid listing one.
     Fill in the `Rationale:` line for each new entry in
     Docs/Design system/deviations-backlog.md — leave "Unknown — needs review" only
     if the reason is genuinely unclear. -->

None
