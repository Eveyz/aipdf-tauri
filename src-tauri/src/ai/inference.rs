use tauri::{AppHandle, Emitter};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Clone, serde::Serialize)]
pub struct TokenPayload {
    pub token: String,
    pub token_id: i64,
    pub is_final: bool,
}

/// Run autoregressive text generation with streaming token output.
pub async fn generate(
    app: AppHandle,
    session: &mut crate::ai::session::AiSession,
    tokenizer: &crate::ai::tokenizer::AiTokenizer,
    prompt: &str,
    max_tokens: usize,
    temperature: f32,
    cancel: Arc<AtomicBool>,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let mut all_token_ids = tokenizer.encode(prompt)
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.to_string().into() })?;

    let mut generated_text = String::new();

    // Discover session input/output structure
    let input_names: Vec<String> = session.session.inputs().iter()
        .map(|i| i.name().to_string())
        .collect();
    let output_names: Vec<String> = session.session.outputs().iter()
        .map(|o| o.name().to_string())
        .collect();

    // Find logits output (usually named "logits" or "output")
    let logits_name = output_names.iter()
        .find(|n: &&String| n.contains("logits"))
        .or(output_names.first())
        .cloned()
        .unwrap_or_else(|| "logits".to_string());

    // Find past key value inputs/outputs for KV cache
    let past_key_names: Vec<&String> = input_names.iter()
        .filter(|n: &&String| n.contains("past_key") || n.contains("past"))
        .collect();
    let present_key_names: Vec<&String> = output_names.iter()
        .filter(|n: &&String| n.contains("present_key") || n.contains("present"))
        .collect();

    for step in 0..max_tokens {
        if cancel.load(Ordering::Relaxed) {
            break;
        }

        // Prepare input tensor
        let input_ids: Vec<i64> = if step == 0 {
            all_token_ids.clone()
        } else {
            vec![*all_token_ids.last().unwrap()]
        };

        // Create input tensor
        let seq_len = input_ids.len();
        let shape = [1, seq_len];
        let input_tensor = ort::inputs![
            "input_ids" => ort::value::TensorRef::from_array_view(
                (shape, input_ids.as_slice())
            )?
        ];

        // Run inference
        let outputs = session.session.run(input_tensor)
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> {
                format!("Inference error: {}", e).into()
            })?;

        // Extract logits - get the last position's logits for next token prediction
        let (logits_shape, logits_data) = outputs[logits_name.as_str()].try_extract_tensor::<f32>()
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> {
                format!("Failed to extract logits: {}", e).into()
            })?;

        let vocab_size = logits_shape[logits_shape.len() - 1] as usize;

        // Get logits for the last token position
        let offset = if logits_shape.len() == 3 {
            // [batch, seq, vocab]
            (seq_len - 1) * vocab_size
        } else {
            0
        };
        let last_logits: Vec<f32> = (0..vocab_size)
            .map(|i| logits_data[offset + i])
            .collect();

        // Sample next token (greedy or temperature)
        let next_token_id = if temperature <= 0.01 {
            // Greedy: argmax
            last_logits.iter()
                .enumerate()
                .max_by(|(_, a): &(usize, &f32), (_, b): &(usize, &f32)| a.partial_cmp(b).unwrap())
                .map(|(i, _)| i as i64)
                .unwrap_or(0)
        } else {
            // Temperature sampling
            sample_with_temperature(&last_logits, temperature)
        };

        // Decode the new token
        let token_text = tokenizer.decode(&[next_token_id])
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.to_string().into() })?;

        generated_text.push_str(&token_text);
        all_token_ids.push(next_token_id);

        // Emit streaming token to frontend
        app.emit("ai-token", TokenPayload {
            token: token_text,
            token_id: next_token_id,
            is_final: false,
        }).map_err(|e| -> Box<dyn std::error::Error + Send + Sync> {
            format!("Event emit error: {}", e).into()
        })?;

        // Check for EOS
        if Some(next_token_id) == tokenizer.eos_token_id() {
            break;
        }
    }

    // Emit final token
    app.emit("ai-token", TokenPayload {
        token: String::new(),
        token_id: 0,
        is_final: true,
    }).map_err(|e| -> Box<dyn std::error::Error + Send + Sync> {
        format!("Event emit error: {}", e).into()
    })?;

    Ok(generated_text)
}

fn sample_with_temperature(logits: &[f32], temperature: f32) -> i64 {
    // Apply temperature scaling
    let scaled: Vec<f32> = logits.iter().map(|&l| l / temperature).collect();

    // Softmax
    let max_val = scaled.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let exp_sum: f32 = scaled.iter().map(|&v| (v - max_val).exp()).sum();
    let probs: Vec<f32> = scaled.iter().map(|&v| (v - max_val).exp() / exp_sum).collect();

    // Sample from distribution using simple random
    let r = pseudo_random();
    let mut cumulative = 0.0;
    for (i, &p) in probs.iter().enumerate() {
        cumulative += p;
        if r <= cumulative {
            return i as i64;
        }
    }
    (probs.len() - 1) as i64
}

fn pseudo_random() -> f32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    (nanos % 1000000) as f32 / 1000000.0
}
