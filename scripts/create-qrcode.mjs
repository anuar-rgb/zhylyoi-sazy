import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PUBLIC_SITE_URL } from "./siteUrl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

/**
 * What each code opens.
 *
 * Paths carry no /ru prefix on purpose: that address serves Kazakh, the default,
 * and the switcher in the header still works. A code pinned to one language would
 * outlive the reason it was pinned.
 *
 * Slugs are written out rather than read from the database. This runs on a laptop
 * before printing, with no credentials to hand, and a collective's address changes
 * about as often as the poster it ends up on.
 */
const TARGETS = [
  { file: "qrcode.png", path: "", label: "сайт" },
  { file: "qr/zhylyoi-sazy.png", path: "collectives/zhylyoi-sazy", label: "ансамбль «Жылыой сазы»" },
  { file: "qr/zhastar.png", path: "collectives/zhastar", label: "театр «Жастар»" },
];

// Error correction M, not the default: a printed code picks up scuffs and ink
// spread, and M recovers 15% of the modules while staying dense enough to read
// at the 380px the A5 banner scales it to.
const OPTIONS = {
  width: 512,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#000000ff", light: "#ffffffff" },
};

for (const target of TARGETS) {
  const url = PUBLIC_SITE_URL + target.path;
  const out = path.join(publicDir, target.file);

  await fs.mkdir(path.dirname(out), { recursive: true });
  await QRCode.toFile(out, url, OPTIONS);

  console.log(`${target.file.padEnd(28)} ${target.label.padEnd(24)} -> ${url}`);
}
