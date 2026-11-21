import { authorized } from "../lib/auth.js";

// Provider is chosen by environment variables:
//  - AI_API_KEY + AI_BASE_URL + AI_MODEL  -> any OpenAI-compatible API (Gemini, Groq, OpenRouter, ...)
//  - otherwise ANTHROPIC_API_KEY          -> Anthropic
const AI_KEY = process.env.AI_API_KEY;
const AI_BASE = (process.env.AI_BASE_URL || "").replace(/\/+$/, "");
const AI_MODEL = process.env.AI_MODEL;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

function cleanMessages(input) {
  if (!Array.isArray(input) || !input.length || input.length > 40) return null;
  const out = [];
  let total = 0;
  for (const m of input) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    total += m.content.length;
    out.push({ role: m.role, content: m.content });
  }
  if (total > 80_000 || out[out.length - 1].role !== "user") return null;
  return out;
}

function upstream(messages, stream) {
  if (AI_KEY) {
    if (!AI_BASE || !AI_MODEL) return null;
    return fetch(AI_BASE + "/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + AI_KEY, "content-type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages, max_tokens: 3000, stream })
    });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 1600, messages, stream })
    });
  }
  return null;
}

const fullText = j => AI_KEY
  ? (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ""
  : (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");

function deltaText(ev) {
  if (AI_KEY) return (ev.choices && ev.choices[0] && ev.choices[0].delta && ev.choices[0].delta.content) || "";
  return ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta" ? ev.delta.text : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ code: "method_not_allowed" }); }
  if (!authorized(req, res)) return;

  const messages = cleanMessages(req.body && req.body.messages);
  if (!messages) return res.status(400).json({ code: "bad_request" });
  const stream = !!(req.body && req.body.stream);

  let up;
  try {
    const p = upstream(messages, stream);
    if (!p) return res.status(500).json({ code: "server_config" });
    up = await p;
  } catch (e) {
    console.error("ai fetch failed", e);
    return res.status(502).json({ code: "upstream", detail: String((e && e.message) || e).slice(0, 200) });
  }

  if (!up.ok) {
    const body = await up.text().catch(() => "");
    console.error("ai provider error", up.status, body);
    let detail = "";
    try { const j = JSON.parse(body); const e = Array.isArray(j) ? j[0] : j; detail = (e && e.error && (e.error.message || e.error.status)) || ""; } catch { detail = body.slice(0, 200); }
    detail = String(detail).replace(/(key|token)[=:\s]+\S+/gi, "$1 ***").slice(0, 240);
    if (up.status === 429) return res.status(429).json({ code: "rate_limited" });
    if (up.status === 401 || up.status === 403) return res.status(502).json({ code: "server_config" });
    return res.status(502).json({ code: "upstream", status: up.status, detail });
  }

  if (!stream) {
    return res.status(200).json({ text: fullText(await up.json()) });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  const reader = up.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try { const t = deltaText(JSON.parse(data)); if (t) res.write(t); } catch { /* ignore keep-alives */ }
      }
    }
  } catch (e) {
    console.error("stream error", e);
  }
  res.end();
}
