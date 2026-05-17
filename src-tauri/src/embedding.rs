use ort::session::{Session, builder::GraphOptimizationLevel};
use ort::inputs;
use tokenizers::Tokenizer;
use std::path::Path;
use ndarray::Array2;

pub struct EmbeddingEngine {
    pub session: Session,
    pub tokenizer: Tokenizer,
}

impl EmbeddingEngine {
    /// Creates a new EmbeddingEngine by loading the ONNX model and the Tokenizer.
    pub fn new(model_path: &Path, tokenizer_path: &Path) -> Result<Self, String> {
        println!("[EmbeddingEngine] Explicitly initializing ORT...");
        let _ = ort::init()
            .with_name("aipdf-embeddings")
            .commit();

        println!("[EmbeddingEngine] Loading tokenizer from {:?}", tokenizer_path);
        let tokenizer = Tokenizer::from_file(tokenizer_path)
            .map_err(|e| format!("Failed to load tokenizer: {}", e))?;
        println!("[EmbeddingEngine] Tokenizer loaded successfully.");
        
        println!("[EmbeddingEngine] Reading model bytes from {:?}", model_path);
        let model_bytes = std::fs::read(model_path)
            .map_err(|e| format!("Failed to read model file: {}", e))?;
        println!("[EmbeddingEngine] Model bytes read: {} MB", model_bytes.len() / 1024 / 1024);

        println!("[EmbeddingEngine] Creating ONNX session from memory...");
        let session = Session::builder()
            .map_err(|e| format!("Failed to create session builder: {}", e))?
            .with_optimization_level(GraphOptimizationLevel::Level1)
            .map_err(|e| format!("Failed to set optimization level: {}", e))?
            .with_intra_threads(1)
            .map_err(|e| format!("Failed to set intra threads: {}", e))?
            .with_inter_threads(1)
            .map_err(|e| format!("Failed to set inter threads: {}", e))?
            .commit_from_memory(&model_bytes)
            .map_err(|e| format!("Failed to load ONNX model from memory: {}", e))?;
        println!("[EmbeddingEngine] ONNX session created successfully.");
            
        Ok(Self { session, tokenizer })
    }

    /// Generates a normalized embedding for the given text using the [CLS] token.
    pub fn generate_embedding(&mut self, text: &str) -> Result<Vec<f32>, String> {
        // 1. Tokenize text (with special tokens enabled)
        let encoding = self.tokenizer.encode(text, true)
            .map_err(|e| format!("Failed to tokenize text: {}", e))?;
        
        // 2. Prepare sequences
        let input_ids: Vec<i64> = encoding.get_ids().iter().map(|&x| x as i64).collect();
        let attention_mask: Vec<i64> = encoding.get_attention_mask().iter().map(|&x| x as i64).collect();
        let token_type_ids: Vec<i64> = encoding.get_type_ids().iter().map(|&x| x as i64).collect();
        
        let seq_len = input_ids.len();
        
        // 3. Prepare 2D arrays (batch_size = 1)
        let input_ids_array = Array2::from_shape_vec((1, seq_len), input_ids)
            .map_err(|e| format!("Failed to create input_ids array: {}", e))?;
        let attention_mask_array = Array2::from_shape_vec((1, seq_len), attention_mask)
            .map_err(|e| format!("Failed to create attention_mask array: {}", e))?;
        let token_type_ids_array = Array2::from_shape_vec((1, seq_len), token_type_ids)
            .map_err(|e| format!("Failed to create token_type_ids array: {}", e))?;

        // Create Tensor from arrays
        let input_ids_tensor = ort::value::Tensor::from_array(input_ids_array)
            .map_err(|e| format!("Failed to create tensor: {}", e))?;
        let attention_mask_tensor = ort::value::Tensor::from_array(attention_mask_array)
            .map_err(|e| format!("Failed to create tensor: {}", e))?;
        let token_type_ids_tensor = ort::value::Tensor::from_array(token_type_ids_array)
            .map_err(|e| format!("Failed to create tensor: {}", e))?;

        // 4. Run ONNX session
        // 4. Run ONNX session
        let inputs_map = inputs! {
            "input_ids" => input_ids_tensor,
            "attention_mask" => attention_mask_tensor,
            "token_type_ids" => token_type_ids_tensor,
        };

        let outputs = self.session.run(inputs_map)
            .map_err(|e| format!("Failed to run model: {}", e))?;

        // 5. Extract last_hidden_state
        let (shape, data) = outputs["last_hidden_state"]
            .try_extract_tensor::<f32>()
            .map_err(|e| format!("Failed to extract last_hidden_state: {}", e))?;
            
        // Shape of output_tensor is usually (batch_size, seq_len, hidden_size)
        // Extract the [CLS] token vector, which is the first token (index 0) of the first batch (index 0).
        // Since data is C-contiguous, the first `hidden_size` elements correspond to the [CLS] token.
        let hidden_size = shape[2] as usize;
        let mut cls_vector = data[..hidden_size].to_vec();
        
        // 6. Perform L2 Normalization
        let mut sum_sq: f32 = 0.0;
        for &val in &cls_vector {
            sum_sq += val * val;
        }
        let norm = sum_sq.sqrt();
        // Prevent division by zero
        let norm = if norm == 0.0 { 1e-12 } else { norm }; 
        
        for val in &mut cls_vector {
            *val /= norm;
        }

        Ok(cls_vector)
    }
}
