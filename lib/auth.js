import { timingSafeEqual } from "node:crypto";

// Single-user app: every API call must carry the APP_KEY you set in Vercel.
export function authorized(req, res) {
  const expected = process.env.APP_KEY || "";
  const got = String(req.headers["x-app-key"] || "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  const ok = expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    res.status(401).json({ code: "unauthorized" });
    return false;
  }
  return true;
}
