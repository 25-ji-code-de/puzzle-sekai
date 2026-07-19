/**
 * Welcome / menu public API.
 */
import { setOnBootContinue } from "./boot";
import { showWelcomePage } from "./menu";

/**
 * OAuth callback handling stays separate from the menu shell so logged-out users
 * do not pull auth/sync code on the initial welcome path.
 */
const bootstrapAuthCallback = async (): Promise<void> => {
  try {
    const { handleRedirectCallback } = await import("../../auth");
    const cb = await handleRedirectCallback();
    if (cb.handled && cb.ok) {
      const { pullMergePush } = await import("../../sync");
      void pullMergePush();
    }
  } catch (e) {
    console.warn("[auth] bootstrap callback", e);
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
