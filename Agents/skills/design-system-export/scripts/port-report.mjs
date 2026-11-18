#!/usr/bin/env node
// Prints the class names and data attributes on a source file, so a port can
// match them. Usage: node port-report.mjs Code/path/to/Component.vue
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractContract } from "./components.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: port-report.mjs <source file>");
  process.exit(2);
}
const contract = extractContract(readFileSync(resolve(file), "utf8"));
console.log(`classes: ${[...contract.classes].join(" ") || "(none)"}`);
console.log(`data: ${[...contract.dataAttrs].join(" ") || "(none)"}`);
