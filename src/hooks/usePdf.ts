import { invoke } from "@tauri-apps/api/core"
import { useStore } from "../store"

interface PdfInfoResult {
  file_name: string
  page_count: number
  page_width: number
  page_height: number
}

interface RenderResult {
  width: number
  height: number
  image_base64: string
}

export interface PageTextResult {
  full_text: string
  chars: Array<{
    char_index: number
    unicode: string
    x: number
    y: number
    width: number
    height: number
  }>
  page_width: number
  page_height: number
}

export function usePdf() {
  const { setPdfInfo, setCurrentPage, setRenderedPage, pdfInfo, currentPage, zoom, renderedPages } = useStore()

  async function openPdf(path: string) {
    const info = await invoke<PdfInfoResult>("open_pdf", { path })
    setPdfInfo({
      fileName: info.file_name,
      pageCount: info.page_count,
      pageWidth: info.page_width,
      pageHeight: info.page_height,
    })
    return info
  }

  async function renderPage(pageIndex: number, scale?: number) {
    const s = scale ?? zoom
    console.log(`[usePdf] invoking render_page for page ${pageIndex} scale ${s}`)
    const result = await invoke<RenderResult>("render_page", { pageIndex, scale: s })
    console.log(`[usePdf] render_page returned, image_base64 length: ${result.image_base64.length}`)
    setRenderedPage(pageIndex, result.image_base64)
    console.log(`[usePdf] setRenderedPage called`)
    return result
  }

  async function getPageText(pageIndex: number) {
    return await invoke<PageTextResult>("get_page_text", { pageIndex })
  }

  async function closePdf() {
    await invoke("close_pdf")
    setPdfInfo(null)
  }

  async function goToPage(page: number) {
    if (!pdfInfo) return
    const clamped = Math.max(0, Math.min(page, pdfInfo.pageCount - 1))
    setCurrentPage(clamped)
    if (!renderedPages[clamped]) {
      await renderPage(clamped)
    }
  }

  async function nextPage() {
    await goToPage(currentPage + 1)
  }

  async function prevPage() {
    await goToPage(currentPage - 1)
  }

  return { openPdf, renderPage, getPageText, closePdf, goToPage, nextPage, prevPage }
}
