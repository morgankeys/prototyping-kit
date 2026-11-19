#!/usr/bin/env node
// Lists inventory rows and whether the Code path exists. The skill uses this
// to decide what it may port. Placeholder rows are omitted.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readInventory } from "./components.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const rows = readInventory(root);
if (!rows.length) {
  console.log("No components in the inventory.");
} else {
  for (const row of rows) {
    const state = !row.code ? "no code path" : existsSync(resolve(root, row.code)) ? "present" : "missing";
    console.log(`${row.name}\t${row.code || "—"}\t${state}`);
  }
}
