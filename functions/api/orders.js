// অর্ডার সংক্রান্ত সব কাজ এখানে হয়:
// POST   /api/orders        -> নতুন অর্ডার সেভ করা (ওয়েবসাইট থেকে)
// GET    /api/orders?key=.. -> সব অর্ডার দেখা (শুধু সঠিক key দিলে)
// PATCH  /api/orders?key=.. -> কোনো অর্ডারের স্ট্যাটাস বদলানো
//
// কাস্টমার লগইন করা অবস্থায় অর্ডার করলে, সেশন কুকি দেখে সেই অর্ডারটা
// স্বয়ংক্রিয়ভাবে তার একাউন্টের সাথে যুক্ত (user_id) করে দেওয়া হয়।

import { verifySessionToken, getCookie } from "../_shared/auth-utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { name, phone, address, items, total, via, paymentMethod, trxId } = body;

    if (!name || !phone || !address || !items || !items.length) {
      return json({ error: "নাম, ফোন, ঠিকানা ও প্রোডাক্ট তথ্য আবশ্যক" }, 400);
    }

    // লগইন করা থাকলে সেশন থেকে user_id বের করা (না থাকলে null, গেস্ট চেকআউট)
    let userId = null;
    if (env.SESSION_SECRET) {
      const token = getCookie(request, "sf_session");
      const payload = token ? await verifySessionToken(token, env.SESSION_SECRET) : null;
      if (payload && payload.uid) userId = payload.uid;
    }

    const id = crypto.randomUUID().slice(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO orders (id, created_at, name, phone, address, items, total, via, payment_method, trx_id, status, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'নতুন', ?)`
    )
      .bind(
        id,
        createdAt,
        name,
        phone,
        address,
        JSON.stringify(items),
        total || 0,
        via || "",
        paymentMethod || "",
        trxId || "",
        userId
      )
      .run();

    return json({ success: true, orderId: id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.ORDERS_ADMIN_KEY || key !== env.ORDERS_ADMIN_KEY) {
    return json({ error: "সঠিক key দেওয়া হয়নি" }, 401);
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM orders ORDER BY created_at DESC LIMIT 300"
  ).all();

  return json({ orders: results });
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.ORDERS_ADMIN_KEY || key !== env.ORDERS_ADMIN_KEY) {
    return json({ error: "সঠিক key দেওয়া হয়নি" }, 401);
  }

  try {
    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) {
      return json({ error: "id ও status আবশ্যক" }, 400);
    }

    await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
