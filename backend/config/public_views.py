import html
import json

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404

from dining_groups.models import DiningGroup


PICK_SUMN_APP_ID = "VXU92LLBQA.com.picksumn.app"


def _page(*, title, body):
    safe_title = html.escape(title)

    return HttpResponse(
        f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <meta name="theme-color" content="#FFF9F2">
  <title>{safe_title}</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #FFF9F2;
      color: #07111F;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }}
    main {{
      width: min(100%, 520px);
      padding: 32px 24px;
      border: 1px solid #ECEDEF;
      border-radius: 28px;
      background: #FFFFFF;
      text-align: center;
      box-shadow:
        0 18px 50px
        rgba(7, 17, 31, 0.08);
    }}
    .brand {{
      margin: 0 0 8px;
      color: #F3344A;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }}
    h1 {{
      margin: 0;
      font-size: clamp(30px, 7vw, 44px);
      line-height: 1.05;
    }}
    p {{
      margin: 14px auto 0;
      max-width: 420px;
      color: #606773;
      font-size: 16px;
      line-height: 1.55;
    }}
    .code {{
      display: inline-block;
      margin-top: 22px;
      padding: 11px 16px;
      border-radius: 14px;
      background: #FFF0F2;
      color: #F3344A;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 3px;
    }}
    .actions {{
      display: grid;
      gap: 10px;
      margin-top: 26px;
    }}
    a,
    button {{
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 18px;
      border: 0;
      border-radius: 16px;
      font: inherit;
      font-weight: 900;
      text-decoration: none;
      cursor: pointer;
    }}
    .primary {{
      background: #F3344A;
      color: #FFFFFF;
    }}
    .secondary {{
      border: 1.5px solid #D9DDE3;
      background: #FFFFFF;
      color: #07111F;
    }}
    .small {{
      margin-top: 20px;
      color: #9298A2;
      font-size: 12px;
    }}
  </style>
</head>
<body>
  <main>
    {body}
  </main>
</body>
</html>"""
    )


def home(request):
    return _page(
        title="Pick Sum'N",
        body="""
<p class="brand">PICK SUM'N</p>
<h1>Stop arguing.<br>Start eating.</h1>
<p>
  Pick Sum'N helps friends, families, and groups
  decide where to eat together.
</p>
""",
    )


def group_invite(request, join_code):
    clean_code = str(join_code).strip().upper()

    group = get_object_or_404(
        DiningGroup,
        join_code=clean_code,
        is_active=True,
    )

    group_name = html.escape(group.name)
    safe_code = html.escape(clean_code)

    ios_url = str(settings.IOS_APP_STORE_URL or "").strip()
    android_url = str(settings.ANDROID_PLAY_STORE_URL or "").strip()

    store_actions = []

    if ios_url:
        store_actions.append(
            '<a class="primary" '
            f'href="{html.escape(ios_url)}">'
            "Download on the App Store"
            "</a>"
        )

    if android_url:
        store_actions.append(
            '<a class="secondary" '
            f'href="{html.escape(android_url)}">'
            "Get it on Google Play"
            "</a>"
        )

    if not store_actions:
        store_actions.append(
            '<button class="primary" disabled>'
            "Pick Sum'N is launching soon"
            "</button>"
        )

    custom_scheme = (
        "picksumn://join-group"
        f"?code={clean_code}"
    )

    body = f"""
<p class="brand">PICK SUM'N GROUP INVITE</p>
<h1>Join {group_name}</h1>
<p>
  You were invited to a Pick Sum'N group.
  If Pick Sum'N is already installed, this link
  should open the app automatically.
</p>

<div class="code">{safe_code}</div>

<div class="actions">
  <a
    class="secondary"
    href="{html.escape(custom_scheme)}"
  >
    Open Pick Sum'N
  </a>

  {''.join(store_actions)}

  <button
    class="secondary"
    id="copy-code"
    type="button"
  >
    Copy join code
  </button>
</div>

<p class="small">
  Keep this code until you have joined the group.
  If you install Pick Sum'N after opening this page,
  enter or paste the code in the app.
</p>

<script>
  const button =
    document.getElementById("copy-code");

  button.addEventListener(
    "click",
    async () => {{
      try {{
        await navigator.clipboard.writeText(
          {json.dumps(clean_code)}
        );

        button.textContent =
          "Join code copied";
      }} catch (error) {{
        button.textContent =
          "Code: {safe_code}";
      }}
    }}
  );
</script>
"""

    return _page(
        title=f"Join {group.name} - Pick Sum'N",
        body=body,
    )


def apple_app_site_association(request):
    return JsonResponse(
        {
            "applinks": {
                "details": [
                    {
                        "appIDs": [
                            PICK_SUMN_APP_ID,
                        ],
                        "components": [
                            {
                                "/": "/join/*",
                                "comment": (
                                    "Pick Sum'N "
                                    "group invites"
                                ),
                            },
                        ],
                    },
                ],
            },
        },
        json_dumps_params={
            "separators": (
                ",",
                ":",
            ),
        },
    )


def android_asset_links(request):
    fingerprints = [
        value.strip()
        for value in (
            settings
            .ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS
        )
        if value.strip()
    ]

    payload = []

    if fingerprints:
        payload.append(
            {
                "relation": [
                    (
                        "delegate_permission/"
                        "common.handle_all_urls"
                    ),
                ],
                "target": {
                    "namespace": "android_app",
                    "package_name": "com.picksumn.app",
                    "sha256_cert_fingerprints": fingerprints,
                },
            }
        )

    return JsonResponse(
        payload,
        safe=False,
    )
