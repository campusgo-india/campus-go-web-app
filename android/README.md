# CampusGO Android app (TWA)

> **Build status (2026-09-03):** a signed `CampusGO-1.0.0.apk` + `.aab` were
> built locally (versionCode 1, targetSdk 36, package `com.campusgoindia.student`,
> logo splash removed). The original signing key was lost, so a **new** key was
> generated — keystore + password are in `~/CampusGO-android-signing/`
> (`signing-key-info.txt`). Its SHA-256
> `D3:1E:CF:0E:72:C7:23:62:DF:FC:EE:02:B0:E1:4D:C2:60:F6:31:CE:AE:49:9C:64:63:ED:1B:32:B8:18:13:1B`
> has been added to `assetlinks.json`. **Save that keystore before doing
> anything else** — without it there are no updates. The APK still needs the
> domain pointed at Vercel (below) before it works end-to-end.


The Android app is a **Trusted Web Activity (TWA)** — a thin native wrapper,
built with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), that
opens `https://campusgoindia.com` full-screen with no browser chrome. There is
no separate mobile codebase: the app *is* the website.

> **Why this folder exists:** the original wrapper project was built outside
> this repo and lost. This folder is now the single source of truth. Always
> build from here; commit any config change to `twa-manifest.json`.

---

## ⚠️ Before the app is usable: point the domain at the site

`https://campusgoindia.com` currently serves a **GoDaddy parking page** on
every path (checked: `/`, `/login`, `/manifest.webmanifest`,
`/.well-known/assetlinks.json` all return the "under construction" lander).

Until DNS for `campusgoindia.com` points at the Vercel deployment:

- the app will just show the parking page, and
- Digital Asset Links verification fails, so the TWA opens **with a URL bar**.

Fix first: Vercel project → **Settings → Domains → add `campusgoindia.com`**,
then update the DNS records at GoDaddy as Vercel instructs. Confirm
`https://campusgoindia.com/.well-known/assetlinks.json` returns the JSON in
[`../apps/web/public/.well-known/assetlinks.json`](../apps/web/public/.well-known/assetlinks.json)
(not HTML) before shipping the APK.

---

## What's in here

| File | Committed? | Purpose |
|---|---|---|
| `twa-manifest.json` | ✅ | Bubblewrap config — the source of truth. `host` = `campusgoindia.com`, `startUrl` = `/login`, splash `#14245C` with `splashScreenFadeOutDuration: 0`, `packageId` `com.campusgoindia.student` (matches `assetlinks.json`). |
| `scripts/blank-splash.sh` + `assets/blank.png` | ✅ | Overwrites Bubblewrap's generated full-screen logo splash with a 1×1 transparent pixel. |
| `.gitignore` | ✅ | Ignores the generated Android project, build outputs, and the keystore. |
| `../.github/workflows/android-apk.yml` | ✅ | CI build — the recommended way to produce the APK/AAB. |
| `app/`, `.gradle/`, `*.apk`, `*.aab`, `android.keystore` | ❌ | Generated / secret — never committed. |

---

## Build in CI (recommended)

Bubblewrap needs an interactive terminal, so the reliable path is the GitHub
Actions workflow **“Build Android APK (TWA)”** (Actions tab → Run workflow).
It produces `campusgo-android` artifacts: `app-release-signed.apk` (sideload)
and `app-release-bundle.aab` (Play Store).

**Secrets** (Settings → Secrets and variables → Actions):

| Secret | Notes |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i android.keystore` of your signing key |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_PASSWORD` | key password |
| `ANDROID_KEY_ALIAS` | defaults to `campusgo` |

If `ANDROID_KEYSTORE_BASE64` is **not** set, the first run generates a fresh
keystore and uploads it as the `android-keystore` artifact — download it,
store it + its password as the secrets above, and every later build reuses
that key. **A different key = a different app on the Play Store**, so do this
once and keep the keystore forever (a password manager / secret store).

Each Play upload needs a higher `appVersionCode` — pass `versionCode` /
`versionName` as workflow inputs, or bump them in `twa-manifest.json`.

---

## Build locally

Needs Node 18/20 (Bubblewrap is unhappy on Node 22+) and Java 17. Bubblewrap
downloads its own Android SDK on first run.

```bash
npm install -g @bubblewrap/cli
cd android
bubblewrap init --manifest ./twa-manifest.json --directory .
./scripts/blank-splash.sh          # re-run after EVERY init/update
bubblewrap build
```

Later changes: edit `twa-manifest.json` → `bubblewrap update` →
`./scripts/blank-splash.sh` → `bubblewrap build`.

---

## Splash screen

Two splashes show on a cold start:

1. **OS splash (Android 12+)** — system screen with the launcher icon on
   `#14245C`. Android *requires* the icon here; it can't be removed, only
   recoloured. Lasts ~0.5 s.
2. **Bubblewrap `LauncherActivity` splash** — a second full-screen logo image
   while the web view loads. **This is the "logo splash" we remove.**
   `scripts/blank-splash.sh` replaces the generated `res/drawable*/splash.png`
   with a transparent pixel, and `splashScreenFadeOutDuration` is `0`.

Then control passes to the web app, where
[`apps/web/components/app-splash.tsx`](../apps/web/components/app-splash.tsx)
draws the blue graduation-cap animation on the same `#14245C` — a seamless
hand-off, no white flash.

Re-run `blank-splash.sh` after every `bubblewrap init` / `update` (it
regenerates the splash each time).

---

## Signing key

The published app is identified by `packageId` **+ signing key**. The
fingerprint currently pinned in
[`../apps/web/public/.well-known/assetlinks.json`](../apps/web/public/.well-known/assetlinks.json)
is:

```
95:C4:7E:38:6D:8A:90:06:6C:55:28:79:4B:EA:F9:30:2A:E4:A5:42:D5:1E:DB:FF:7A:8A:6E:C5:86:5F:EF:AB
```

- **Original keystore available** → use it (secret / `signingKey.path`).
  Updates install over the existing app.
- **Original keystore lost** → either use Play Console → *App integrity* →
  *Request upload key reset* (works if the app is on Play App Signing), or
  publish under a new `packageId` as a new listing.

After **any** key change: put the new fingerprint(s) into
`assetlinks.json` — with Play App Signing that's the **app-signing SHA-256
from Play Console → App integrity**, plus your upload-key SHA-256 — commit,
redeploy the web app, and verify with
<https://developers.google.com/digital-asset-links/tools/generator>.

---

## Publishing to the Play Store

1. Build → upload `app-release-bundle.aab` to Play Console.
2. Keep **Play App Signing** on (default).
3. Play Console → *App integrity* → copy the **app-signing SHA-256** →
   add to `assetlinks.json` → redeploy web.
4. Store listing: screenshots, privacy policy `https://campusgoindia.com/privacy`,
   data-safety form. `display: standalone` + `enableNotifications: true` are
   already set.
