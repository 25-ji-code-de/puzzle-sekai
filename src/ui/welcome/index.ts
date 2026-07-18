/**
 * Welcome / menu public API.
 */
import { handleRedirectCallback, loadSession } from "../../auth";
import { pullMergePush } from "../../sync";
import { setOnBootContinue } from "./boot";
import { showWelcomePage } from "./menu";

/** OAuth return + optional cloud pull (non-blocking for menu paint). */
const bootstrapAuthAndSync = async (): Promise<void> => {
  try {
    const cb = await handleRedirectCallback();
    if (cb.handled && cb.ok) {
      void pullMergePush();
      return;
    }
  } catch (e) {
    console.warn("[auth] bootstrap callback", e);
  }
  if (loadSession()) {
    void pullMergePush();
  }
};

void bootstrapAuthAndSync();

setOnBootContinue(showWelcomePage);

export {
  showBootWelcome,
  setWelcomeLoadProgress,
  markWelcomeReady,
  welcome,
} from "./boot";

export { enterMenu } from "./menu";
