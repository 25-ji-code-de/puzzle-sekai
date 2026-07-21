/**
 * Welcome / menu public API.
 */
import { setOnBootContinue } from "./boot";
import { showWelcomePage } from "./menu";
import { devWarn } from "../../util/dev-log";

/**
 * OAuth callback handling stays separate from the menu shell so logged-out users
 * do not pull auth/sync code on the initial welcome path.
 */
const bootstrapAuthCallback = async (): Promise<void> => {
  try {
    const { handleRedirectCallback, isNativeBuild } =
      await import("../../auth");
    const cb = await handleRedirectCallback();
    if (cb.handled && cb.ok) {
      const { pullMergePush } = await import("../../sync");
      void pullMergePush();
    }
    // Native shells: listen for custom-scheme OAuth returns that arrive after
    // boot (or via cold-start deep link). Dynamic import keeps Capacitor/Tauri
    // out of the web graph.
    if (isNativeBuild()) {
      void import("../../native/deep-link").then(
        ({ bootstrapNativeDeepLinks }) => bootstrapNativeDeepLinks(),
      );
      // Android immersive: hide status/nav bars as soon as the shell boots.
      void import("../../native/shell").then(({ applyImmersiveSystemUi }) =>
        applyImmersiveSystemUi(),
      );
    }
  } catch (e) {
    devWarn("[auth] bootstrap callback", e);
  }
};

void bootstrapAuthCallback();

setOnBootContinue(showWelcomePage);

export {
  showBootWelcome,
  setWelcomeLoadProgress,
  markWelcomeReady,
  welcome,
} from "./boot";

export { enterMenu } from "./menu";
