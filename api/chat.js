// Vercel serverless function: POST /api/chat
// Proxies requests to the Anthropic Messages API using a server-side-only
// API key (ANTHROPIC_API_KEY). The browser never sees this key.
//
// Privacy: this function does not persist user messages. Request bodies are
// never logged. Responses are field-filtered to content only.

/** Strip anything that looks like a credential before returning to clients. */
function sanitizePublicError(message, fallback = "Upstream API error") {
  const text = String(message || fallback)
    .replace(/sk-ant-[A-Za-z0-9_-]+/gi, "[redacted]")
    .replace(/sk-[A-Za-z0-9]{20,}/gi, "[redacted]")
    .replace(/ghp_[A-Za-z0-9]+/gi, "[redacted]")
    .replace(/github_pat_[A-Za-z0-9_]+/gi, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]");
  return text.slice(0, 300);
}

const MAX_MESSAGES = 24;
const MAX_CONTENT_CHARS = 4000;
const MAX_SYSTEM_CHARS = 20000;

/** Keep only role + truncated content — drop any unexpected client fields. */
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-MAX_MESSAGES).map((m) => {
    const role = m?.role === "assistant" ? "assistant" : "user";
    const content = String(m?.content ?? "").slice(0, MAX_CONTENT_CHARS);
    return { role, content };
  }).filter((m) => m.content.length > 0);
}

/** Client only needs assistant text blocks — strip ids, usage, model, etc. */
function filterChatResponse(data) {
  const content = Array.isArray(data?.content)
    ? data.content
        .filter((b) => b && b.type === "text" && typeof b.text === "string")
        .map((b) => ({ type: "text", text: b.text }))
    : [];
  return { content };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    });
  }

  const { system, messages, max_tokens } = req.body || {};
  const safeMessages = sanitizeMessages(messages);
  if (safeMessages.length === 0) {
    return res.status(400).json({ error: "Request must include a non-empty 'messages' array." });
  }

  const safeSystem =
    typeof system === "string" ? system.slice(0, MAX_SYSTEM_CHARS) : undefined;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: Math.min(Number(max_tokens) || 800, 2000),
        system: safeSystem,
        messages: safeMessages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: sanitizePublicError(data?.error?.message, "Upstream API error"),
      });
    }
    return res.status(200).json(filterChatResponse(data));
  } catch (err) {
    // Never log request bodies or message content.
    console.error("[api/chat] upstream failure:", sanitizePublicError(err?.message, "network error"));
    return res.status(502).json({
      error: "Failed to reach Claude API: " + sanitizePublicError(err?.message, "network error"),
    });
  }
}
