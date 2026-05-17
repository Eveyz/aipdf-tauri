use tokio::fs::File;
use tokio::io::AsyncReadExt;
use blake3::Hasher;

/// This command calculates a unique BLAKE3 hash for a given file.
/// We use an asynchronous chunked reading approach (64KB chunks) to ensure
/// O(1) memory usage (so we don't load a 500MB+ PDF into memory).
/// Being async, this process doesn't block the UI thread during hashing,
/// which provides near-instant performance combined with BLAKE3's speed.
#[tauri::command]
pub async fn get_file_hash(file_path: String) -> Result<String, String> {
    let mut file = File::open(&file_path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let mut hasher = Hasher::new();
    let mut buffer = [0u8; 65536]; // 64KB buffer

    loop {
        let bytes_read = file.read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file: {}", e))?;
            
        if bytes_read == 0 {
            break; // EOF
        }
        
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hasher.finalize().to_hex().to_string())
}
