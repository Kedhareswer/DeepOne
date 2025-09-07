export function requireApiKey(req: Request): Response | null {
  const allowed = (process.env.API_KEYS || "").split(/[,\s]+/).filter(Boolean);
  if (allowed.length === 0) return null; // disabled

  const header = req.headers.get("x-api-key") || req.headers.get("X-API-Key");
  if (!header || !allowed.includes(header)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
