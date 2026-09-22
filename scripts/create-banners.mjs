import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { PUBLIC_SITE_HOST } from "./siteUrl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, "..", "public");
const gallery = path.join(pub, "images", "gallery");

const DARKRED = "#8B1A1A";
const GOLD = "#C9A84C";
const CREAM = "#FAF3E0";

// --- Banner 1: A5 Portrait (1748 x 2480 px at 300dpi) ---
async function createBannerA5() {
  const W = 1748;
  const H = 2480;

  const photo = await sharp(path.join(gallery, "ensemble-photo.jpeg"))
    .resize(W, 900, { fit: "cover", position: "top" })
    .toBuffer();

  const logo = await sharp(path.join(gallery, "logo.png"))
    .resize(200, 200, { fit: "cover" })
    .composite([{
      input: Buffer.from(`<svg width="200" height="200"><circle cx="100" cy="100" r="100" fill="white"/></svg>`),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  const qr = await sharp(path.join(pub, "qrcode.png"))
    .resize(380, 380)
    .toBuffer();

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${DARKRED}"/>
        <stop offset="100%" stop-color="#6B1414"/>
      </linearGradient>
      <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${DARKRED}"/>
        <stop offset="40%" stop-color="${GOLD}"/>
        <stop offset="60%" stop-color="#D4B85E"/>
        <stop offset="100%" stop-color="${DARKRED}"/>
      </linearGradient>
      <linearGradient id="qrGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${DARKRED}"/>
        <stop offset="100%" stop-color="#5A1010"/>
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="${W}" height="${H}" fill="${CREAM}"/>

    <!-- Pattern -->
    <pattern id="pat" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="30" height="60" fill="${GOLD}" opacity="0.04"/>
    </pattern>
    <rect width="${W}" height="${H}" fill="url(#pat)"/>

    <!-- Frame border -->
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="8" fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.35"/>

    <!-- Top header band -->
    <rect y="0" width="${W}" height="320" fill="url(#topGrad)"/>

    <!-- Header text -->
    <text x="300" y="120" font-family="Arial, sans-serif" font-size="38" fill="${GOLD}" font-weight="500" letter-spacing="2">«КЕҢ ЖЫЛЫОЙ» МӘДЕНИЕТ ҮЙІ</text>
    <text x="300" y="210" font-family="Arial, sans-serif" font-size="90" fill="${GOLD}" font-weight="800">ЖЫЛЫОЙ САЗЫ</text>
    <text x="300" y="270" font-family="Arial, sans-serif" font-size="42" fill="${CREAM}" opacity="0.8">фольклорлық ансамблі</text>

    <!-- Gold divider after photo area (photo at y=320, h=900 => y=1220) -->
    <rect y="1220" width="${W}" height="16" fill="url(#goldLine)"/>

    <!-- Content text -->
    <text x="${W / 2}" y="1310" font-family="Arial, sans-serif" font-size="52" fill="${DARKRED}" font-weight="700" text-anchor="middle">Қазақ халқының музыкалық мұрасын</text>
    <text x="${W / 2}" y="1375" font-family="Arial, sans-serif" font-size="52" fill="${DARKRED}" font-weight="700" text-anchor="middle">сақтау мен насихаттау</text>

    <text x="${W / 2}" y="1445" font-family="Arial, sans-serif" font-size="36" fill="#4A3020" text-anchor="middle">Халық әндері мен күйлері, дәстүрлі аспаптық музыка,</text>
    <text x="${W / 2}" y="1490" font-family="Arial, sans-serif" font-size="36" fill="#4A3020" text-anchor="middle">авторлық туындылар және әлемдік классика</text>

    <!-- Stats -->
    <text x="340" y="1600" font-family="Arial, sans-serif" font-size="90" fill="${DARKRED}" font-weight="800" text-anchor="middle">18</text>
    <text x="340" y="1645" font-family="Arial, sans-serif" font-size="28" fill="${DARKRED}" opacity="0.6" text-anchor="middle">кәсіби өнерпаз</text>

    <text x="${W / 2}" y="1600" font-family="Arial, sans-serif" font-size="90" fill="${DARKRED}" font-weight="800" text-anchor="middle">10+</text>
    <text x="${W / 2}" y="1645" font-family="Arial, sans-serif" font-size="28" fill="${DARKRED}" opacity="0.6" text-anchor="middle">шығарма</text>

    <text x="${W - 340}" y="1600" font-family="Arial, sans-serif" font-size="90" fill="${DARKRED}" font-weight="800" text-anchor="middle">2026</text>
    <text x="${W - 340}" y="1645" font-family="Arial, sans-serif" font-size="28" fill="${DARKRED}" opacity="0.6" text-anchor="middle">құрылған жылы</text>

    <!-- QR section background -->
    <rect x="80" y="1720" width="${W - 160}" height="480" rx="30" fill="url(#qrGrad)"/>

    <!-- QR white background -->
    <rect x="120" y="1760" width="400" height="400" rx="20" fill="${CREAM}"/>

    <!-- QR text -->
    <text x="570" y="1830" font-family="Arial, sans-serif" font-size="54" fill="${GOLD}" font-weight="700">QR-кодты сканерлеңіз!</text>
    <text x="570" y="1900" font-family="Arial, sans-serif" font-size="34" fill="${CREAM}" opacity="0.85">Ансамбльдің толық портфолиосымен,</text>
    <text x="570" y="1945" font-family="Arial, sans-serif" font-size="34" fill="${CREAM}" opacity="0.85">құрамымен және бейнежазбаларымен</text>
    <text x="570" y="1990" font-family="Arial, sans-serif" font-size="34" fill="${CREAM}" opacity="0.85">танысыңыз</text>
    <text x="570" y="2080" font-family="Arial, sans-serif" font-size="28" fill="${GOLD}" opacity="0.7">${PUBLIC_SITE_HOST}</text>

    <!-- Footer contacts -->
    <text x="${W / 2}" y="2330" font-family="Arial, sans-serif" font-size="32" fill="${DARKRED}" text-anchor="middle">📞 +7 778 927 63 87    ✉ dk.kenzhylyoi@gmail.com</text>
    <text x="${W / 2}" y="2390" font-family="Arial, sans-serif" font-size="32" fill="${DARKRED}" text-anchor="middle">📍 Жылыой ауданы, Атырау облысы</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .composite([
      { input: photo, top: 320, left: 0 },
      { input: logo, top: 60, left: 70 },
      { input: qr, top: 1770, left: 130 },
    ])
    .jpeg({ quality: 95 })
    .toFile(path.join(gallery, "banner-a5.jpg"));

  console.log("banner-a5.jpg created");
}

// --- Banner 2: Instagram square (1080x1080) ---
async function createBannerSquare() {
  const W = 1080;
  const H = 1080;

  const photo = await sharp(path.join(gallery, "ensemble-photo.jpeg"))
    .resize(W, 500, { fit: "cover", position: "top" })
    .toBuffer();

  const logo = await sharp(path.join(gallery, "logo.png"))
    .resize(120, 120, { fit: "cover" })
    .composite([{
      input: Buffer.from(`<svg width="120" height="120"><circle cx="60" cy="60" r="60" fill="white"/></svg>`),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  const qr = await sharp(path.join(pub, "qrcode.png"))
    .resize(200, 200)
    .toBuffer();

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${DARKRED}"/>
        <stop offset="100%" stop-color="#5A1010"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${DARKRED}"/>
        <stop offset="50%" stop-color="${GOLD}"/>
        <stop offset="100%" stop-color="${DARKRED}"/>
      </linearGradient>
    </defs>

    <rect width="${W}" height="${H}" fill="${CREAM}"/>

    <!-- Top photo area darkened at bottom -->
    <rect y="0" width="${W}" height="500" fill="#000"/>

    <!-- Photo gradient overlay -->
    <rect y="380" width="${W}" height="120" fill="url(#g1)" opacity="0.8"/>

    <!-- Title on photo -->
    <text x="30" y="460" font-family="Arial, sans-serif" font-size="52" fill="${GOLD}" font-weight="800">ЖЫЛЫОЙ САЗЫ</text>
    <text x="30" y="495" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.8">«Кең Жылыой» мәдениет үйі · фольклорлық ансамбль</text>

    <!-- Gold line -->
    <rect y="500" width="${W}" height="8" fill="url(#g2)"/>

    <!-- Content area -->
    <text x="${W / 2}" y="570" font-family="Arial, sans-serif" font-size="30" fill="${DARKRED}" font-weight="700" text-anchor="middle">Қазақ халқының музыкалық мұрасын сақтау мен насихаттау</text>

    <!-- Stats row -->
    <text x="180" y="650" font-family="Arial, sans-serif" font-size="52" fill="${DARKRED}" font-weight="800" text-anchor="middle">18</text>
    <text x="180" y="680" font-family="Arial, sans-serif" font-size="18" fill="${DARKRED}" opacity="0.6" text-anchor="middle">кәсіби өнерпаз</text>

    <text x="${W / 2}" y="650" font-family="Arial, sans-serif" font-size="52" fill="${DARKRED}" font-weight="800" text-anchor="middle">10+</text>
    <text x="${W / 2}" y="680" font-family="Arial, sans-serif" font-size="18" fill="${DARKRED}" opacity="0.6" text-anchor="middle">шығарма</text>

    <text x="${W - 180}" y="650" font-family="Arial, sans-serif" font-size="52" fill="${DARKRED}" font-weight="800" text-anchor="middle">2026</text>
    <text x="${W - 180}" y="680" font-family="Arial, sans-serif" font-size="18" fill="${DARKRED}" opacity="0.6" text-anchor="middle">құрылған жылы</text>

    <!-- QR section -->
    <rect x="30" y="720" width="${W - 60}" height="260" rx="20" fill="url(#g1)"/>
    <rect x="50" y="740" width="220" height="220" rx="14" fill="${CREAM}"/>

    <text x="300" y="800" font-family="Arial, sans-serif" font-size="34" fill="${GOLD}" font-weight="700">QR-кодты сканерлеңіз!</text>
    <text x="300" y="845" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.85">Толық портфолио, құрам, бейнелер</text>
    <text x="300" y="920" font-family="Arial, sans-serif" font-size="18" fill="${GOLD}" opacity="0.7">${PUBLIC_SITE_HOST}</text>

    <!-- Footer -->
    <text x="${W / 2}" y="1030" font-family="Arial, sans-serif" font-size="20" fill="${DARKRED}" text-anchor="middle">📞 +7 778 927 63 87 · ✉ dk.kenzhylyoi@gmail.com · 📍 Жылыой ауданы</text>

    <!-- Frame -->
    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="6" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity="0.3"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .composite([
      { input: photo, top: 0, left: 0 },
      { input: logo, top: 15, left: W - 140 },
      { input: qr, top: 750, left: 60 },
    ])
    .jpeg({ quality: 95 })
    .toFile(path.join(gallery, "banner-square.jpg"));

  console.log("banner-square.jpg created");
}

// --- Banner 3: Horizontal (1920x1080) ---
async function createBannerWide() {
  const W = 1920;
  const H = 1080;

  const photo = await sharp(path.join(gallery, "ensemble-photo.jpeg"))
    .resize(960, H, { fit: "cover", position: "center" })
    .toBuffer();

  const logo = await sharp(path.join(gallery, "logo.png"))
    .resize(140, 140, { fit: "cover" })
    .composite([{
      input: Buffer.from(`<svg width="140" height="140"><circle cx="70" cy="70" r="70" fill="white"/></svg>`),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  const qr = await sharp(path.join(pub, "qrcode.png"))
    .resize(220, 220)
    .toBuffer();

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="h1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${DARKRED}"/>
        <stop offset="100%" stop-color="#5A1010"/>
      </linearGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${DARKRED}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${DARKRED}" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- Right half: photo background -->
    <rect width="${W}" height="${H}" fill="#000"/>

    <!-- Left panel -->
    <rect x="0" y="0" width="1050" height="${H}" fill="url(#h1)"/>

    <!-- Fade over photo -->
    <rect x="960" y="0" width="200" height="${H}" fill="url(#fade)"/>

    <!-- Left content -->
    <text x="80" y="180" font-family="Arial, sans-serif" font-size="28" fill="${GOLD}" font-weight="500" letter-spacing="2">«КЕҢ ЖЫЛЫОЙ» МӘДЕНИЕТ ҮЙІ</text>
    <text x="80" y="280" font-family="Arial, sans-serif" font-size="80" fill="${GOLD}" font-weight="800">ЖЫЛЫОЙ</text>
    <text x="80" y="370" font-family="Arial, sans-serif" font-size="80" fill="${CREAM}" font-weight="800">САЗЫ</text>
    <text x="80" y="420" font-family="Arial, sans-serif" font-size="30" fill="${CREAM}" opacity="0.7">фольклорлық ансамблі · 18 кәсіби өнерпаз</text>

    <!-- Description -->
    <text x="80" y="500" font-family="Arial, sans-serif" font-size="24" fill="${CREAM}" opacity="0.7">Қазақ халқының бай музыкалық мұрасын</text>
    <text x="80" y="535" font-family="Arial, sans-serif" font-size="24" fill="${CREAM}" opacity="0.7">сақтау, дамыту және келер ұрпаққа жеткізу</text>

    <!-- QR block -->
    <rect x="60" y="600" width="660" height="280" rx="20" fill="#000" opacity="0.3"/>
    <rect x="80" y="620" width="240" height="240" rx="14" fill="${CREAM}"/>

    <text x="350" y="690" font-family="Arial, sans-serif" font-size="36" fill="${GOLD}" font-weight="700">QR-кодты сканерлеңіз!</text>
    <text x="350" y="740" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.85">Толық портфолио, құрам,</text>
    <text x="350" y="775" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.85">бейнежазбалар</text>
    <text x="350" y="835" font-family="Arial, sans-serif" font-size="18" fill="${GOLD}" opacity="0.6">${PUBLIC_SITE_HOST}</text>

    <!-- Footer -->
    <text x="80" y="970" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.6">📞 +7 778 927 63 87</text>
    <text x="80" y="1005" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.6">✉ dk.kenzhylyoi@gmail.com</text>
    <text x="80" y="1040" font-family="Arial, sans-serif" font-size="22" fill="${CREAM}" opacity="0.6">📍 Жылыой ауданы, Атырау облысы</text>

    <!-- Frame -->
    <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="6" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity="0.2"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .composite([
      { input: photo, top: 0, left: 960 },
      { input: logo, top: 50, left: 830 },
      { input: qr, top: 630, left: 90 },
    ])
    .jpeg({ quality: 95 })
    .toFile(path.join(gallery, "banner-wide.jpg"));

  console.log("banner-wide.jpg created");
}

await createBannerA5();
await createBannerSquare();
await createBannerWide();
console.log("\nAll 3 banners saved to public/images/gallery/");
