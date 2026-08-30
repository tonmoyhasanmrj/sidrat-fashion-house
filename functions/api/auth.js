// এই ফাইলটা /admin থেকে "Login with GitHub" চাপলে প্রথমে চালু হয়
// GitHub-এর অথোরাইজেশন পেজে পাঠিয়ে দেয়

export async function onRequestGet(context) {
  const clientId = context.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(
      "সেটআপ অসম্পূর্ণ: Cloudflare Pages-এ GITHUB_CLIENT_ID এনভায়রনমেন্ট ভ্যারিয়েবল বসানো হয়নি।",
      { status: 500 }
    );
  }

  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user`;
  return Response.redirect(authorizeUrl, 302);
}
