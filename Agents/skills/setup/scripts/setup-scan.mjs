#!/usr/bin/env node
// setup-scan.mjs — helpers for the setup skill. No dependencies beyond Node 18+.
//
//   node Agents/skills/setup/scripts/setup-scan.mjs
//     Read-only. Prints what can be told about setup without judgment: whether this is the
//     template or a prototype, the Figma decision, how Docs/setup-status.md compares with the
//     canonical checklist (new items, leftover rows), and every stub that is still open.
//
//   node Agents/skills/setup/scripts/setup-scan.mjs sync
//     Creates Docs/setup-status.md with one `todo` row per checklist item, or adds rows
//     for items the file doesn't have yet. Never changes or removes an existing row.
//     Refuses to run in the template.
//
// Item and stub definitions are read from ../checklist.md; nothing is listed here.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CHECKLIST = join(dirname(fileURLToPath(import.meta.url)), "../checklist.md");
const STATUS_REL = "Docs/setup-status.md";
const STATUS = join(ROOT, STATUS_REL);
const FIGMA_FILES = ["Agents/context/design-system.md", "Docs/Design system/README.md"];

const read = (rel) => {
  const path = join(ROOT, rel);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
};

// Cells of a Markdown table row whose first cell is a backticked id, or null.
const idRow = (line) => {
  if (!/^\|\s*`[a-z0-9-]+`\s*\|/.test(line)) return null;
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
};
const unquote = (cell) => cell.replace(/^`+|`+$/g, "");

function parseChecklist() {
  const items = [];
  const stubs = [];
  let section = "";
  for (const line of readFileSync(CHECKLIST, "utf8").split("\n")) {
    if (line.startsWith("## ")) section = line.slice(3).trim();
    const cells = idRow(line);
    if (!cells) continue;
    const id = unquote(cells[0]);
    if (section === "Stubs") {
      if (cells.length !== 4) fail(`checklist: stub row \`${id}\` needs 4 columns (is there a "|" in the marker?)`);
      stubs.push({ id, file: unquote(cells[1]), marker: unquote(cells[2]), item: unquote(cells[3]) });
    } else if (/^\d+\. /.test(section)) {
      if (cells.length !== 6) fail(`checklist: item row \`${id}\` needs 6 columns`);
      items.push({ id, who: cells[2], level: cells[3], section: section.replace(/^\d+\. /, "") });
    }
  }
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length) fail("checklist: duplicate item id");
  for (const stub of stubs) {
    if (!ids.has(stub.item)) fail(`checklist: stub \`${stub.id}\` points at unknown item \`${stub.item}\``);
  }
  return { items, stubs };
}

function parseStatus() {
  const text = read(STATUS_REL);
  if (text === null) return null;
  const rows = new Map();
  for (const line of text.split("\n")) {
    const cells = idRow(line);
    if (cells) rows.set(unquote(cells[0]), { status: cells[1] ?? "", notes: cells[3] ?? "" });
  }
  return rows;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

const isTemplate = () => existsSync(join(ROOT, "new-prototype.sh"));

// Both files also mention the phrase in the sentence that explains the option ("replace
// both lines with ..."), which must not count as the decision.
const saysNotUsed = (text) =>
  text.split("\n").some((line) => line.includes("Figma: not used") && !line.includes("replace both"));

function figmaDecision() {
  const texts = FIGMA_FILES.map((rel) => read(rel) ?? "");
  if (texts.some((text) => text.includes("<Figma link to the"))) return "undecided (placeholder links)";
  const notUsed = texts.map(saysNotUsed);
  if (notUsed.every(Boolean)) return "not used";
  if (notUsed.some(Boolean)) return "inconsistent (one file says not used, the other doesn't)";
  return "used (links recorded)";
}

function lineNumbers(text, marker) {
  const lines = [];
  text.split("\n").forEach((line, index) => {
    if (line.includes(marker)) lines.push(index + 1);
  });
  return lines;
}

function scan() {
  const { items, stubs } = parseChecklist();
  const status = parseStatus();

  const provenance = read("README.md")?.match(/^(?:Created|Forked) from prototyping-kit @.*$/m)?.[0];
  console.log("# Setup scan\n");
  console.log(
    isTemplate()
      ? "Repo: TEMPLATE, or a prototype copied by hand (new-prototype.sh is present)."
      : `Repo: prototype. Provenance: ${provenance ?? "MISSING from README.md"}`,
  );
  console.log(`Figma: ${figmaDecision()}`);

  console.log(`\n## Status file (${STATUS_REL})\n`);
  if (!status) {
    console.log(`Missing. ${items.length} checklist items, none tracked yet. Run \`sync\` to create it.`);
  } else {
    const known = new Set(items.map((item) => item.id));
    const fresh = items.filter((item) => !status.has(item.id));
    const leftover = [...status.keys()].filter((id) => !known.has(id));
    const counts = {};
    for (const [id, row] of status) {
      if (known.has(id)) counts[row.status || "(empty)"] = (counts[row.status || "(empty)"] ?? 0) + 1;
    }
    console.log(`${status.size} rows: ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ") || "none"}`);
    console.log(`New in the checklist, not tracked yet: ${fresh.map((i) => i.id).join(", ") || "none"}`);
    console.log(`Rows whose item is no longer in the checklist: ${leftover.join(", ") || "none"}`);
  }

  const open = [];
  const missing = [];
  for (const stub of stubs) {
    const text = read(stub.file);
    if (text === null) missing.push(stub);
    else {
      const lines = lineNumbers(text, stub.marker);
      if (lines.length) open.push({ ...stub, lines });
    }
  }
  console.log(`\n## Stubs\n`);
  console.log(`${open.length} open, ${stubs.length - open.length - missing.length} filled, ${missing.length} file gone (of ${stubs.length})\n`);
  const byItem = new Map();
  for (const stub of open) byItem.set(stub.item, [...(byItem.get(stub.item) ?? []), stub]);
  for (const [item, list] of byItem) {
    const tracked = status?.get(item)?.status;
    console.log(`${item}${tracked ? ` [${tracked}]` : ""}`);
    for (const stub of list) console.log(`  open  ${stub.id}  ${stub.file}:${stub.lines.join(",")}`);
  }
  if (missing.length) {
    console.log("\nFile gone (filled if the file was removed on purpose, otherwise check):");
    for (const stub of missing) console.log(`  ${stub.id}  ${stub.file}  (${stub.item})`);
  }
}

const HEADER = `# Setup status

Where this prototype stands against the setup checklist. Written by \`/setup\`; item definitions
are in [\`Agents/skills/setup/checklist.md\`](../Agents/skills/setup/checklist.md), so this
file only records progress. Edit a row by hand whenever that is quicker: tick off a step
you did, or write \`opted out\` to drop a tool.

Status is one of \`todo\`, \`waiting\` (on the item or person named in Notes), \`done\`,
\`opted out\`, or \`n/a\`. Checked is the date an agent or person last confirmed the row.

| Item | Status | Checked | Notes |
| --- | --- | --- | --- |
`;

function sync() {
  if (isTemplate()) {
    fail(
      "new-prototype.sh is present, so this looks like the template. Setup progress is tracked in a prototype, not in the template.\n" +
        "If this is a prototype that was copied by hand, finish `prototype-provenance` first (see the setup skill), then run sync again.",
    );
  }
  const { items } = parseChecklist();
  const status = parseStatus();
  const row = (item) => `| \`${item.id}\` | todo | | |`;
  if (!status) {
    writeFileSync(STATUS, HEADER + items.map(row).join("\n") + "\n");
    console.log(`Created ${STATUS_REL} with ${items.length} rows.`);
    return;
  }
  const fresh = items.filter((item) => !status.has(item.id));
  if (!fresh.length) {
    console.log(`${STATUS_REL} already has a row for every checklist item.`);
    return;
  }
  // Append after the last table row, so text a person added below the table stays below it.
  const lines = readFileSync(STATUS, "utf8").replace(/\n+$/, "").split("\n");
  let last = -1;
  lines.forEach((line, index) => {
    if (line.startsWith("|")) last = index;
  });
  if (last === -1) fail(`${STATUS_REL} has no table to add rows to. Delete it and run sync again.`);
  lines.splice(last + 1, 0, ...fresh.map(row));
  writeFileSync(STATUS, lines.join("\n") + "\n");
  console.log(`Added ${fresh.length} rows to ${STATUS_REL}: ${fresh.map((i) => i.id).join(", ")}`);
}

const command = process.argv[2];
if (!command) scan();
else if (command === "sync") sync();
else fail(`Unknown command "${command}". Use no argument to scan, or "sync".`);
