#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const extensions = new Set([".js", ".mjs", ".cjs"]);
const sourceRoots = ["src", "scripts", "tests"];
const entryFiles = ["app.js", "sw.js", "playwright.config.js"];

async function collectScripts(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await collectScripts(relativePath));
    else if (extensions.has(path.extname(entry.name))) files.push(relativePath);
  }
  return files;
}

const files = [
  ...entryFiles,
  ...(await Promise.all(sourceRoots.map(collectScripts))).flat(),
].sort();

for (const relativePath of files) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, relativePath)], {
    encoding: "utf8",
  });
  if (result.status === 0) continue;
  process.stderr.write(result.stderr || result.stdout || `语法检查失败：${relativePath}\n`);
  process.exit(result.status || 1);
}

console.log(`JS_SYNTAX_OK ${files.length}`);
