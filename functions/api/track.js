// GET /api/track?orderId=..&phone=..  -> লগইন ছাড়াই শুধু অর্ডার আইডি + ফোন নম্বর
// মিলিয়ে একটামাত্র অর্ডারের স্ট্যাটাস দেখানো হয়

import { normalizePhone, jsonResponse } from "../_shared/auth-utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const orderId = (url.searchParams.get("orderId") || "").trim().toUpperCase();
  const phone = normalizePhone(url.searchParams.get("phone"));

  if (!orderId || !phone) {
    return jsonResponse({ error: "অর্ডার আইডি ও ফোন নম্বর দিন" }, 400);
  }

  const order = await env.DB.prepare(
    `SELECT id, created_at, items, total, via, payment_method, status, name, address
     FROM orders WHERE id = ? AND phone = ?`
  )
    .bind(orderId, phone)
    .first();

  if (!order) {
    return jsonResponse(
      { error: "এই তথ্য দিয়ে কোনো অর্ডার পাওয়া যায়নি। অর্ডার আইডি ও ফোন নম্বর ঠিকভাবে যাচাই করুন।" },
      404
    );
  }

  return jsonResponse({ order });
}
