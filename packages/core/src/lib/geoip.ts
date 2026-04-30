export type GeoLocation = {
  city: string;
  region: string;
  country: string;
  display: string;
};

const LOCAL_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function isPrivateIP(ip: string): boolean {
  if (LOCAL_IPS.has(ip)) return true;
  // Private ranges: 10.x, 172.16–31.x, 192.168.x
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export function lookupGeoIP(ip: string | null | undefined): GeoLocation | null {
  if (!ip) return null;

  if (isPrivateIP(ip)) {
    return { city: "Local Network", region: "", country: "", display: "Local Network" };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoip = require("geoip-lite") as typeof import("geoip-lite");
    const geo = geoip.lookup(ip);
    if (!geo) return null;
    const parts = [geo.city, geo.region, geo.country].filter(Boolean);
    return {
      city: geo.city || "",
      region: geo.region || "",
      country: geo.country || "",
      display: parts.join(", "),
    };
  } catch {
    return null;
  }
}
