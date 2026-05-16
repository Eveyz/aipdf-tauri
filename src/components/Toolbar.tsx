import { useState, useEffect } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  PanelLeft,
  Settings2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Home,
  FolderPlus,
  Network,
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
  const { nextPage, prevPage, goToPage } = usePdf()
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
    workspaces,
    activeWorkspaceId,
    upgradeWorkspace,
    mindmapOpen,
    setMindmapOpen,
  } = useStore()

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const isQuickRead = activeWorkspace?.type === "quick_read"

  const [pageInput, setPageInput] = useState((currentPage + 1).toString())

  useEffect(() => {
    setPageInput((currentPage + 1).toString())
  }, [currentPage])

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value)
    if (e.target.value !== "") {
      const page = parseInt(e.target.value, 10)
      if (!isNaN(page)) {
        goToPage(page - 1)
      }
    }
  }

  const handlePageInputBlur = () => {
    if (pageInput === "" || isNaN(parseInt(pageInput, 10))) {
      setPageInput((currentPage + 1).toString())
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
      <div className="flex h-11 items-center gap-1 border-b px-2 bg-white">
        <div className="flex items-center gap-2 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => useStore.setState({ activeWorkspaceId: null, pdfInfo: null })}
              >
                <Home className="h-4 w-4 text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Dashboard</TooltipContent>
          </Tooltip>
          
          {activeWorkspace && (
            <div className="flex items-center gap-2 text-sm font-medium text-gray-400 select-none">
              <span>/</span>
              <span className="text-gray-900 truncate max-w-[150px]">{activeWorkspace.name}</span>
            </div>
          )}
        </div>

        {isQuickRead && activeWorkspaceId && (
          <button
            onClick={() => upgradeWorkspace(activeWorkspaceId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors ml-2 mr-1 group"
          >
            <FolderPlus className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
            <span>Convert to Workspace</span>
          </button>
        )}

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
                className="h-7 w-14 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                type="number"
                min={1}
                max={pdfInfo.pageCount}
                value={pageInput}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
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

        {/* Mindmap */}
        {pdfInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors mr-2 ${
                  mindmapOpen ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setMindmapOpen(!mindmapOpen)}
              >
                <Network className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Mindmap (Cmd/Ctrl+M)</TooltipContent>
          </Tooltip>
        )}

        {/* Toggle panels */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                sidebarOpen ? "bg-gray-100 text-gray-800" : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                chatOpen ? "bg-gray-100 text-gray-800" : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle chat</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setModelManagerOpen(true)}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Model manager</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
