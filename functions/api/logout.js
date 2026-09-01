// POST /api/logout -> সেশন কুকি মুছে দিয়ে লগ-আউট করা

import { clearSessionCookieHeader, jsonResponse } from "../_shared/auth-utils.js";

export async function onRequestPost() {
  return jsonResponse(
    { success: true },
    200,
    { "Set-Cookie": clearSessionCookieHeader() }
  );
}
