// POST /api/register  -> নতুন কাস্টমার একাউন্ট তৈরি করা (ফোন নম্বর + পাসওয়ার্ড)
// সফল হলে সাথে সাথে লগইন করিয়ে সেশন কুকি বসিয়ে দেয়

import {
  hashPassword,
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
    const name = (body.name || "").toString().trim();
    const phone = normalizePhone(body.phone);
    const password = (body.password || "").toString();

    if (!name || !phone || !password) {
      return jsonResponse({ error: "নাম, ফোন নম্বর ও পাসওয়ার্ড আবশ্যক" }, 400);
    }
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return jsonResponse(
        { error: "সঠিক ১১ ডিজিটের বাংলাদেশি ফোন নম্বর দিন (যেমন: 01712345678)" },
        400
      );
    }
    if (password.length < 6) {
      return jsonResponse({ error: "পাসওয়ার্ড অন্তত ৬ ক্যারেক্টার হতে হবে" }, 400);
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE phone = ?")
      .bind(phone)
      .first();
    if (existing) {
      return jsonResponse(
        { error: "এই ফোন নম্বর দিয়ে আগে থেকেই একাউন্ট খোলা আছে। লগইন করুন।" },
        409
      );
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO users (id, phone, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, phone, name, passwordHash, createdAt)
      .run();

    const token = await createSessionToken(
      { uid: id, phone, name, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 },
      env.SESSION_SECRET
    );

    return jsonResponse(
      { success: true, user: { id, name, phone } },
      200,
      { "Set-Cookie": sessionCookieHeader(token, 30 * 24 * 60 * 60) }
    );
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}
