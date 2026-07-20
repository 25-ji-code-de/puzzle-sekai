package net.de5.nightcord.puzzlesekai;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Immersive landscape game shell: hide status / nav bars and re-hide after swipe.
 */
public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    applyImmersive();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) {
      applyImmersive();
    }
  }

  @Override
  public void onResume() {
    super.onResume();
    applyImmersive();
  }

  private void applyImmersive() {
    try {
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
      WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
      View decor = getWindow().getDecorView();
      WindowInsetsControllerCompat controller =
          WindowCompat.getInsetsController(getWindow(), decor);
      if (controller != null) {
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
      }
    } catch (Exception ignored) {
      // Older devices / unexpected window state — non-fatal.
    }
  }
}
