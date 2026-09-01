// POST /api/login  -> ফোন নম্বর + পাসওয়ার্ড দিয়ে লগইন, সেশন কুকি সেট করে

import {
  verifyPassword,
  createSessionToken,
  sessionCookieHeader,
  normalizePhone,
  jsonResponse,
} from "../_shared/auth-utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SESSION_SECRET) {
    return jsonResponse(
      { error: "সেটআপ অসম্পূর্ণ: Cloudflare Pages-এ SESSION_SECRET এনভায়রনমেন্ট ভ্যারিয়েবল বসানো হয়নি।" },
      500
    );
  }

  try {
    const body = await request.json();
    const phone = normalizePhone(body.phone);
    const password = (body.password || "").toString();

    if (!phone || !password) {
      return jsonResponse({ error: "ফোন নম্বর ও পাসওয়ার্ড দিন" }, 400);
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?")
      .bind(phone)
      .first();

    if (!user) {
      return jsonResponse({ error: "ফোন নম্বর অথবা পাসওয়ার্ড ভুল" }, 401);
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return jsonResponse({ error: "ফোন নম্বর অথবা পাসওয়ার্ড ভুল" }, 401);
    }

    const token = await createSessionToken(
      {
        uid: user.id,
        phone: user.phone,
        name: user.name,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
      env.SESSION_SECRET
    );

    return jsonResponse(
      { success: true, user: { id: user.id, name: user.name, phone: user.phone } },
      200,
      { "Set-Cookie": sessionCookieHeader(token, 30 * 24 * 60 * 60) }
    );
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}
