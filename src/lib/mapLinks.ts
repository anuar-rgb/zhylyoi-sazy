import "server-only";
import { isShortMapLink, parseMapPoint, type MapPoint } from "@/lib/mapPoint";

/**
 * Hosts a short map link may redirect through. Anything else stops the walk, so a pasted link cannot
 * make the server fetch an arbitrary address.
 */
const MAP_HOSTS = [
  /^maps\.app\.goo\.gl$/,
  /^goo\.gl$/,
  /^(www\.|maps\.)?google\.[a-z.]+$/,
  /^(go\.)?2gis\.[a-z]+$/,
  /^(www\.)?yandex\.[a-z]+$/,
];

function allowed(url: string): boolean {
  const match = url.match(/^https:\/\/([^/?#:]+)(?:[/?#]|$)/i);
  return Boolean(match && MAP_HOSTS.some((host) => host.test(match[1].toLowerCase())));
}

/**
 * The point behind what staff pasted: read directly from a full link or coordinates, or, for a short
 * share link, from the address it redirects to. Null when no point can be found.
 */
export async function resolveMapPoint(input: string): Promise<MapPoint | null> {
  const direct = parseMapPoint(input);
  if (direct || !isShortMapLink(input)) return direct;

  let url = input.trim();
  for (let hop = 0; hop < 5 && allowed(url); hop++) {
    let response: Response;
    try {
      response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    } catch {
      return null;
    }
    const next = response.headers.get("location");
    if (!next) return null;
    url = new URL(next, url).toString();
    const found = parseMapPoint(url);
    if (found) return found;
  }
  return null;
}
