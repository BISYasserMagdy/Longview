import { authorized } from "../lib/auth.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

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

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ code: "method_not_allowed" }); }
  if (!authorized(req, res)) return;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ code: "server_config" });

  const messages = cleanMessages(req.body && req.body.messages);
  if (!messages) return res.status(400).json({ code: "bad_request" });
  const stream = !!(req.body && req.body.stream);

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1600, messages, stream })
    });
  } catch (e) {
    console.error("anthropic fetch failed", e);
    return res.status(502).json({ code: "upstream" });
  }

  if (!upstream.ok) {
    console.error("anthropic error", upstream.status, await upstream.text().catch(() => ""));
    if (upstream.status === 429) return res.status(429).json({ code: "rate_limited" });
    if (upstream.status === 401 || upstream.status === 403) return res.status(502).json({ code: "server_config" });
    return res.status(502).json({ code: "upstream" });
  }

  if (!stream) {
    const j = await upstream.json();
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text });
  }

  // Streaming: forward only the text deltas as plain text chunks.
  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  const reader = upstream.body.getReader();
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
        try {
          const ev = JSON.parse(line.slice(5));
          if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") res.write(ev.delta.text);
        } catch { /* ignore keep-alives */ }
      }
    }
  } catch (e) {
    console.error("stream error", e);
  }
  res.end();
}
