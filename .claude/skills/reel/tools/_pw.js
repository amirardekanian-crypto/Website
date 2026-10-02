// Finds playwright-core for the timeline tools without making anyone set NODE_PATH.
// Order: a normal require() (NODE_PATH works too) -> $REEL_TOOLS -> %TEMP%/reel-tools/node_modules (what setup_tools.py installs).
// usage in a tool:  const { chromium } = require('./_pw');
const path = require('path');
const os = require('os');

function load() {
  try { return require('playwright-core'); } catch (e) { /* fall through */ }
  const dirs = [process.env.REEL_TOOLS, path.join(os.tmpdir(), 'reel-tools', 'node_modules'), process.env.TEMP && path.join(process.env.TEMP, 'reel-tools', 'node_modules')].filter(Boolean);
  for (const d of dirs) {
    for (const base of [d, path.join(d, 'node_modules')]) {
      try { return require(path.join(base, 'playwright-core')); } catch (e) { /* next */ }
    }
  }
  console.error('playwright-core not found. Run once:  python .claude/skills/reel/tools/setup_tools.py');
  process.exit(2);
}
module.exports = load();
