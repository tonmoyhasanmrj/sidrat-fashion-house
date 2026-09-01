// কাস্টমার লগইন সিস্টেমের জন্য শেয়ার্ড হেল্পার ফাংশন
// - পাসওয়ার্ড হ্যাশ করা ও যাচাই করা (PBKDF2, Web Crypto)
// - সেশন টোকেন তৈরি ও যাচাই করা (HMAC-SHA256 দিয়ে সাইন করা)
// - কুকি পড়া/লেখা
//
// নোট: এই ফাইলটার নাম "_shared" ফোল্ডারে রাখা হয়েছে বলে Cloudflare Pages
// এটাকে আলাদা /api রুট হিসেবে ধরবে না, শুধু অন্য ফাংশনগুলো এটা import করবে।

function b64urlEncode(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pbkdf2(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

// "salt:hash" ফরম্যাটে পাসওয়ার্ড হ্যাশ তৈরি করে, DB-তে এটাই সেভ হবে
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `${b64urlEncode(salt)}:${b64urlEncode(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = (stored || "").split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = b64urlDecode(saltB64);
  const expected = b64urlDecode(hashB64);
  const actual = await pbkdf2(password, salt);
  if (actual.length !== expected.length) return false;
  // টাইমিং অ্যাটাক এড়াতে constant-time তুলনা
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

// লগইন সেশনের জন্য সাইন করা টোকেন তৈরি করে: base64(payload).signature
export async function createSessionToken(payload, secret) {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(body, secret);
  return `${body}.${sig}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expectedSig = await hmacSign(body, secret);
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function sessionCookieHeader(token, maxAgeSeconds) {
  return `sf_session=${encodeURIComponent(
    token
  )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookieHeader() {
  return `sf_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function normalizePhone(p) {
  return (p || "").toString().trim().replace(/[\s-]/g, "");
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
