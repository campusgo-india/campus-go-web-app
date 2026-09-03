# CampusGO Android app (TWA)

The Android app is a **Trusted Web Activity (TWA)** — a thin native wrapper,
built with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), that
opens the deployed web app full-screen with no browser chrome. There is no
separate mobile codebase: the app *is* the website.

> **Why this folder exists:** the original wrapper project was built outside
> this repo and lost. This folder is now the single source of truth for the
> Android build. Do not build the APK from an ad-hoc directory again — always
> from here, and commit any config changes.

---

## What's in here

| File | Committed? | Purpose |
|---|---|---|
| `twa-manifest.json` | ✅ yes | The Bubblewrap config — the source of truth. Every wrapper setting lives here. |
| `scripts/blank-splash.sh` | ✅ yes | Replaces Bubblewrap's generated full-screen logo splash with nothing (see "Splash screen"). |
| `assets/blank.png` | ✅ yes | 1×1 transparent PNG used by the script above. |
| `.gitignore` | ✅ yes | Ignores the generated Android project, build outputs, and the keystore. |
| `app/`, `.gradle/`, `build/`, `*.apk`, `*.aab` | ❌ generated | Recreated by `bubblewrap update` — never edited by hand, never committed. |
| `android.keystore` + passwords | ❌ **NEVER commit** | The signing key. See "Signing key" — losing it means you cannot ship updates. |

---

## Prerequisites

- **Node 18+** (you already have it for the web app).
- Bubblewrap downloads and manages its own JDK 17 + Android SDK on first run —
  you do **not** need Android Studio.

```bash
npm install -g @bubblewrap/cli
bubblewrap --version   # sanity check
```

---

## Signing key — read this first

The Play Store identifies the app by `packageId` **+ signing key**. The
currently-published app is signed with a key whose SHA-256 fingerprint is
pinned in [`../apps/web/public/.well-known/assetlinks.json`](../apps/web/public/.well-known/assetlinks.json):

```
95:C4:7E:38:6D:8A:90:06:6C:55:28:79:4B:EA:F9:30:2A:E4:A5:42:D5:1E:DB:FF:7A:8A:6E:C5:86:5F:EF:AB
```

- **If you still have the original `android.keystore` + alias + passwords:**
  put the keystore file at `android/android.keystore` (git-ignored) and build
  as normal. Updates will install over the existing app.
- **If the original keystore is lost:** you cannot update the existing
  listing directly. Options:
  1. If the app is on **Play App Signing** (it should be), you only lost the
     *upload* key. Follow Play Console → *App integrity* → *Request upload key
     reset*, then generate a new upload key with Bubblewrap and use it.
  2. Otherwise you must publish under a **new `packageId`** (e.g.
     `com.campusgoindia.student2`) as a new listing, and migrate users.

**After any keystore change**, update BOTH fingerprints in
`assetlinks.json` (the Play *app-signing* SHA-256 from Play Console → *App
integrity*, and your *upload* key SHA-256), redeploy the web app, and verify
with <https://developers.google.com/digital-asset-links/tools/generator>.

Back the keystore + passwords up in a password manager / secret store. It is
`.gitignore`d on purpose — **do not** commit it.

---

## First-time setup

1. Edit `twa-manifest.json`:
   - Set `"host"` and every `https://…` URL to the **real production domain**
     (whatever serves `https://<domain>/.well-known/assetlinks.json`). It is
     currently the placeholder `PROD_DOMAIN_PLACEHOLDER`.
2. Generate the Android project into this folder:

   ```bash
   cd android
   bubblewrap init --manifest ./twa-manifest.json
   ```

   When prompted for a signing key, point it at your existing
   `android/android.keystore` (or let it create one — then back it up).
3. Blank the logo splash and build:

   ```bash
   ./scripts/blank-splash.sh
   bubblewrap build
   ```

   Output: `app-release-signed.apk` (for sideload testing) and
   `app-release-bundle.aab` (for the Play Store).

---

## Making changes later

Edit `twa-manifest.json`, then:

```bash
cd android
bubblewrap update          # regenerates app/ from the manifest
./scripts/blank-splash.sh  # re-blank the splash (bubblewrap regenerates it)
bubblewrap build
```

Bump **`appVersionCode`** (integer, +1) and **`appVersionName`** in
`twa-manifest.json` for every Play Store upload, or the Console rejects it.

---

## Splash screen

There are two splashes on a cold start:

1. **The OS splash (Android 12+)** — a system screen showing the launcher
   icon on `windowSplashScreenBackground`. Android **requires** the icon here;
   it cannot be removed, only recoloured. It's set to `#14245C` via
   `backgroundColor` in the manifest and lasts ~0.5 s.
2. **Bubblewrap's `LauncherActivity` splash** — a second full-screen image
   (the app icon again) shown while the web view loads. **This is the "logo
   splash" we remove.** `scripts/blank-splash.sh` overwrites the generated
   `res/drawable*/splash.png` with a 1×1 transparent pixel and
   `splashScreenFadeOutDuration` is `0` in the manifest, so it's invisible.

After that, control passes to the web app, where
[`apps/web/components/app-splash.tsx`](../apps/web/components/app-splash.tsx)
draws the blue graduation-cap animation on the same `#14245C` background — so
the hand-off is seamless with no white flash.

Re-run `blank-splash.sh` after **every** `bubblewrap init` / `bubblewrap
update`, because Bubblewrap regenerates the splash images each time.

---

## Publishing to the Play Store

1. `bubblewrap build` → upload `app-release-bundle.aab` to Play Console.
2. Keep **Play App Signing** enabled (default for new apps).
3. Play Console → *App integrity* → copy the **app-signing SHA-256**.
4. Put that fingerprint (and your upload-key SHA-256) into
   `apps/web/public/.well-known/assetlinks.json`, commit, and redeploy the web
   app. The `/.well-known/assetlinks.json` URL must return HTTP 200 with the
   correct fingerprints or the TWA opens with a URL bar.
5. Fill the store listing (screenshots, privacy policy URL —
   `https://<domain>/privacy`, data-safety form). `display: standalone` +
   `enableNotifications: true` are already set.

---

## Digital Asset Links

`apps/web/public/.well-known/assetlinks.json` is served by the web app and
links the domain to the app package. It must list the fingerprint of whatever
key ultimately signs the installed APK (with Play App Signing, that's
Google's key — get it from Play Console, not your local keystore).
