import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const read = (file) => readFileSync(resolve(root, file), "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push(`${name}: ${detail}`);
}

const index = read("index.html");
const app = read("app.js");
const style = read("style.css");
const sw = read("sw.js");

const gameRigsIndex = index.indexOf("game-rigs.js");
const appIndex = index.indexOf("app.js");
check(
  "shared-rigs-loaded",
  gameRigsIndex !== -1 && appIndex !== -1 && gameRigsIndex < appIndex,
  "index.html must load game-rigs.js before app.js so gameplay and lab share the same rig renderer"
);

for (const name of ["drawOrionRig", "drawBeeRig", "drawElitaRig", "drawD16Rig", "drawBeeVehicle", "drawElitaVehicle", "drawD16Vehicle"]) {
  check(
    `no-local-${name}`,
    !new RegExp(`function\\s+${name}\\s*\\(`).test(app),
    `app.js should not define ${name}; use window.GameRigs instead`
  );
}

check(
  "reward-celebration-markup",
  index.includes("rewardBurst") && index.includes("rewardStars"),
  "reward screen needs dedicated burst/stars elements for a visual celebration"
);

check(
  "compact-mobile-hud",
  style.includes("mobile-hud-compact") && /\.hud-pill\s+\.hud-label/.test(style),
  "style.css needs compact mobile HUD rules that hide labels and preserve playfield space"
);

check(
  "navigation-only-fallback",
  sw.includes('event.request.mode === "navigate"') && !sw.includes('catch(() => caches.match("./index.html"))'),
  "service worker fallback to index.html should be limited to navigation requests"
);

if (failures.length) {
  console.error(`Prototype contract failures (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Prototype contracts passed.");
