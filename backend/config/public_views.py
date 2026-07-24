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

  <meta
    name="theme-color"
    content="#FFF9F2"
  >

  <title>{safe_title}</title>

  <style>
    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      min-height: 100vh;
      background: #FFF9F2;
      color: #07111F;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }}

    .page {{
      width: min(100%, 760px);
      margin: 0 auto;
      padding: 28px 20px 60px;
    }}

    .nav {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
    }}

    .logo {{
      color: #F3344A;
      font-size: 17px;
      font-weight: 900;
      text-decoration: none;
      letter-spacing: 0.5px;
    }}

    .nav-links {{
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }}

    .nav-links a {{
      color: #606773;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
    }}

    main {{
      padding: 32px 26px;
      border: 1px solid #ECEDEF;
      border-radius: 28px;
      background: #FFFFFF;
      box-shadow:
        0 18px 50px
        rgba(7, 17, 31, 0.08);
    }}

    .brand {{
      margin: 0 0 8px;
      color: #F3344A;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.5px;
    }}

    h1 {{
      margin: 0;
      font-size: clamp(32px, 7vw, 46px);
      line-height: 1.05;
    }}

    h2 {{
      margin: 30px 0 8px;
      font-size: 21px;
      line-height: 1.25;
    }}

    p,
    li {{
      color: #606773;
      font-size: 15px;
      line-height: 1.65;
    }}

    p {{
      margin: 12px 0 0;
    }}

    ul {{
      margin: 10px 0 0;
      padding-left: 22px;
    }}

    li {{
      margin-bottom: 7px;
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

    a.button,
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

    .updated {{
      margin-top: 10px;
      color: #9298A2;
      font-size: 13px;
      font-weight: 700;
    }}

    .contact-box {{
      margin-top: 24px;
      padding: 20px;
      border-radius: 18px;
      background: #FFF9F2;
    }}

    .contact-box h2 {{
      margin-top: 0;
    }}

    .contact-box a {{
      color: #F3344A;
      font-weight: 900;
    }}

    footer {{
      padding-top: 24px;
      color: #9298A2;
      font-size: 12px;
      text-align: center;
    }}

    @media (max-width: 560px) {{
      .nav {{
        align-items: flex-start;
        flex-direction: column;
      }}

      main {{
        padding: 26px 20px;
      }}
    }}
  </style>
</head>

<body>
  <div class="page">
    <nav class="nav">
      <a
        class="logo"
        href="/"
      >
        Pick Sum'N
      </a>

      <div class="nav-links">
        <a href="/privacy">
          Privacy
        </a>

        <a href="/terms">
          Terms
        </a>

        <a href="/support">
          Support
        </a>
      </div>
    </nav>

    <main>
      {body}
    </main>

    <footer>
      © 2026 Pick Sum'N
    </footer>
  </div>
</body>
</html>"""
    )


def home(request):
    return _page(
        title="Pick Sum'N",
        body="""
<p class="brand">PICK SUM'N</p>

<h1>
  Stop arguing.<br>
  Start eating.
</h1>

<p>
  Pick Sum'N helps friends, families,
  couples, and groups decide where to eat
  together.
</p>

<p>
  Create your taste profile, connect with
  people you eat with, and let Pick Sum'N
  find restaurant choices that work for
  everyone.
</p>

<div class="actions">
  <a
    class="button primary"
    href="/support"
  >
    Get Support
  </a>
</div>
""",
    )


def privacy_policy(request):
    return _page(
        title="Privacy Policy - Pick Sum'N",
        body="""
<p class="brand">PICK SUM'N</p>

<h1>Privacy Policy</h1>

<p class="updated">
  Last updated: July 24, 2026
</p>

<p>
  Pick Sum'N respects your privacy.
  This Privacy Policy explains the types
  of information we may collect when you
  use Pick Sum'N, why we use that
  information, and the choices available
  to you.
</p>

<h2>Information You Provide</h2>

<p>
  When you create or use a Pick Sum'N
  account, you may provide information
  including:
</p>

<ul>
  <li>
    Your name, display name, email
    address, and account information.
  </li>

  <li>
    Profile and group photographs.
  </li>

  <li>
    Food preferences, cuisines,
    dislikes, dietary preferences,
    restaurant preferences, and dining
    preferences.
  </li>

  <li>
    Information associated with groups,
    friends, invitations, and other
    people you choose to connect with.
  </li>

  <li>
    Feedback or support information you
    send to us.
  </li>
</ul>

<h2>Location Information</h2>

<p>
  Pick Sum'N may request access to your
  device location so that the app can
  search for restaurants near you and
  provide location-based restaurant
  recommendations.
</p>

<p>
  Location access is used to provide
  features that depend on your current
  area. You may manage location
  permissions through your device
  settings.
</p>

<h2>Restaurant and Preference Data</h2>

<p>
  Pick Sum'N uses information about your
  food and dining preferences to generate
  restaurant recommendations and improve
  group matching.
</p>

<p>
  Information about restaurant
  selections, saved restaurants, recent
  picks, votes, or group decisions may
  also be stored to provide app features.
</p>

<h2>Social and Group Features</h2>

<p>
  If you use Pick Sum'N with friends,
  family members, or groups, certain
  profile information may be visible to
  other users you choose to connect or
  interact with.
</p>

<p>
  Group members may be able to see
  information such as your name, profile
  image, group membership, votes, and
  other information necessary for group
  features.
</p>

<h2>Third-Party Sign-In</h2>

<p>
  Pick Sum'N may allow you to sign in
  using services such as Apple, Google,
  or Facebook.
</p>

<p>
  When you use one of these services, we
  may receive account information that
  you authorize the provider to share
  with Pick Sum'N.
</p>

<h2>Third-Party Services</h2>

<p>
  Pick Sum'N uses third-party services
  to provide portions of the app.
  These may include hosting, maps,
  restaurant information,
  authentication, media storage, and
  notification services.
</p>

<p>
  These providers may process information
  necessary to perform services on our
  behalf and are subject to their own
  privacy policies and terms.
</p>

<h2>How We Use Information</h2>

<p>
  We may use information collected
  through Pick Sum'N to:
</p>

<ul>
  <li>
    Create and maintain your account.
  </li>

  <li>
    Provide restaurant searches and
    recommendations.
  </li>

  <li>
    Generate compatibility and group
    restaurant matches.
  </li>

  <li>
    Provide group, friend, invitation,
    voting, and session features.
  </li>

  <li>
    Save your preferences and settings.
  </li>

  <li>
    Provide customer support.
  </li>

  <li>
    Protect Pick Sum'N from misuse,
    fraud, or security threats.
  </li>

  <li>
    Maintain and improve the app.
  </li>
</ul>

<h2>How We Share Information</h2>

<p>
  We do not sell your personal
  information.
</p>

<p>
  Information may be shared with service
  providers when necessary to operate
  Pick Sum'N, or when required by law.
</p>

<p>
  Information may also be shared with
  other Pick Sum'N users when you
  intentionally participate in social or
  group features.
</p>

<h2>Data Storage and Security</h2>

<p>
  We use reasonable technical and
  organizational measures designed to
  protect information associated with
  Pick Sum'N accounts.
</p>

<p>
  No method of electronic storage or
  transmission can be guaranteed to be
  completely secure.
</p>

<h2>Your Choices</h2>

<p>
  Depending on the feature, you may be
  able to update or remove information
  through your Pick Sum'N account
  settings.
</p>

<p>
  You can also control permissions such
  as location and photo access through
  your device settings.
</p>

<h2>Account Deletion</h2>

<p>
  Pick Sum'N provides account deletion
  controls within the app.
</p>

<p>
  When you request deletion, information
  associated with your account will be
  handled according to applicable legal,
  security, and operational
  requirements.
</p>

<h2>Children's Privacy</h2>

<p>
  Pick Sum'N is not intended to knowingly
  collect personal information from
  children in violation of applicable
  law.
</p>

<h2>Changes to This Policy</h2>

<p>
  We may update this Privacy Policy as
  Pick Sum'N changes. The updated date at
  the top of this page will indicate when
  the policy was most recently revised.
</p>

<h2>Contact</h2>

<p>
  Questions about this Privacy Policy or
  your information can be submitted
  through our support page.
</p>

<div class="actions">
  <a
    class="button secondary"
    href="/support"
  >
    Contact Pick Sum'N Support
  </a>
</div>
""",
    )


def terms_of_service(request):
    return _page(
        title="Terms of Service - Pick Sum'N",
        body="""
<p class="brand">PICK SUM'N</p>

<h1>Terms of Service</h1>

<p class="updated">
  Last updated: July 24, 2026
</p>

<p>
  These Terms of Service govern your use
  of Pick Sum'N.
</p>

<p>
  By creating an account or using the
  service, you agree to these Terms.
</p>

<h2>Using Pick Sum'N</h2>

<p>
  Pick Sum'N provides tools that help
  users discover restaurants, compare
  dining preferences, create groups,
  vote, and make restaurant decisions.
</p>

<p>
  You are responsible for using the
  service lawfully and for the activity
  associated with your account.
</p>

<h2>Your Account</h2>

<p>
  You are responsible for maintaining
  the security of your account and for
  providing accurate account
  information.
</p>

<p>
  You may not impersonate another person,
  misuse another user's account, or use
  Pick Sum'N for fraudulent or unlawful
  purposes.
</p>

<h2>Restaurant Information</h2>

<p>
  Restaurant details may be provided by
  third-party data providers.
</p>

<p>
  Information such as operating hours,
  availability, location, ratings,
  pricing, menus, or other restaurant
  information may change without notice.
</p>

<p>
  Pick Sum'N does not guarantee that
  third-party restaurant information is
  always complete or accurate.
</p>

<h2>Recommendations</h2>

<p>
  Restaurant matches, compatibility
  scores, rankings, and suggestions are
  provided for convenience.
</p>

<p>
  Pick Sum'N does not guarantee that a
  restaurant will satisfy every user's
  preferences or dietary requirements.
</p>

<h2>Dietary Information and Allergies</h2>

<p>
  Pick Sum'N is not a medical service and
  should not be relied upon to determine
  whether food is safe for a particular
  allergy, intolerance, or medical
  condition.
</p>

<p>
  Users are responsible for confirming
  ingredients and food preparation
  practices directly with restaurants
  when necessary.
</p>

<h2>User Content</h2>

<p>
  You may be able to upload profile
  images, group images, names,
  descriptions, or other content.
</p>

<p>
  You are responsible for content you
  submit and must have the right to use
  that content.
</p>

<h2>Acceptable Use</h2>

<p>
  You may not use Pick Sum'N to:
</p>

<ul>
  <li>
    Harass, threaten, or harm another
    person.
  </li>

  <li>
    Attempt to gain unauthorized access
    to accounts or systems.
  </li>

  <li>
    Interfere with or disrupt the
    service.
  </li>

  <li>
    Submit unlawful, fraudulent, or
    abusive content.
  </li>

  <li>
    Use automated systems to improperly
    access or misuse the service.
  </li>
</ul>

<h2>Availability</h2>

<p>
  We may modify, suspend, or discontinue
  portions of Pick Sum'N as the service
  evolves.
</p>

<p>
  We cannot guarantee uninterrupted or
  error-free availability.
</p>

<h2>Account Suspension or Termination</h2>

<p>
  We may restrict or terminate access to
  Pick Sum'N when necessary to protect
  users, enforce these Terms, comply with
  law, or protect the service.
</p>

<p>
  You may stop using Pick Sum'N and
  delete your account through available
  account controls.
</p>

<h2>Third-Party Services</h2>

<p>
  Pick Sum'N may contain information,
  links, or functionality provided by
  third-party services.
</p>

<p>
  Those third-party services are
  governed by their own terms and
  policies.
</p>

<h2>Disclaimer</h2>

<p>
  Pick Sum'N is provided on an
  "as available" basis to the extent
  permitted by law.
</p>

<p>
  We do not guarantee specific restaurant
  outcomes, availability, accuracy, or
  suitability for any particular user.
</p>

<h2>Changes to These Terms</h2>

<p>
  These Terms may be updated as Pick
  Sum'N evolves.
</p>

<p>
  Continued use of the service following
  an updated version of these Terms may
  constitute acceptance of the updated
  Terms where permitted by law.
</p>

<h2>Contact</h2>

<p>
  Questions about these Terms can be
  submitted through the Pick Sum'N
  support page.
</p>

<div class="actions">
  <a
    class="button secondary"
    href="/support"
  >
    Contact Support
  </a>
</div>
""",
    )


def support(request):
    return _page(
        title="Support - Pick Sum'N",
        body="""
<p class="brand">PICK SUM'N</p>

<h1>Support</h1>

<p>
  Need help with Pick Sum'N?
</p>

<p>
  We're here to help with account issues,
  group invitations, restaurant
  recommendations, privacy questions,
  technical problems, or other questions
  about the app.
</p>

<div class="contact-box">
  <h2>Contact Support</h2>

  <p>
    Email:
    <a href="mailto:aackerman@voxoluniverse.com">
      aackerman@voxoluniverse.com
    </a>
  </p>

  <p>
    When contacting support, include a
    description of the issue and any
    helpful details about what happened.
  </p>
</div>

<h2>Account and Privacy</h2>

<p>
  Account, privacy, and security options
  are available inside the Pick Sum'N app
  under Settings.
</p>

<p>
  You can also contact support regarding
  account access, data questions, or
  deletion requests.
</p>

<h2>Group Invitations</h2>

<p>
  If someone sends you a Pick Sum'N group
  invite, open the invitation link on
  your phone.
</p>

<p>
  If the app is installed, the invitation
  should open directly in Pick Sum'N.
  Otherwise, keep the join code so it can
  be entered after installing the app.
</p>

<h2>Restaurant Information</h2>

<p>
  Restaurant details may come from
  third-party providers and can change.
  Always verify important information
  such as hours, availability, dietary
  accommodations, or allergy information
  directly with the restaurant.
</p>
""",
    )


def group_invite(request, join_code):
    clean_code = str(
        join_code,
    ).strip().upper()

    group = get_object_or_404(
        DiningGroup,
        join_code=clean_code,
        is_active=True,
    )

    group_name = html.escape(
        group.name,
    )

    safe_code = html.escape(
        clean_code,
    )

    ios_url = str(
        settings.IOS_APP_STORE_URL or "",
    ).strip()

    android_url = str(
        settings.ANDROID_PLAY_STORE_URL or "",
    ).strip()

    store_actions = []

    if ios_url:
        store_actions.append(
            '<a class="button primary" '
            f'href="{html.escape(ios_url)}">'
            "Download on the App Store"
            "</a>"
        )

    if android_url:
        store_actions.append(
            '<a class="button secondary" '
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
<p class="brand">
  PICK SUM'N GROUP INVITE
</p>

<h1>
  Join {group_name}
</h1>

<p>
  You were invited to a Pick Sum'N group.
  If Pick Sum'N is already installed,
  this link should open the app
  automatically.
</p>

<div class="code">
  {safe_code}
</div>

<div class="actions">
  <a
    class="button secondary"
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
  Keep this code until you have joined
  the group. If you install Pick Sum'N
  after opening this page, enter or paste
  the code in the app.
</p>

<script>
  const button =
    document.getElementById(
      "copy-code"
    );

  button.addEventListener(
    "click",
    async () => {{
      try {{
        await navigator.clipboard
          .writeText(
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
        title=(
            f"Join {group.name} "
            "- Pick Sum'N"
        ),
        body=body,
    )


def apple_app_site_association(
    request,
):
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


def android_asset_links(
    request,
):
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
                    "namespace":
                        "android_app",

                    "package_name":
                        "com.picksumn.app",

                    "sha256_cert_fingerprints":
                        fingerprints,
                },
            }
        )

    return JsonResponse(
        payload,
        safe=False,
    )