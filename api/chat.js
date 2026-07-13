// Vercel serverless function: POST /api/chat
// Proxies requests to the Anthropic Messages API using a server-side-only
// API key (ANTHROPIC_API_KEY, set in Vercel Project Settings → Environment
// Variables). The browser never sees this key — it only ever talks to this
// same-origin endpoint, which is also why there's no CORS issue: the
// frontend and this function share the same domain.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    });
  }

  const { system, messages, max_tokens } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Request must include a non-empty 'messages' array." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5", // current-generation Sonnet — valid for the public Anthropic API
        max_tokens: Math.min(Number(max_tokens) || 800, 2000), // hard cap, protects against runaway cost
        system: typeof system === "string" ? system.slice(0, 20000) : undefined,
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || "Upstream API error" });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach Claude API: " + err.message });
  }
}
