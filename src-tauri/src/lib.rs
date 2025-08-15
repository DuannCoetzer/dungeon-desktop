// Command to show open file dialog and return the selected file path
#[tauri::command]
async fn open_file_dialog(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("JSON Files", &["json"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();
        
    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

// Command to show save file dialog and return the selected file path
#[tauri::command]
async fn save_file_dialog(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("JSON Files", &["json"])
        .add_filter("All Files", &["*"])
        .set_file_name("dungeon_map.json")
        .blocking_save_file();
        
    match file_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

// Command to read file contents
#[tauri::command]
async fn read_file(file_path: String) -> Result<String, String> {
    match std::fs::read_to_string(&file_path) {
        Ok(contents) => Ok(contents),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

// Command to write file contents
#[tauri::command]
async fn write_file(file_path: String, contents: String) -> Result<(), String> {
    match std::fs::write(&file_path, contents) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

// Command to load map data from file
#[tauri::command]
async fn load_map(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    // First, show the open file dialog
    let file_path_opt = open_file_dialog(app_handle).await?;
    
    match file_path_opt {
        Some(file_path) => {
            // Read the file contents
            match read_file(file_path).await {
                Ok(contents) => Ok(Some(contents)),
                Err(e) => Err(e),
            }
        }
        None => Ok(None), // User cancelled the dialog
    }
}

// Command to save map data to file
#[tauri::command]
async fn save_map(app_handle: tauri::AppHandle, map_data: String) -> Result<bool, String> {
    // First, show the save file dialog
    let file_path_opt = save_file_dialog(app_handle).await?;
    
    match file_path_opt {
        Some(file_path) => {
            // Write the file contents
            match write_file(file_path, map_data).await {
                Ok(_) => Ok(true),
                Err(e) => Err(e),
            }
        }
        None => Ok(false), // User cancelled the dialog
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            save_file_dialog,
            read_file,
            write_file,
            load_map,
            save_map
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
