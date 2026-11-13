# React ports

One `<Name>.tsx` per component listed in `../config.mjs`. Most export targets
expect React, so each shipped component needs a React version here, whatever
stack the prototype uses.

Port the **markup only**. The exporter lifts the component's styles from its
original source file at export time, so a port must render the same element
structure, class names, and `data-*` attributes as the original. Change
styling in the original. Change a port only when the original's template or
props change.

Worked examples (Vue and Astro originals):
`Agents/skills/design-system-export/examples/react/`.
