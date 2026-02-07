use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tweers_core::core::parser::TweeParser;
use tweers_core::core::story::Passage;

use crate::serialize::group_to_twee;

#[derive(Serialize)]
pub struct PassageInfo {
    pub name: String,
    pub tags: Option<String>,
    pub content: String,
    pub line: u32,
    pub position: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitPlan {
    pub source_path: String,
    pub output_dir: String,
    pub groups: Vec<SplitGroup>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipPlan {
    pub source_path: String,
    pub zip_path: String,
    pub groups: Vec<SplitGroup>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitGroup {
    pub filename: String,
    pub passage_names: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitResult {
    pub files_written: usize,
    pub total_passages: usize,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedGroup {
    pub id: String,
    pub filename: String,
    pub passage_names: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub file_path: Option<String>,
    pub groups: Vec<SavedGroup>,
}

#[tauri::command]
pub fn open_twee(path: String) -> Result<Vec<PassageInfo>, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let (passages, _story_data) = TweeParser::parse(&content)?;

    let list: Vec<PassageInfo> = passages
        .values()
        .map(|p| PassageInfo {
            name: p.name.clone(),
            tags: p.tags.clone(),
            content: p.content.clone(),
            line: p.source_line.unwrap_or(0),
            position: p.position.clone(),
        })
        .collect();

    Ok(list)
}

#[tauri::command]
pub fn preview_passage(path: String, name: String) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let (passages, _) = TweeParser::parse(&content)?;

    let passage = passages
        .get(&name)
        .ok_or_else(|| format!("Passage '{}' not found", name))?;

    Ok(passage_to_preview(passage))
}

fn passage_to_preview(passage: &Passage) -> String {
    let mut header = format!(":: {}", passage.name);
    if let Some(ref tags) = passage.tags {
        if !tags.is_empty() {
            header.push_str(&format!(" [{}]", tags));
        }
    }
    if passage.position.is_some() || passage.size.is_some() {
        let pos = passage.position.as_deref().unwrap_or("0,0");
        let size = passage.size.as_deref().unwrap_or("100,100");
        header.push_str(&format!(
            " {{\"position\":\"{}\",\"size\":\"{}\"}}",
            pos, size
        ));
    }
    format!("{}\n{}", header, passage.content)
}

#[tauri::command]
pub fn execute_split(plan: SplitPlan) -> Result<SplitResult, String> {
    let content = fs::read_to_string(&plan.source_path).map_err(|e| e.to_string())?;
    let (passages, _) = TweeParser::parse(&content)?;

    let out_dir = Path::new(&plan.output_dir);
    fs::create_dir_all(out_dir).map_err(|e| e.to_string())?;

    let mut files_written = 0usize;
    let mut total_passages = 0usize;

    for group in &plan.groups {
        let names = group.passage_names.clone();

        let twee_content = group_to_twee(&names, &passages);
        let file_path = out_dir.join(&group.filename);
        fs::write(&file_path, &twee_content).map_err(|e| e.to_string())?;

        total_passages += names.len();
        files_written += 1;
    }

    Ok(SplitResult {
        files_written,
        total_passages,
    })
}

#[tauri::command]
pub async fn pick_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .add_filter("Twee files", &["twee", "tw"])
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });

    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_save_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .add_filter("Zip archive", &["zip"])
        .set_file_name("export.zip")
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    rx.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn execute_split_zip(plan: ZipPlan) -> Result<SplitResult, String> {
    let content = fs::read_to_string(&plan.source_path).map_err(|e| e.to_string())?;
    let (passages, _) = TweeParser::parse(&content)?;

    let file = fs::File::create(&plan.zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut files_written = 0usize;
    let mut total_passages = 0usize;

    for group in &plan.groups {
        let names = group.passage_names.clone();
        let twee_content = group_to_twee(&names, &passages);

        zip.start_file(&group.filename, options)
            .map_err(|e| e.to_string())?;
        zip.write_all(twee_content.as_bytes())
            .map_err(|e| e.to_string())?;

        total_passages += names.len();
        files_written += 1;
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(SplitResult {
        files_written,
        total_passages,
    })
}

#[tauri::command]
pub fn save_state(app: tauri::AppHandle, state: AppState) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(dir.join("state.json"), json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_state(app: tauri::AppHandle) -> Result<Option<AppState>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("state.json");
    if !path.exists() {
        return Ok(None);
    }
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let state: AppState = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(state))
}
