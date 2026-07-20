# Native shells (desktop + Android)

Downloadable packages wrap the same Vite `dist/` the website ships.  
Web / PWA at <https://pico.nightcord.de5.net/> is unchanged.

| Platform                | Shell                                 | Output                       |
| ----------------------- | ------------------------------------- | ---------------------------- |
| Windows / macOS / Linux | [Tauri 2](https://v2.tauri.app/)      | NSIS / `.dmg` / deb+AppImage |
| Android                 | [Capacitor](https://capacitorjs.com/) | sideload APK (no store)      |

## Prerequisites

### Shared

- Node.js 18+ and Yarn 4 (`corepack enable`)
- `yarn install`

### Desktop (Tauri)

1. Install the [Rust toolchain](https://rustup.rs/) (`rustup default stable`).
2. Platform extras:
   - **Windows**: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2 (usually preinstalled on Win11).
   - **macOS**: Xcode CLT (`xcode-select --install`).
   - **Linux**: see [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/).

### Android (Capacitor)

- JDK 17+, Android Studio, Android SDK (API 24+ recommended).
- Set `ANDROID_HOME` / accept licenses.

## Build commands

```bash
# Web (PWA, production) — unchanged
yarn build

# Shared native frontend bundle (no service worker, VITE_NATIVE=1)
yarn build:native

# Desktop
yarn tauri:dev      # needs Rust; starts Vite on :7426 + Tauri window
yarn tauri:build    # runs build:native then packages installers

# Android
yarn cap:sync       # build:native + cap sync android
yarn android:open   # open Android Studio
yarn android:apk    # release APK via Gradle (cross-platform: scripts/android-apk.mjs)
```

Artifacts:

- Tauri: `src-tauri/target/release/bundle/`
- Android: `android/app/build/outputs/apk/`

## CI releases (GitHub Actions)

Push a version tag to build all platforms and attach installers to a GitHub Release:

```bash
# after main is green
git tag v1.2.0
git push origin v1.2.0
```

Or **Actions → Release → Run workflow** (optional tag input).

| Job             | Runner           | Output                           |
| --------------- | ---------------- | -------------------------------- |
| Desktop Windows | `windows-latest` | NSIS `*-setup.exe` (zh/ja/en)    |
| Desktop macOS   | `macos-latest`   | `.dmg` (unsigned)                |
| Desktop Linux   | `ubuntu-22.04`   | `.deb` + `.AppImage`             |
| Android         | `ubuntu-latest`  | `*-android-debug.apk` (sideload) |

Workflow file: [`.github/workflows/release.yml`](../.github/workflows/release.yml).

Notes:

- **Unsigned** builds on purpose (fan direct-download). macOS needs Right-click → Open.
- Android APK is **debug-signed** so CI needs no keystore secret. Fine for sideload, not for Play Store.
- PR / push CI ([`ci.yml`](../.github/workflows/ci.yml)) stays web-only — native toolchains only run on tags.

## OAuth (SEKAI Pass) for native

Native builds use a fixed redirect URI:

```text
puzzlesekai://auth/callback
```

(override with `VITE_NATIVE_REDIRECT_URI` in `.env.native`)

**IdP checklist** (Pass app admin):

1. Keep existing web redirect URIs.
2. Add `puzzlesekai://auth/callback`.
3. Same public `client_id` as web (`VITE_SEKAI_PASS_CLIENT_ID`). No secret in the client.

PKCE pending state is stored in **localStorage** on native builds (sessionStorage on web) so custom-scheme hops do not drop the verifier.

Deep-link handling lives in `src/native/deep-link.ts` and is bootstrapped only when `VITE_NATIVE=1`.

## Icons

Tauri / Android launcher icons under `src-tauri/icons/` and `android/app/src/main/res/`:

| Size rule     | Source                                             |
| ------------- | -------------------------------------------------- |
| **&lt; 96px** | `public/favicon-48x48.png` (wordmark on soft pink) |
| **≥ 96px**    | `public/android-chrome-512x512.png` (full art)     |

Regenerate with the project’s icon script / `png-to-ico` pipeline when those sources change (see recent commits), or re-run a layered sharp pass. Do **not** use a single `tauri icon` pass on one PNG if you want this split.

## macOS Gatekeeper

Unsigned direct-download builds may need **Right-click → Open** the first time. Code signing / notarization is optional follow-up work.

## License

Shell packages must keep `LICENSE` / `NOTICE`. AGPL-3.0-only applies to project code; SEKAI assets remain third-party.
