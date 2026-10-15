export function parseLink(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid link.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an HTTP or HTTPS link.");
  return url;
}

export function youtubeVideo(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);
  const id =
    host === "youtu.be"
      ? path[0]
      : [
            "youtube.com",
            "www.youtube.com",
            "m.youtube.com",
            "youtube-nocookie.com",
            "www.youtube-nocookie.com",
          ].includes(host)
        ? path[0] === "watch"
          ? url.searchParams.get("v")
          : ["shorts", "embed", "live"].includes(path[0])
            ? path[1]
            : null
        : null;
  if (!id || id.length !== 11) return null;
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  return Array.from(id).every((char) => alphabet.includes(char)) ? id : null;
}

export function linkName(url: URL) {
  if (youtubeVideo(url)) return `YouTube · ${youtubeVideo(url)}`;
  return url.hostname + (url.pathname === "/" ? "" : url.pathname);
}
