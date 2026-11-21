import { authorized } from "../lib/auth.js";
import { loadState, saveState } from "../lib/store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!authorized(req, res)) return;
  try {
    if (req.method === "GET") {
      return res.status(200).json(await loadState());
    }

    if (req.method === "PUT") {
      const { state, updated } = req.body || {};
      if (typeof state !== "string" || state.length > 900_000) return res.status(400).json({ code: "bad_request" });
      try { JSON.parse(state); } catch { return res.status(400).json({ code: "bad_request" }); }
      await saveState(state, Number(updated) || Date.now());
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ code: "method_not_allowed" });
  } catch (e) {
    console.error("state error", e);
    // Behind the access key, so safe to show: tells you which storage step failed.
    return res.status(500).json({ code: "server", detail: String((e && (e.name + ": " + e.message)) || e).slice(0, 300) });
  }
}
