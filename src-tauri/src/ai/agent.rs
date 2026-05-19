use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use crate::state::AppState;
use crate::commands::ai::{ChatMessage, request_cloud_chat};
use crate::commands::CommandError;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentToolCall {
    pub name: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Serialize, Clone)]
pub struct AgentProgress {
    pub step: String,
    pub detail: String,
    pub is_final: bool,
}

pub fn get_available_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "search_workspace".to_string(),
            description: "Search for relevant information across all documents in the current workspace using semantic vector search.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant context."
                    }
                },
                "required": ["query"]
            }),
        },
        ToolDefinition {
            name: "read_document_page".to_string(),
            description: "Read the full text content of a specific page in a document.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "The BLAKE3 hash_id of the document."
                    },
                    "page_num": {
                        "type": "integer",
                        "description": "The 1-based page number to read."
                    }
                },
                "required": ["doc_id", "page_num"]
            }),
        },
        ToolDefinition {
            name: "write_report".to_string(),
            description: "Finalize the task by writing a comprehensive report based on the gathered information.".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The title of the report."
                    },
                    "content": {
                        "type": "string",
                        "description": "The full Markdown content of the report."
                    }
                },
                "required": ["title", "content"]
            }),
        },
    ]
}

pub async fn run_agent_task(
    app: AppHandle,
    workspace_id: String,
    prompt: String,
    model_config: serde_json::Value,
) -> Result<(), CommandError> {
    let state = app.state::<AppState>();
    let tools = get_available_tools();
    let tools_json = json!(tools).to_string();

    let pdfium_candidates = get_pdfium_candidates(&app);

    let system_prompt = format!(
        "You are an autonomous research agent for AiPDF. Your goal is to fulfill the user's request by using the available tools.\n\n\
        AVAILABLE TOOLS:\n{}\n\n\
        INSTRUCTIONS:\n\
        1. Reason about the next step.\n\
        2. If you need more information, call a tool by outputting ONLY a JSON object: {{\"name\": \"tool_name\", \"arguments\": {{\"arg\": \"val\"}}}}\n\
        3. After receiving tool results, repeat steps 1-2 until you have enough info.\n\
        4. When finished, use 'write_report' to provide the final answer.\n\
        5. Output ONLY the JSON for tool calls. No preamble.",
        tools_json
    );

    let mut messages = vec![
        ChatMessage { role: "system".into(), content: system_prompt },
        ChatMessage { role: "user".into(), content: prompt },
    ];

    let max_iterations = 5;
    for i in 0..max_iterations {
        app.emit("agent-progress", AgentProgress {
            step: format!("Reasoning (Step {}/{})", i + 1, max_iterations),
            detail: "Analyzing task and planning next action...".into(),
            is_final: false,
        }).unwrap();

        // 1. Get LLM response
        let response = request_cloud_chat(
            model_config["baseUrl"].as_str().unwrap_or("").to_string(),
            model_config["apiKey"].as_str().unwrap_or("").to_string(),
            model_config["modelName"].as_str().unwrap_or("").to_string(),
            messages.clone(),
            Some(1024),
            Some(0.0),
        ).await?;

        // 2. Parse Tool Call
        let tool_call: Option<AgentToolCall> = serde_json::from_str(&response).ok();

        if let Some(call) = tool_call {
            app.emit("agent-progress", AgentProgress {
                step: format!("Executing Tool: {}", call.name),
                detail: format!("Arguments: {}", call.arguments),
                is_final: false,
            }).unwrap();

            // 3. Execute Tool
            let result = match call.name.as_str() {
                "search_workspace" => {
                    let query = call.arguments["query"].as_str().unwrap_or_default();
                    
                    let docs = state.db.get_documents(&workspace_id).unwrap_or_default();
                    let mut combined_results = Vec::new();
                    
                    for doc in docs {
                        if let Ok(hash_id) = crate::commands::utils::get_file_hash(doc.path.clone()).await {
                            if let Ok(res) = crate::rag_pipeline::search_context(query.to_string(), hash_id, 3, state.clone()).await {
                                for r in res {
                                    combined_results.push(format!("[Source: {}] {}", doc.name, r));
                                }
                            }
                        }
                    }

                    if combined_results.is_empty() {
                        "No relevant information found in the workspace.".into()
                    } else {
                        combined_results.join("\n---\n")
                    }
                },
                "read_document_page" => {
                    let doc_id = call.arguments["doc_id"].as_str().unwrap_or_default();
                    let page_num = call.arguments["page_num"].as_i64().unwrap_or(1) as i32;
                    
                    if let Ok(path) = state.db.get_document_path(doc_id) {
                         match crate::pdf::document::PdfFile::open(&path, pdfium_candidates.clone()) {
                             Ok(doc) => {
                                 match doc.extract_text(page_num as u32 - 1) {
                                     Ok(text) => format!("Content of {} Page {}:\n{}", doc_id, page_num, text.full_text),
                                     Err(e) => format!("Error extracting text: {}", e),
                                 }
                             },
                             Err(e) => format!("Error opening PDF: {}", e),
                         }
                    } else {
                        format!("Error: Document with id {} not found.", doc_id)
                    }
                },
                "write_report" => {
                    let title = call.arguments["title"].as_str().unwrap_or("Report");
                    let content = call.arguments["content"].as_str().unwrap_or("");
                    
                    app.emit("agent-progress", AgentProgress {
                        step: "Task Complete".into(),
                        detail: format!("Generated report: {}", title),
                        is_final: true,
                    }).unwrap();

                    app.emit("ai-token", crate::commands::ai::TokenPayload {
                        token: format!("# {}\n\n{}", title, content),
                        token_id: 0,
                        is_final: true,
                    }).unwrap();

                    return Ok(());
                },
                _ => format!("Error: Unknown tool '{}'", call.name),
            };

            // 4. Update History
            messages.push(ChatMessage { role: "assistant".into(), content: response });
            messages.push(ChatMessage { role: "system".into(), content: format!("Tool Result: {}", result) });
        } else {
            messages.push(ChatMessage { role: "assistant".into(), content: response });
            messages.push(ChatMessage { role: "system".into(), content: "Error: You must output a valid JSON tool call. Please try again.".into() });
        }
    }

    Err(CommandError::Ai("Agent reached maximum iterations without finishing.".into()))
}

fn get_pdfium_candidates(app: &AppHandle) -> Vec<PathBuf> {
    let library_name = pdfium_render::prelude::Pdfium::pdfium_platform_library_name();
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("pdfium").join(&library_name));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("pdfium").join(&library_name));
            candidates.push(exe_dir.join("../Resources/pdfium").join(&library_name));
            candidates.push(exe_dir.join("../lib/aipdf/pdfium").join(&library_name));
        }
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("resources/pdfium").join(&library_name));
        candidates.push(current_dir.join("src-tauri/resources/pdfium").join(&library_name));
    }

    candidates
}
