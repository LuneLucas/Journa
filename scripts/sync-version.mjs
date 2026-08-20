#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const files = {
  app: path.join(root, "app.js"),
  index: path.join(root, "index.html"),
  serviceWorker: path.join(root, "sw.js"),
};

function read(name) {
  return fs.readFileSync(files[name], "utf8");
}

function versions() {
  const app = read("app").match(/const APP_VERSION = "([^"]+)";/)?.[1] || "";
  const serviceWorker = read("serviceWorker").match(/const APP_VERSION = "([^"]+)";/)?.[1] || "";
  const indexMatches = [...read("index").matchAll(/\?v=([^"'\s>]+)/g)].map((match) => match[1]);
  return { app, serviceWorker, index: [...new Set(indexMatches)] };
}

function assertVersion(version) {
  if (!version || !/^[A-Za-z0-9._-]+$/.test(version)) {
    throw new Error("版本戳只能包含字母、数字、点、下划线和连字符");
  }
}

function check() {
  const current = versions();
  const all = [current.app, current.serviceWorker, ...current.index];
  const ok = all.length > 0 && all.every((version) => version === all[0]);
  if (!ok) {
    console.error(JSON.stringify(current, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(`VERSION_OK ${all[0]}`);
}

function update(version) {
  assertVersion(version);
  const app = read("app").replace(/const APP_VERSION = "[^"]+";/, `const APP_VERSION = "${version}";`);
  const serviceWorker = read("serviceWorker").replace(/const APP_VERSION = "[^"]+";/, `const APP_VERSION = "${version}";`);
  const index = read("index").replace(/\?v=[^"'\s>]+/g, `?v=${version}`);
  fs.writeFileSync(files.app, app);
  fs.writeFileSync(files.serviceWorker, serviceWorker);
  fs.writeFileSync(files.index, index);
  console.log(`VERSION_UPDATED ${version}`);
}

const versionArgIndex = process.argv.indexOf("--version");
if (versionArgIndex >= 0) update(process.argv[versionArgIndex + 1]);
else check();
