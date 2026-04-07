use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 앱 설정 디렉토리 경로 반환
fn config_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_config_dir().expect("failed to get config dir")
}

/// 프로젝트 파일(.aaproj) 로드
#[tauri::command]
fn load_project(path: String) -> Result<Value, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
}

/// 프로젝트 파일(.aaproj) 저장
#[tauri::command]
fn save_project(path: String, data: Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    // 부모 디렉토리 확인
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// AppConfig 로드 (config.json)
#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<Value, String> {
    let path = config_dir(&app).join("config.json");
    if !path.exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
}

/// AppConfig 저장 (config.json)
#[tauri::command]
fn save_config(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let dir = config_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("config.json");
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 팔레트세트 파일(.aapals) 로드
#[tauri::command]
fn load_palette_set(app: tauri::AppHandle) -> Result<Value, String> {
    let path = config_dir(&app).join("palette.aapals");
    if !path.exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
}

/// 팔레트세트 파일(.aapals) 저장
#[tauri::command]
fn save_palette_set(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let dir = config_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("palette.aapals");
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 디렉토리 내 MLT 파일 목록 반환
#[tauri::command]
fn list_mlt_files(dir: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut files: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            let name = e.file_name().to_string_lossy().to_lowercase();
            name.ends_with(".mlt")
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();
    files.sort();
    Ok(files)
}

/// MLT 파일 읽기 (UTF-8)
#[tauri::command]
fn read_mlt_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// 텍스트 파일로 내보내기
#[tauri::command]
fn export_text(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// 범용 JSON 파일 로드 (문서/팔레트 import용)
#[tauri::command]
fn load_json_file(path: String) -> Result<Value, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(json)
}

/// 범용 JSON 파일 저장 (문서/팔레트 export용)
#[tauri::command]
fn save_json_file(path: String, data: Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_project,
            save_project,
            load_config,
            save_config,
            load_palette_set,
            save_palette_set,
            list_mlt_files,
            read_mlt_file,
            export_text,
            load_json_file,
            save_json_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
