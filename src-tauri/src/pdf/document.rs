use pdfium_render::prelude::*;
use super::renderer::RenderedPage;
use super::text::PageText;

pub struct PdfFile {
    path: String,
}

unsafe impl Send for PdfFile {}

impl PdfFile {
    pub fn open(path: &str) -> Result<Self, String> {
        println!("[PdfFile::open] attempting to bind to system pdfium library...");
        let bindings = Pdfium::bind_to_system_library()
            .map_err(|e| format!("Failed to load pdfium library: {}", e))?;
        println!("[PdfFile::open] pdfium library bound successfully");
        let pdfium = Pdfium::new(bindings);
        println!("[PdfFile::open] loading PDF from file: {}", path);
        let _doc = pdfium.load_pdf_from_file(path, None)
            .map_err(|e| format!("Failed to open PDF: {}", e))?;
        println!("[PdfFile::open] PDF loaded successfully");
        Ok(Self {
            path: path.to_string(),
        })
    }

    fn with_doc<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&PdfDocument<'_>) -> Result<R, String>,
    {
        let bindings = Pdfium::bind_to_system_library()
            .map_err(|e| format!("Failed to load pdfium library: {}", e))?;
        let pdfium = Pdfium::new(bindings);
        let document = pdfium.load_pdf_from_file(&self.path, None)
            .map_err(|e| format!("Failed to open PDF: {}", e))?;
        f(&document)
    }

    pub fn page_count(&self) -> u32 {
        self.with_doc(|doc| Ok(doc.pages().len() as u32)).unwrap_or(0)
    }

    pub fn page_dimensions(&self, page_index: u32) -> Option<(f32, f32)> {
        self.with_doc(|doc| {
            let page = doc.pages().get(page_index as u16)
                .map_err(|e| format!("Page not found: {}", e))?;
            let width = page.width().value as f32;
            let height = page.height().value as f32;
            Ok((width, height))
        }).ok()
    }

    pub fn render_page(&self, page_index: u32, scale: f32) -> Result<RenderedPage, String> {
        println!("[PdfFile::render_page] starting for page {} scale {}", page_index, scale);
        self.with_doc(|doc| {
            println!("[PdfFile::render_page] doc loaded, getting page {}...", page_index);
            let page = doc.pages().get(page_index as u16)
                .map_err(|e| format!("Page not found: {}", e))?;
            println!("[PdfFile::render_page] got page, creating render config...");

            let render_config = PdfRenderConfig::new()
                .set_target_width((page.width().value as f32 * scale) as i32)
                .set_target_height((page.height().value as f32 * scale) as i32)
                .render_form_data(true);
            println!("[PdfFile::render_page] rendering with config...");

            let bitmap = page.render_with_config(&render_config)
                .map_err(|e| format!("Render failed: {}", e))?;
            println!("[PdfFile::render_page] bitmap rendered, extracting bytes...");

            let rgba_bytes = bitmap.as_raw_bytes();
            let width = bitmap.width() as u32;
            let height = bitmap.height() as u32;
            println!("[PdfFile::render_page] bitmap size {}x{}", width, height);

            let mut png_data = Vec::new();
            {
                let mut encoder = png::Encoder::new(&mut png_data, width, height);
                encoder.set_color(png::ColorType::Rgba);
                encoder.set_depth(png::BitDepth::Eight);
                let mut writer = encoder.write_header()
                    .map_err(|e| format!("PNG header error: {}", e))?;
                writer.write_image_data(&rgba_bytes)
                    .map_err(|e| format!("PNG data error: {}", e))?;
            }
            println!("[PdfFile::render_page] png encoded, {} bytes", png_data.len());

            use base64::Engine;
            let image_base64 = base64::engine::general_purpose::STANDARD.encode(&png_data);
            println!("[PdfFile::render_page] base64 encoded, {} chars", image_base64.len());

            Ok(RenderedPage {
                width,
                height,
                image_base64,
            })
        })
    }

    pub fn extract_text(&self, page_index: u32) -> Result<PageText, String> {
        self.with_doc(|doc| {
            let page = doc.pages().get(page_index as u16)
                .map_err(|e| format!("Page not found: {}", e))?;
            let text_page = page.text()
                .map_err(|e| format!("Text extraction failed: {}", e))?;

            let full_text = text_page.all();

            let mut chars = Vec::new();
            let page_width = page.width().value as f32;
            let page_height = page.height().value as f32;

            for i in 0..text_page.chars().len() {
                if let Ok(char_info) = text_page.chars().get(i) {
                    let unicode: Option<char> = char_info.unicode_char();
                    if let Ok(bounds) = char_info.tight_bounds() {
                        chars.push(super::text::CharInfo {
                            char_index: i as u32,
                            unicode: unicode.unwrap_or(' '),
                            x: bounds.left().value as f32,
                            y: bounds.bottom().value as f32,
                            width: (bounds.right().value - bounds.left().value) as f32,
                            height: (bounds.top().value - bounds.bottom().value) as f32,
                        });
                    }
                }
            }

            Ok(PageText {
                full_text,
                chars,
                page_width,
                page_height,
            })
        })
    }
}
