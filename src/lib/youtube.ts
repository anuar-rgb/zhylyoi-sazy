/**
 * Turning what somebody pasted into a YouTube identifier.
 *
 * Client-safe: the admin form validates as you type, the page builds the embed.
 *
 * The identifier is extracted once, when the video is saved, rather than parsed on
 * every render. People paste whatever the browser gave them — a share link, the
 * address bar, a link with a start time, a playlist, the mobile site — and all of
 * those carry the same eleven characters. Storing those characters means the page
 * never has to care which form it came from.
 */

/** YouTube identifiers are eleven characters of this alphabet. */
const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The identifier inside a pasted link, or null if there is none.
 *
 * Accepts a bare identifier too, because somebody who already knows the format
 * will type just that.
 */
export function youtubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (ID.test(value)) return value;

  let url: URL;
  try {
    // Prefixed when the scheme is missing: people paste "youtu.be/..." without it.
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    const candidate = url.pathname.slice(1).split("/")[0] ?? "";
    return ID.test(candidate) ? candidate : null;
  }

  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;

  const v = url.searchParams.get("v");
  if (v && ID.test(v)) return v;

  // /embed/ID, /shorts/ID, /live/ID, /v/ID — the identifier is the second segment.
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && ["embed", "shorts", "live", "v"].includes(segments[0])) {
    const candidate = segments[1];
    return ID.test(candidate) ? candidate : null;
  }

  return null;
}

/**
 * The player address for an identifier.
 *
 * nocookie, because a visitor reading about a folk ensemble has not asked to be
 * tracked by a video host. The player behaves the same either way.
 */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** The thumbnail YouTube generates. hqdefault exists for every video, unlike maxres. */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Where to send somebody who wants to open the video on YouTube itself. */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
