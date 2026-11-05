const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function isLocalName(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function isLocalRequest(host: string | null, origin: string | null): boolean {
  if (!host || !isLocalName(`http://${host}`)) return false;
  return !origin || isLocalName(origin);
}
