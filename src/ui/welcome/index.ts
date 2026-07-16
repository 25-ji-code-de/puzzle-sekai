/**
 * Welcome / menu public API.
 */
import { setOnBootContinue } from "./boot";
import { showWelcomePage } from "./menu";

setOnBootContinue(showWelcomePage);

export {
  showBootWelcome,
  setWelcomeLoadProgress,
  markWelcomeReady,
  welcome,
} from "./boot";

export { enterMenu } from "./menu";
