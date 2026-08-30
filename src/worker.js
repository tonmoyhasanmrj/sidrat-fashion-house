export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth") {
      return handleAuth(env);
    }

    if (url.pathname === "/api/callback") {
      return handleCallback(request, env);
    }

    // অ্যাডমিন প্যানেল — সরাসরি নির্দিষ্ট ফাইলে পাঠানো হচ্ছে (index.html নাম-সংঘর্ষ এড়াতে)
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      const panelUrl = new URL(request.url);
      panelUrl.pathname = "/admin/panel.html";
      return env.ASSETS.fetch(new Request(panelUrl, request));
    }

    // অন্য সব রিকোয়েস্ট (index.html, ছবি, config.yml ইত্যাদি) —
    // স্ট্যাটিক ফাইল হিসেবে সরাসরি দেখাবে (run_worker_first চালু থাকায় এই কোডটা সবসময় আগে চলে)
    return env.ASSETS.fetch(request);
  }
};

// ধাপ ১: কাস্টমারকে/অ্যাডমিনকে GitHub-এর লগইন পেজে পাঠানো
async function handleAuth(env) {
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(
      "সেটআপ অসম্পূর্ণ: GITHUB_CLIENT_ID এনভায়রনমেন্ট ভ্যারিয়েবল বসানো হয়নি।",
      { status: 500 }
    );
  }

  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user`;
  return Response.redirect(authorizeUrl, 302);
}

// ধাপ ২: GitHub থেকে ফেরত আসা কোড দিয়ে আসল access token নেওয়া এবং Decap CMS-কে জানানো
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("অথোরাইজেশন কোড পাওয়া যায়নি।", { status: 400 });
  }

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      return htmlResponse(renderMessage("error", tokenData));
    }

    return htmlResponse(
      renderMessage("success", { token: tokenData.access_token, provider: "github" })
    );
  } catch (err) {
    return htmlResponse(renderMessage("error", { message: String(err) }));
  }
}

function renderMessage(type, data) {
  const payload = `authorization:github:${type}:${JSON.stringify(data)}`;
  return `
    <!doctype html>
    <html>
      <body>
        <script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage(${JSON.stringify(payload)}, e.origin);
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })();
        </script>
      </body>
    </html>
  `;
}

function htmlResponse(html) {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
