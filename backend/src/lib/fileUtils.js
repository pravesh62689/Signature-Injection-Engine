import crypto from "crypto";

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function base64ToBuffer(input) {
  if (!input) return null;
  const str = String(input);
  const comma = str.indexOf(",");
  const raw = comma !== -1 ? str.slice(comma + 1) : str;
  return Buffer.from(raw, "base64");
}

export function sniffImageType(buf) {
  if (!buf || buf.length < 12) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "png";
  return "png";
}
