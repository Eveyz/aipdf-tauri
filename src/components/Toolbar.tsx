import { open } from "@tauri-apps/plugin-dialog"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  MessageSquare,
  PanelLeft,
  Settings2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Bot,
} from "lucide-react"
import { usePdf } from "../hooks/usePdf"
import { useStore } from "../store"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

export function Toolbar() {
  const { openPdf, nextPage, prevPage, goToPage } = usePdf()
  const {
    pdfInfo,
    currentPage,
    zoom,
    setZoom,
    sidebarOpen,
    setSidebarOpen,
    chatOpen,
    setChatOpen,
    setModelManagerOpen,
    loadedModel,
  } = useStore()

  async function handleOpen() {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    })
    if (path) {
      await openPdf(path)
    }
  }

  function handleZoomIn() {
    setZoom(Math.min(zoom + 0.25, 4))
  }

  function handleZoomOut() {
    setZoom(Math.max(zoom - 0.25, 0.5))
  }

  function handleZoomReset() {
    setZoom(1.5)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-11 items-center gap-1 border-b px-2">
        {/* Open file */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpen}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open PDF</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Page info */}
        {pdfInfo && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPage}
                  disabled={currentPage <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous page</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1 text-sm">
              <Input
                className="h-7 w-14 text-center"
                type="number"
                min={1}
                max={pdfInfo.pageCount}
                value={currentPage + 1}
                onChange={(e) => goToPage(parseInt(e.target.value, 10) - 1)}
              />
              <span className="text-muted-foreground">/ {pdfInfo.pageCount}</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPage}
                  disabled={currentPage >= pdfInfo.pageCount - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next page</TooltipContent>
            </Tooltip>

            <div className="mx-1 h-5 w-px bg-border" />

            {/* Zoom */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>

            <span className="w-12 text-center text-sm text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset zoom</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* File name */}
        {pdfInfo && (
          <div className="ml-2 flex items-center gap-1.5 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-48 truncate text-muted-foreground">
              {pdfInfo.fileName}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Model status */}
        {loadedModel && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span className="max-w-32 truncate">{loadedModel.name}</span>
          </div>
        )}

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Toggle panels */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={sidebarOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={chatOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle chat</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setModelManagerOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Model manager</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
