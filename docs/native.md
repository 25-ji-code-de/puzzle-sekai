# Native shells (desktop + Android)

Downloadable packages wrap the same Vite `dist/` the website ships.  
Web / PWA at <https://pico.nightcord.de5.net/> is unchanged.

| Platform                | Shell                                 | Output                        |
| ----------------------- | ------------------------------------- | ----------------------------- |
| Windows / macOS / Linux | [Tauri 2](https://v2.tauri.app/)      | installer / AppImage / `.app` |
| Android                 | [Capacitor](https://capacitorjs.com/) | sideload APK (no store)       |

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
yarn android:apk    # release APK via Gradle (Unix); on Windows use android\gradlew.bat
```

Artifacts:

- Tauri: `src-tauri/target/release/bundle/`
- Android: `android/app/build/outputs/apk/`

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

Tauri icons under `src-tauri/icons/` are generated from `public/android-chrome-512x512.png`.  
Replace and re-run a sharp resize if you want a dedicated desktop icon; for proper `.icns`/`.ico` multi-size assets use `yarn tauri icon path/to/1024.png` once Rust/CLI is available.

## macOS Gatekeeper

Unsigned direct-download builds may need **Right-click → Open** the first time. Code signing / notarization is optional follow-up work.

## License

Shell packages must keep `LICENSE` / `NOTICE`. AGPL-3.0-only applies to project code; SEKAI assets remain third-party.
