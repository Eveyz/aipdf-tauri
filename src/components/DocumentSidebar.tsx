import { useState } from "react"
import {
  FileText,
  Sparkles,
  StickyNote,
  FileSearch,
  Feather,
  Calendar,
  Plus,
  File,
} from "lucide-react"
import { ScrollArea } from "./ui/scroll-area"
import { useStore } from "../store"
import { usePdf } from "../hooks/usePdf"
import { cn } from "../lib/utils"

type SidebarTab = "outline" | "extraction" | "notes"

const TABS: { id: SidebarTab; label: string; icon: typeof FileText }[] = [
  { id: "outline", label: "Outline", icon: FileText },
  { id: "extraction", label: "Extraction", icon: Sparkles },
  { id: "notes", label: "Notes", icon: StickyNote },
]

// Mock files data
const MOCK_FILES = [
  { id: "1", name: "deep_learning.pdf", active: true },
  { id: "2", name: "nvidia_slm.pdf", active: false },
]

// Mock outline data
const MOCK_OUTLINE = [
  { level: 1, title: "Preface", page: 1 },
  { level: 1, title: "Introduction to the Field", page: 3 },
  { level: 2, title: "Historical Context", page: 3 },
  { level: 2, title: "Scope and Methodology", page: 5 },
  { level: 1, title: "Core Concepts", page: 8 },
  { level: 2, title: "Fundamental Theorems", page: 8 },
  { level: 3, title: "The First Principle", page: 9 },
  { level: 3, title: "Corollary 1.1", page: 11 },
  { level: 2, title: "Mathematical Framework", page: 13 },
  { level: 1, title: "Applications", page: 18 },
  { level: 2, title: "Case Study: Financial Markets", page: 19 },
  { level: 2, title: "Case Study: Signal Processing", page: 24 },
  { level: 1, title: "Conclusion", page: 30 },
  { level: 1, title: "References", page: 32 },
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

// Mock notes data
const MOCK_NOTES = [
  {
    id: "1",
    text: "In the two applications discussed so far, a neural network learned to transform an input... into an output...",
    page: 4,
    color: "bg-yellow-400",
    date: "Oct 2023",
    source: "highlight" as const,
  },
  {
    id: "2",
    text: "The key insight is that deep learning models can learn hierarchical representations, where each layer captures increasingly abstract features of the input data.",
    page: 6,
    color: "bg-blue-400",
    date: "Nov 2023",
    source: "ai" as const,
  },
  {
    id: "3",
    text: "Attention mechanisms allow the model to focus on relevant parts of the input when producing each element of the output, enabling better handling of long-range dependencies.",
    page: 8,
    color: "bg-green-400",
    date: "Nov 2023",
    source: "highlight" as const,
  },
]

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

function OutlineTab() {
  const { goToPage } = usePdf()
  const { currentPage } = useStore()

  if (MOCK_OUTLINE.length === 0) {
    return <EmptyState icon={FileText} message="No outline available yet." />
  }

  return (
    <div className="py-2">
      {MOCK_OUTLINE.map((item, i) => (
        <button
          key={i}
          onClick={() => goToPage(item.page - 1)}
          className={cn(
            "w-full text-left transition-colors cursor-pointer",
            item.level === 1 && "text-sm text-gray-800 font-medium py-1.5 px-4",
            item.level === 2 && "text-xs text-gray-500 hover:text-gray-900 py-1 pl-8 pr-4",
            item.level === 3 && "text-xs text-gray-400 hover:text-gray-800 py-1 pl-12 pr-4",
            currentPage === item.page - 1 && "text-gray-900 bg-gray-50"
          )}
        >
          {item.title}
        </button>
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

function NotesTab() {
  const { goToPage } = usePdf()

  if (MOCK_NOTES.length === 0) {
    return <EmptyState icon={Feather} message="No notes saved yet." />
  }

  return (
    <div className="py-2">
      {MOCK_NOTES.map((note) => (
        <button
          key={note.id}
          onClick={() => goToPage(note.page - 1)}
          className="w-full text-left relative mx-4 mb-3 p-3 bg-white border border-gray-150 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all cursor-pointer overflow-hidden"
          style={{ width: "calc(100% - 2rem)" }}
        >
          <div className={cn("absolute left-0 top-0 bottom-0 w-1", note.color)} />
          <div className="pl-2">
            <p className="text-xs text-gray-700 leading-relaxed italic line-clamp-3">{note.text}</p>
            <div className="flex items-center gap-2 mt-2">
              <PageTag page={note.page} />
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Calendar className="h-2.5 w-2.5" />
                {note.date}
              </span>
              {note.source === "ai" && (
                <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export function DocumentSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("outline")
  const { pdfInfo } = useStore()

  if (!pdfInfo) return null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white">
      {/* Top Section: FILES (Workspace) */}
      <div className="flex flex-col h-1/3 min-h-[200px] border-b border-gray-200">
        <div className="shrink-0 px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
          <span>Files</span>
          <button className="hover:text-gray-600 transition-colors">
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <ScrollArea className="scrollbar-thin flex-1">
          <div className="flex flex-col gap-0.5 px-2 pb-2">
            {MOCK_FILES.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "mx-2 px-2 py-1.5 flex items-center gap-2 text-sm rounded-md cursor-pointer transition-colors group",
                  file.active
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <File className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Section: ACTIVE DOCUMENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 pt-3 pb-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Active Document
        </div>

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
          {activeTab === "notes" && <NotesTab />}
        </ScrollArea>
      </div>
    </div>
  )
}