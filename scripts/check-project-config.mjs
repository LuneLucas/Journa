#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const config = require(fileURLToPath(new URL("../playwright.config.js", import.meta.url)));
const projects = new Map((config.projects || []).map((project) => [project.name, project]));

assert.equal(projects.get("chromium-mobile")?.use?.browserName, "chromium");
assert.equal(projects.get("webkit-mobile")?.use?.defaultBrowserType, "webkit");
assert.equal(projects.get("chromium-desktop")?.use?.defaultBrowserType, "chromium");
assert.equal(projects.get("webkit-desktop")?.use?.defaultBrowserType, "webkit");

console.log("PROJECT_CONFIG_OK");
