// ════════════════════════════════════════════════════════
//  Cloudflare Worker — Anthropic API Proxy
//  يحل مشكلة CORS عند استدعاء Anthropic API من المتصفح
// ════════════════════════════════════════════════════════
//
//  طريقة النشر:
//  1. اذهب إلى https://workers.cloudflare.com
//  2. سجّل دخول أو أنشئ حساباً مجانياً
//  3. اضغط "Create a Worker"
//  4. الصق هذا الكود بالكامل
//  5. اضغط "Save and Deploy"
//  6. انسخ رابط الـ Worker (مثال: https://my-proxy.USERNAME.workers.dev)
//  7. ضعه في متغير PROXY_URL في index.html
//
//  ملاحظة: الخطة المجانية = 100,000 طلب/يوم — أكثر من كافية
// ════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    // ── Handle CORS preflight ──────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ── Only allow POST ────────────────────────────────
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    try {
      // ── Read body from client ──────────────────────
      const body = await request.json();

      // ── Forward to Anthropic ──────────────────────
      // مفتاح API مخزّن في متغيرات البيئة (Secrets) — آمن 100%
      const apiKey = env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "API key not configured. Add ANTHROPIC_API_KEY as a secret." }),
          { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
        );
      }

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await anthropicRes.json();

      return new Response(JSON.stringify(data), {
        status: anthropicRes.status,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Proxy error: " + err.message }),
        { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }
  },
};

// ── CORS Headers ──────────────────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
