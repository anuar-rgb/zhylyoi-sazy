import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";
import { PUBLIC_SITE_URL } from "./siteUrl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "public", "qrcode.png");

// Error correction M, not the default: a printed code picks up scuffs and ink
// spread, and M recovers 15% of the modules while staying dense enough to read
// at the 380px the A5 banner scales it to.
await QRCode.toFile(out, PUBLIC_SITE_URL, {
  width: 512,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#000000ff", light: "#ffffffff" },
});

console.log(`qrcode.png -> ${PUBLIC_SITE_URL}`);
