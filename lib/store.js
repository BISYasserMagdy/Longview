// Storage in Upstash Redis over its REST API (free plan available, no driver needed).
// Works with the variables Vercel's Upstash integration adds (KV_REST_API_*)
// or with the ones from upstash.com (UPSTASH_REDIS_REST_*).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "longview:state"; // one value: the whole app state for the one user

async function cmd(args) {
  if (!URL_ || !TOKEN) throw new Error("Redis REST URL/token are not set");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("Redis: " + (j.error || r.status));
  return j.result;
}

export async function loadState() {
  const raw = await cmd(["GET", KEY]);
  if (!raw) return { state: null, updated: 0 };
  const o = JSON.parse(raw);
  return { state: o.state, updated: o.updated || 0 };
}

export async function saveState(state, updated) {
  await cmd(["SET", KEY, JSON.stringify({ state, updated })]);
}
