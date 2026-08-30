// GitHub লগইন সফল হওয়ার পর GitHub এই পেজে ফেরত পাঠায় (callback)
// এখানে অথোরাইজেশন কোডটাকে GitHub-এর কাছে পাঠিয়ে আসল access token নেওয়া হয়,
// তারপর সেটা পপআপ উইন্ডোর মাধ্যমে Decap CMS-কে জানিয়ে দেওয়া হয়

export async function onRequestGet(context) {
  const { request, env } = context;
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
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
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
              window.opener.postMessage(
                ${JSON.stringify(payload)},
                e.origin
              );
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
