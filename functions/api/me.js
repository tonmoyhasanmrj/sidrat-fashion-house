// GET /api/me -> বর্তমানে লগইন করা থাকলে ইউজারের তথ্য ও তার নিজের অর্ডারগুলো দেখায়
// লগইন করা না থাকলে { loggedIn: false } ফেরত দেয়

import { verifySessionToken, getCookie, jsonResponse } from "../_shared/auth-utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.SESSION_SECRET) {
    return jsonResponse({ loggedIn: false });
  }

  const token = getCookie(request, "sf_session");
  const payload = token ? await verifySessionToken(token, env.SESSION_SECRET) : null;

  if (!payload) {
    return jsonResponse({ loggedIn: false });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, created_at, items, total, via, payment_method, status
     FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
  )
    .bind(payload.uid)
    .all();

  return jsonResponse({
    loggedIn: true,
    user: { id: payload.uid, name: payload.name, phone: payload.phone },
    orders: results || [],
  });
}
