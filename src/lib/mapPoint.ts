/**
 * The institution's point on the map, taken from whatever staff paste into Настройки: a link copied
 * from Google Maps, 2GIS, Yandex Maps or OpenStreetMap, or the coordinates themselves.
 *
 * Plain functions with no server imports, so the settings form, the map and tests share them.
 * Short links (maps.app.goo.gl, go.2gis.com …) carry no coordinates; the server follows their
 * redirect first (resolveMapPoint in mapLinks.ts) and passes the full link here.
 */

export type MapPoint = { lat: number; lng: number };

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`;

function point(lat: number, lng: number): MapPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** "a,b" with a and b numbers, or null. */
function pair(text: string | null | undefined): [number, number] | null {
  if (!text) return null;
  const match = text.match(new RegExp(`^\\s*(${NUM})\\s*,\\s*(${NUM})`));
  return match ? [Number(match[1]), Number(match[2])] : null;
}

function hostOf(text: string): string | null {
  const match = text.match(/^https?:\/\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function param(text: string, name: string): string | null {
  const match = text.match(new RegExp(`[?&#]${name}=([^&#]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return null;
  }
}

/** A link or "lat, lng" turned into a point, or null when no point can be read from it. */
export function parseMapPoint(input: string): MapPoint | null {
  const text = input.trim();
  if (!text) return null;

  const host = hostOf(text);
  if (!host) {
    // Coordinates typed or copied as text: "46.962148, 54.012918" (latitude first, as every map shows them).
    const plain = text.match(new RegExp(`^(${NUM})\\s*[,;\\s]\\s*(${NUM})$`));
    return plain ? point(Number(plain[1]), Number(plain[2])) : null;
  }

  const decoded = (() => {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  })();

  if (host.includes("2gis.")) {
    // 2GIS puts longitude first: ?m=54.0129,46.9621/17 and /geo/<id>/54.0129,46.9621.
    const geo = decoded.match(new RegExp(`/geo/(?:\\d+/)?(${NUM}),(${NUM})`));
    if (geo) return point(Number(geo[2]), Number(geo[1]));
    const m = pair(param(text, "m"));
    return m ? point(m[1], m[0]) : null;
  }

  if (host.includes("yandex.")) {
    // Yandex puts longitude first too: ?pt=54.0129,46.9621 (the pin) or ?ll=… (the view centre).
    const yandex = pair(param(text, "pt")) ?? pair(param(text, "ll")) ?? pair(param(text, "whatshere[point]"));
    return yandex ? point(yandex[1], yandex[0]) : null;
  }

  if (host.includes("openstreetmap.")) {
    const mlat = param(text, "mlat");
    const mlon = param(text, "mlon");
    if (mlat && mlon) return point(Number(mlat), Number(mlon));
    const view = decoded.match(new RegExp(`#map=\\d+/(${NUM})/(${NUM})`));
    return view ? point(Number(view[1]), Number(view[2])) : null;
  }

  if (host.includes("google.") || host.startsWith("goo.gl")) {
    // The place's own pin (!3d…!4d…) beats the view centre (@lat,lng,zoom).
    const pin = decoded.match(new RegExp(`!3d(${NUM})!4d(${NUM})`));
    if (pin) return point(Number(pin[1]), Number(pin[2]));
    const query = pair(param(text, "q")) ?? pair(param(text, "query")) ?? pair(param(text, "ll"));
    if (query) return point(query[0], query[1]);
    const place = decoded.match(new RegExp(`/(?:place|search|dir)/(?:[^/]*/)?(${NUM}),\\s*(${NUM})`));
    if (place) return point(Number(place[1]), Number(place[2]));
    const view = decoded.match(new RegExp(`@(${NUM}),(${NUM})`));
    return view ? point(Number(view[1]), Number(view[2])) : null;
  }

  return null;
}

/** True for a short share link that has to be opened before a point can be read from it. */
export function isShortMapLink(input: string): boolean {
  const host = hostOf(input.trim());
  if (!host) return false;
  if (host === "maps.app.goo.gl" || host === "go.2gis.com") return true;
  if (host === "goo.gl") return /^https?:\/\/goo\.gl\/maps\//i.test(input.trim());
  return host.startsWith("yandex.") && /\/maps\/-\//.test(input);
}

/** The point as staff see it in the form: "46.9621483, 54.0129176". */
export function formatMapPoint(p: MapPoint): string {
  return `${p.lat}, ${p.lng}`;
}

/** The OpenStreetMap embed around the point, a few streets in each direction. */
export function osmEmbedUrl(p: MapPoint): string {
  const dLng = 0.02;
  const dLat = 0.012;
  const bbox = [p.lng - dLng, p.lat - dLat, p.lng + dLng, p.lat + dLat].map((n) => n.toFixed(4)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.lat},${p.lng}`;
}

/** A Google Maps link that opens on the point, or searches the address when there is no point. */
export function mapsLink(p: MapPoint | null, address: string | null): string | null {
  if (p) return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}
