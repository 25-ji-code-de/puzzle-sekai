#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single instance: second process (deep-link launch) hands argv to the first
    // and exits, so the existing webview keeps its PKCE state / session.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            use tauri::Manager;
            // Bring the existing window forward when a deep-link reopens us.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
                let _ = window.show();
            }
            // argv usually looks like: [exe, "puzzlesekai://auth/callback?..."]
            // The deep-link plugin listens for OS events; single-instance just
            // ensures we don't spawn a second process that would lose sessionStorage/localStorage.
            println!("[single-instance] argv={argv:?}");
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Register puzzlesekai:// on first run (Windows/Linux). macOS uses Info.plist.
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(e) = app.deep_link().register_all() {
                    eprintln!("[deep-link] register_all failed: {e}");
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
