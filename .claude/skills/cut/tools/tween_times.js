// Print the start and end time of every tween on a reel page's master timeline, as JSON: {"times":[...],"tweens":N,"duration":S}
//   node tween_times.js <reel>/public/index.html
// qa_reel.py uses it to tell a planned jump in the picture (a graphic starts or ends) from a stray one. Local only: it opens the page
// from disk in Hyperframes' own headless Chrome (puppeteer-core is inside the global hyperframes install) and reads window.__timelines.
const fs = require("fs");
const path = require("path");

const NPM = path.join(process.env.APPDATA || "", "npm", "node_modules", "hyperframes", "node_modules");
const puppeteer = require(path.join(NPM, "puppeteer-core"));

function chromeExe() {
  const root = path.join(process.env.USERPROFILE || "", ".cache", "puppeteer", "chrome-headless-shell");
  for (const v of fs.readdirSync(root).sort().reverse()) {
    for (const sub of fs.readdirSync(path.join(root, v))) {
      const exe = path.join(root, v, sub, "chrome-headless-shell.exe");
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error("no chrome-headless-shell in " + root);
}

(async () => {
  const file = path.resolve(process.argv[2]);
  const browser = await puppeteer.launch({ executablePath: chromeExe(), headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.goto("file:///" + file.replace(/\\/g, "/"), { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => window.__timelines && Object.keys(window.__timelines).length > 0, { timeout: 30000 });
    const out = await page.evaluate(() => {
      const times = new Set();
      let tweens = 0;
      const walk = (tl, off) => {
        for (const ch of tl.getChildren(false, true, true)) {
          const s = off + ch.startTime();
          if (typeof ch.getChildren === "function" && ch.getChildren(false, true, true).length && !ch.targets) {
            walk(ch, s);
          } else {
            tweens++;
            times.add(+s.toFixed(3));
            times.add(+(s + ch.duration()).toFixed(3));
          }
        }
      };
      let duration = 0;
      for (const id of Object.keys(window.__timelines)) {
        walk(window.__timelines[id], 0);
        duration = Math.max(duration, window.__timelines[id].duration());
      }
      return { times: [...times].sort((a, b) => a - b), tweens, duration };
    });
    console.log(JSON.stringify(out));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(String(e && e.stack || e));
  process.exit(1);
});
