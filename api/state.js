import { authorized } from "../lib/auth.js";
import { stateCollection } from "../lib/db.js";

const DOC_ID = "main"; // one document: the whole app state for the one user

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!authorized(req, res)) return;
  try {
    const col = await stateCollection();

    if (req.method === "GET") {
      const doc = await col.findOne({ _id: DOC_ID });
      return res.status(200).json({ state: doc ? doc.state : null, updated: doc ? doc.updated : 0 });
    }

    if (req.method === "PUT") {
      const { state, updated } = req.body || {};
      if (typeof state !== "string" || state.length > 4_000_000) return res.status(400).json({ code: "bad_request" });
      try { JSON.parse(state); } catch { return res.status(400).json({ code: "bad_request" }); }
      await col.replaceOne(
        { _id: DOC_ID },
        { _id: DOC_ID, state, updated: Number(updated) || Date.now(), savedAt: new Date() },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ code: "method_not_allowed" });
  } catch (e) {
    console.error("state error", e);
    return res.status(500).json({ code: "server" });
  }
}
