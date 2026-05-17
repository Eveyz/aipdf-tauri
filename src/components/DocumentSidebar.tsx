import { useState } from "react"
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
  Highlighter,
  FileSearch,
  Plus,
  File,
  Trash2,
} from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { useStore, OutlineItem } from "../store"
import { usePdf } from "../hooks/usePdf"
import { cn } from "../lib/utils"

type SidebarTab = "outline" | "extraction" | "highlights"

const TABS: { id: SidebarTab; label: string; icon: typeof FileText }[] = [
  { id: "outline", label: "Outline", icon: FileText },
  { id: "extraction", label: "Extraction", icon: Sparkles },
  { id: "highlights", label: "Highlights", icon: Highlighter },
]

// Mock extraction data
const MOCK_EXTRACTIONS = {
  models: [
    { title: "AlphaFold", subtitle: "3D protein structure prediction", page: 4 },
    { title: "Generative Model", subtitle: "Image synthesis via text prompt", page: 4 },
  ],
  concepts: [
    { title: "Unsupervised Learning", subtitle: "Training on unlabelled data", page: 4 },
    { title: "Transfer Learning", subtitle: "Reusing pre-trained representations", page: 6 },
    { title: "Attention Mechanism", subtitle: "Learning contextual dependencies", page: 8 },
  ],
}

function EmptyState({ icon: Icon, message }: { icon: typeof FileText; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center px-6">
      <Icon className="text-gray-300 w-8 h-8 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-gray-500 font-medium">{message}</p>
    </div>
  )
}

function PageTag({ page }: { page: number }) {
  return (
    <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
      p.{page}
    </span>
  )
}

function OutlineItemRow({ item }: { item: OutlineItem }) {
  const { goToPage } = usePdf()
  const { currentPage } = useStore()
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = item.items && item.items.length > 0
  const isActive = currentPage === item.pageIndex

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-center gap-0.5 group py-0.5 pr-4 transition-colors cursor-pointer hover:bg-gray-100/50 rounded-sm mx-1",
          isActive && "bg-gray-100 text-gray-900 font-medium"
        )}
        style={{ paddingLeft: `${(item.level - 1) * 12 + 4}px` }}
        onClick={() => goToPage(item.pageIndex)}
      >
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) setIsOpen(!isOpen)
          }}
          className={cn(
            "p-1 rounded hover:bg-gray-200/50 transition-colors flex items-center justify-center shrink-0",
            !hasChildren && "invisible"
          )}
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
        </div>
        <span
          className={cn(
            "flex-1 text-left truncate transition-colors",
            item.level === 1 ? "text-[13px] text-gray-800" : "text-xs text-gray-600",
            isActive && "text-gray-900"
          )}
        >
          {item.title}
        </span>
      </div>
      {hasChildren && isOpen && (
        <div className="w-full">
          {item.items?.map((subItem, i) => (
            <OutlineItemRow key={`${subItem.title}-${i}`} item={subItem} />
          ))}
        </div>
      )}
    </div>
  )
}

function OutlineTab() {
  const { pdfOutline } = useStore()

  if (pdfOutline.length === 0) {
    return <EmptyState icon={FileText} message="No outline available for this document." />
  }

  return (
    <div className="py-2">
      {pdfOutline.map((item, i) => (
        <OutlineItemRow key={`${item.title}-${i}`} item={item} />
      ))}
    </div>
  )
}

function ExtractionTab() {
  const { goToPage } = usePdf()
  const hasData = MOCK_EXTRACTIONS.models.length > 0 || MOCK_EXTRACTIONS.concepts.length > 0

  if (!hasData) {
    return <EmptyState icon={FileSearch} message="No entities extracted yet." />
  }

  return (
    <div className="py-2">
      {MOCK_EXTRACTIONS.models.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mt-4 mb-2 px-4">
            Key Models
          </p>
          {MOCK_EXTRACTIONS.models.map((item, i) => (
            <button
              key={i}
              onClick={() => goToPage(item.page - 1)}
              className="w-full text-left flex flex-col gap-1 p-2.5 mb-2 mx-4 bg-gray-50/80 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              style={{ width: "calc(100% - 2rem)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
                <PageTag page={item.page} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{item.subtitle}</p>
            </button>
          ))}
        </>
      )}

      {MOCK_EXTRACTIONS.concepts.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mt-4 mb-2 px-4">
            Core Concepts
          </p>
          {MOCK_EXTRACTIONS.concepts.map((item, i) => (
            <button
              key={i}
              onClick={() => goToPage(item.page - 1)}
              className="w-full text-left flex flex-col gap-1 p-2.5 mb-2 mx-4 bg-gray-50/80 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
              style={{ width: "calc(100% - 2rem)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
                <PageTag page={item.page} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-1">{item.subtitle}</p>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

function HighlightsTab() {
  const { goToPage } = usePdf()
  const { highlights, lastPdfPath, deleteHighlight } = useStore()
  
  const docHighlights = [...highlights]
    .filter(h => h.documentPath === lastPdfPath)
    .sort((a, b) => {
      if (a.position.pageNumber !== b.position.pageNumber) {
        return a.position.pageNumber - b.position.pageNumber
      }
      return (a.position.boundingRect?.y1 || 0) - (b.position.boundingRect?.y1 || 0)
    })

  if (docHighlights.length === 0) {
    return <EmptyState icon={Highlighter} message="No highlights saved yet. Select text in the PDF to add some." />
  }

  return (
    <div className="py-2">
      {docHighlights.map((highlight) => (
        <div
          key={highlight.id}
          className="relative mx-4 mb-3 group"
        >
          <button
            onClick={() => goToPage(highlight.position.pageNumber - 1)}
            className="w-full text-left relative p-3 bg-white border border-gray-150 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all cursor-pointer overflow-hidden pr-8"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400" />
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-2 italic">
              "{highlight.content.text || "Area highlight"}"
            </p>
            {highlight.comment?.text && (
              <div className="bg-yellow-50/50 p-2 rounded-md mb-2 border border-yellow-100/50">
                <p className="text-xs text-gray-800 font-medium whitespace-pre-wrap">
                  {highlight.comment.text}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <PageTag page={highlight.position.pageNumber} />
              {highlight.createdAt && (
                <span className="text-[10px] text-gray-400">
                  {new Date(highlight.createdAt).toLocaleString(undefined, { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteHighlight(highlight.id)
            }}
            className="absolute right-2 top-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"
            title="Delete highlight"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

import { open } from "@tauri-apps/plugin-dialog"

export function DocumentSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("outline")
  const { pdfInfo, documents, workspaces, activeWorkspaceId, addDocument } = useStore()
  const { openPdf } = usePdf()

  async function handleAddFile() {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      })
      if (path && typeof path === 'string') {
        await addDocument(path)
        await openPdf(path)
      }
    } catch (e) {
      console.error("Failed to add file:", e)
    }
  }

  if (!activeWorkspaceId && !pdfInfo) return null

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  const isQuickRead = activeWorkspace?.type === "quick_read"

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white">
      {/* Top Section: FILES (Workspace) */}
      {!isQuickRead && (
        <div className="flex flex-col h-1/3 min-h-[200px] border-b border-gray-200">
          <div className="shrink-0 px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
            <span>Files</span>
            <button 
              onClick={handleAddFile}
              className="hover:text-gray-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <ScrollArea className="scrollbar-thin flex-1">
            <div className="flex flex-col gap-0.5 px-2 pb-2">
              {documents.map((file) => {
                const isActive = pdfInfo?.fileName === file.name
                return (
                  <div
                    key={file.id}
                    onClick={() => !isActive && openPdf(file.path)}
                    className={cn(
                      "mx-2 px-2 py-1.5 flex items-center gap-2 text-sm rounded-md cursor-pointer transition-colors group",
                      isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <File className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{file.name}</span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Bottom Section: ACTIVE DOCUMENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3 pb-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Active Document
        </div>

        {!pdfInfo ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <p className="text-xs text-gray-400 italic leading-relaxed">
              No document selected. {isQuickRead ? "Please wait for PDF to load." : "Select a file from above to view its details."}
            </p>
          </div>
        ) : (
          <>
            <div className="shrink-0">
              <div className="flex items-center gap-4 px-4 pt-2 pb-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 pb-2.5 transition-colors text-xs border-b-2",
                      activeTab === tab.id
                        ? "text-gray-900 font-medium border-gray-900"
                        : "text-gray-400 hover:text-gray-600 font-normal border-transparent"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="h-px bg-gray-100 mx-4" />
            </div>

            <ScrollArea className="scrollbar-thin min-h-0 flex-1">
              {activeTab === "outline" && <OutlineTab />}
              {activeTab === "extraction" && <ExtractionTab />}
              {activeTab === "highlights" && <HighlightsTab />}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}
