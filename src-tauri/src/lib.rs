mod commands;
mod serialize;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_twee,
            commands::preview_passage,
            commands::execute_split,
            commands::execute_split_zip,
            commands::pick_file,
            commands::pick_directory,
            commands::pick_save_file,
            commands::save_state,
            commands::load_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
