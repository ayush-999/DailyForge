import { UAParser } from "ua-parser-js";

export type ParsedUA = {
  browser: string;
  os: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
};

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown" };

  const result = new UAParser(ua).getResult();

  const browser = [result.browser.name, result.browser.major]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const os = [result.os.name, result.os.version]
    .filter(Boolean)
    .join(" ") || "Unknown";

  const rawType = result.device.type;
  const device: ParsedUA["device"] =
    rawType === "mobile"
      ? "Mobile"
      : rawType === "tablet"
      ? "Tablet"
      : rawType
      ? "Unknown"
      : "Desktop";

  return { browser, os, device };
}
