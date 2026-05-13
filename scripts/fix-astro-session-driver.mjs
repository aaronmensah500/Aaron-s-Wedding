/**
 * Astro's session virtual module emits:
 *   import ... from '/path/with/Aaron's wedding/...'
 * Single-quoted paths break when the project directory contains `'`.
 * Upstream: https://github.com/withastro/astro (vite-plugin.js session-driver)
 *
 * Re-applies the safe form using JSON.stringify(resolved.id) after npm install.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "node_modules/astro/dist/core/session/vite-plugin.js");

if (!fs.existsSync(target)) {
  process.exit(0);
}

let s = fs.readFileSync(target, "utf8");
if (s.includes("JSON.stringify(resolved.id)")) {
  process.exit(0);
}

const needle = `        return {
          code: \`import { default as _default } from '\${resolved.id}';
export * from '\${resolved.id}';
export default _default;\`
        };`;

const replacement = `        const _spec = JSON.stringify(resolved.id);
        return {
          code: \`import { default as _default } from \${_spec};
export * from \${_spec};
export default _default;\`
        };`;

if (!s.includes(needle)) {
  console.warn("[fix-astro-session-driver] pattern not found; skip (Astro version changed?)");
  process.exit(0);
}

fs.writeFileSync(target, s.replace(needle, replacement));
console.log("[fix-astro-session-driver] patched astro session vite-plugin (apostrophe-safe imports)");
