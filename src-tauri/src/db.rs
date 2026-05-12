use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbWorkspace {
    pub id: String,
    pub name: String,
    pub metadata: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbDocument {
    pub id: String,
    pub workspace_id: String,
    pub path: String,
    pub name: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DbSession {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DbMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub contexts: Option<String>, // JSON string of ChatContext[]
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbModel {
    pub id: String,
    pub name: String,
    pub source: String, // 'local' or 'cloud'
    pub config: String, // JSON string
    pub last_used: bool,
}

pub struct DbManager {
    conn: Mutex<Connection>,
}

impl DbManager {
    pub fn new(path: PathBuf) -> Result<Self> {
        let conn = Connection::open(path)?;
        let manager = Self {
            conn: Mutex::new(conn),
        };
        manager.init()?;
        Ok(manager)
    }

    fn init(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Migration: Check if models table exists
        let models_exists = {
            let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='models'")?;
            let mut rows = stmt.query([])?;
            rows.next()?.is_some()
        };

        if !models_exists {
            conn.execute(
                "CREATE TABLE IF NOT EXISTS models (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    source TEXT NOT NULL,
                    config TEXT NOT NULL,
                    last_used INTEGER DEFAULT 0
                )",
                [],
            )?;
        }

        // Migration: Check if workspaces table has metadata
        let workspaces_needs_migration = {
            let mut stmt = conn.prepare("PRAGMA table_info(workspaces)")?;
            let mut rows = stmt.query([])?;
            let mut has_metadata = false;
            while let Some(row) = rows.next()? {
                let name: String = row.get(1)?;
                if name == "metadata" {
                    has_metadata = true;
                }
            }
            !has_metadata
        };

        if workspaces_needs_migration {
            println!("[DB] Migrating workspaces table: adding metadata column");
            let _ = conn.execute("ALTER TABLE workspaces ADD COLUMN metadata TEXT", []);
        }

        // Migration: Check if sessions table exists and has workspace_id
        let needs_migration = {
            let mut stmt = conn.prepare("PRAGMA table_info(sessions)")?;
            let mut rows = stmt.query([])?;
            let mut has_workspace_id = false;
            let mut table_exists = false;
            while let Some(row) = rows.next()? {
                table_exists = true;
                let name: String = row.get(1)?;
                if name == "workspace_id" {
                    has_workspace_id = true;
                }
            }
            table_exists && !has_workspace_id
        };

        if needs_migration {
            println!("[DB] Migrating database: dropping old sessions and messages tables");
            conn.execute("DROP TABLE IF EXISTS messages", [])?;
            conn.execute("DROP TABLE IF EXISTS sessions", [])?;
        }

        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                path TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                contexts TEXT, -- Stores JSON array of contexts
                created_at INTEGER NOT NULL,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    }

    // Model methods
    pub fn add_or_update_model(&self, id: &str, name: &str, source: &str, config: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO models (id, name, source, config) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET name=?2, source=?3, config=?4",
            params![id, name, source, config],
        )?;
        Ok(())
    }

    pub fn set_last_used_model(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("UPDATE models SET last_used = 0", [])?;
        conn.execute("UPDATE models SET last_used = 1 WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_last_used_model(&self) -> Result<Option<DbModel>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, source, config, last_used FROM models WHERE last_used = 1 LIMIT 1")?;
        let mut rows = stmt.query_map([], |row| {
            Ok(DbModel {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
                config: row.get(3)?,
                last_used: row.get::<_, i32>(4)? != 0,
            })
        })?;

        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn list_models(&self, source: Option<&str>) -> Result<Vec<DbModel>> {
        let conn = self.conn.lock().unwrap();
        let mut query = "SELECT id, name, source, config, last_used FROM models".to_string();
        if source.is_some() {
            query.push_str(" WHERE source = ?1");
        }
        query.push_str(" ORDER BY name ASC");

        let mut stmt = conn.prepare(&query)?;
        
        let row_mapper = |row: &rusqlite::Row| {
            Ok(DbModel {
                id: row.get(0)?,
                name: row.get(1)?,
                source: row.get(2)?,
                config: row.get(3)?,
                last_used: row.get::<_, i32>(4)? != 0,
            })
        };

        let rows = if let Some(s) = source {
            stmt.query_map(params![s], row_mapper)?
        } else {
            stmt.query_map([], row_mapper)?
        };

        let mut models = Vec::new();
        for row in rows {
            models.push(row?);
        }
        Ok(models)
    }

    pub fn delete_model_entry(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM models WHERE id = ?1", params![id])?;
        Ok(())
    }

    // Workspace methods
    pub fn create_workspace(&self, name: &str, metadata: Option<&str>) -> Result<DbWorkspace> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        
        conn.execute(
            "INSERT INTO workspaces (id, name, metadata, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, metadata, now, now],
        )?;

        Ok(DbWorkspace {
            id,
            name: name.to_string(),
            metadata: metadata.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
        })
    }

    pub fn list_workspaces(&self, limit: Option<i32>) -> Result<Vec<DbWorkspace>> {
        let conn = self.conn.lock().unwrap();
        let query = if let Some(l) = limit {
            format!("SELECT id, name, metadata, created_at, updated_at FROM workspaces ORDER BY updated_at DESC LIMIT {}", l)
        } else {
            "SELECT id, name, metadata, created_at, updated_at FROM workspaces ORDER BY updated_at DESC".to_string()
        };
        
        let mut stmt = conn.prepare(&query)?;
        let rows = stmt.query_map([], |row| {
            Ok(DbWorkspace {
                id: row.get(0)?,
                name: row.get(1)?,
                metadata: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        let mut workspaces = Vec::new();
        for row in rows {
            workspaces.push(row?);
        }
        Ok(workspaces)
    }

    pub fn delete_workspace(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM workspaces WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn update_workspace_metadata(&self, id: &str, metadata: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE workspaces SET metadata = ?1, updated_at = ?2 WHERE id = ?3",
            params![metadata, now, id],
        )?;
        Ok(())
    }

    pub fn update_workspace_time(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE workspaces SET updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    pub fn find_workspace_by_doc_path(&self, path: &str) -> Result<Option<DbWorkspace>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT w.id, w.name, w.metadata, w.created_at, w.updated_at 
             FROM workspaces w
             JOIN documents d ON w.id = d.workspace_id
             WHERE d.path = ?1
             LIMIT 1"
        )?;
        let mut rows = stmt.query_map(params![path], |row| {
            Ok(DbWorkspace {
                id: row.get(0)?,
                name: row.get(1)?,
                metadata: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    // Document methods
    pub fn add_document(&self, workspace_id: &str, path: &str, name: &str) -> Result<DbDocument> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO documents (id, workspace_id, path, name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, workspace_id, path, name, now],
        )?;

        Ok(DbDocument {
            id,
            workspace_id: workspace_id.to_string(),
            path: path.to_string(),
            name: name.to_string(),
            created_at: now,
        })
    }

    pub fn get_documents(&self, workspace_id: &str) -> Result<Vec<DbDocument>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, workspace_id, path, name, created_at FROM documents WHERE workspace_id = ?1")?;
        let rows = stmt.query_map(params![workspace_id], |row| {
            Ok(DbDocument {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                path: row.get(2)?,
                name: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;

        let mut docs = Vec::new();
        for row in rows {
            docs.push(row?);
        }
        Ok(docs)
    }

    // Session methods
    pub fn create_session(&self, workspace_id: &str, name: &str) -> Result<DbSession> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();
        
        conn.execute(
            "INSERT INTO sessions (id, workspace_id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, workspace_id, name, now, now],
        )?;

        Ok(DbSession {
            id,
            workspace_id: workspace_id.to_string(),
            name: name.to_string(),
            created_at: now,
            updated_at: now,
        })
    }

    pub fn get_sessions(&self, workspace_id: &str) -> Result<Vec<DbSession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, workspace_id, name, created_at, updated_at FROM sessions WHERE workspace_id = ?1 ORDER BY updated_at DESC")?;
        let rows = stmt.query_map(params![workspace_id], |row| {
            Ok(DbSession {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(row?);
        }
        Ok(sessions)
    }

    pub fn delete_session(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn rename_session(&self, id: &str, name: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE sessions SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )?;
        Ok(())
    }

    pub fn add_message(&self, session_id: &str, role: &str, content: &str, contexts: Option<&str>) -> Result<DbMessage> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, contexts, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, session_id, role, content, contexts, now],
        )?;

        // Update session's updated_at
        conn.execute(
            "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
            params![now, session_id],
        )?;

        Ok(DbMessage {
            id,
            session_id: session_id.to_string(),
            role: role.to_string(),
            content: content.to_string(),
            contexts: contexts.map(|s| s.to_string()),
            created_at: now,
        })
    }

    pub fn get_messages(&self, session_id: &str) -> Result<Vec<DbMessage>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, session_id, role, content, contexts, created_at FROM messages WHERE session_id = ?1 ORDER BY created_at ASC")?;
        let rows = stmt.query_map(params![session_id], |row| {
            Ok(DbMessage {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                contexts: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut messages = Vec::new();
        for row in rows {
            messages.push(row?);
        }
        Ok(messages)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }
}
