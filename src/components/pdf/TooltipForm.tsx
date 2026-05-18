import { useState } from "react"
import { Plus, Edit2, Languages, AlertCircle } from "lucide-react"
import { useAi } from "../../hooks/useAi"
import { cn } from "../../lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { NewHighlight } from "react-pdf-highlighter"

interface TooltipFormProps {
  content: { text?: string; image?: string }
  position: any
  hideTipAndSelection: () => void
  transformSelection: () => void
  addHighlightToStore: (h: NewHighlight) => void
  addChatContext: (c: any) => void
}

export function TooltipForm({
  content,
  position,
  hideTipAndSelection,
  transformSelection,
  addHighlightToStore,
  addChatContext
}: TooltipFormProps) {
  const [mode, setMode] = useState<"menu" | "note" | "translate">("menu")
  const [noteText, setNoteText] = useState("")
  const [translation, setTranslation] = useState<string>("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [targetLang, setTargetLang] = useState("English")
  
  const translateText = useAi().translateText
  const loadedModel = useStore((state) => state.loadedModel)

  const handleTranslate = async (lang: string) => {
    if (!content.text) return
    setTargetLang(lang)
    setMode("translate")
    setIsTranslating(true)
    setTranslation("")
    
    try {
      const result = await translateText(content.text, lang)
      setTranslation(result)
    } catch (e) {
      console.error("Translation failed:", e)
      const errorMsg = e instanceof Error ? e.message : "Translation failed. Check if a model is loaded."
      setTranslation(errorMsg)
    } finally {
      setIsTranslating(false)
    }
  }

  if (mode === "translate") {
    const isSingleWord = content.text?.trim().split(/\s+/).length === 1

    return (
      <div 
        onMouseOver={() => transformSelection()}
        className="flex flex-col bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl w-80 overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        <div className="px-4 py-3 border-b border-gray-100/50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {isSingleWord ? "Dictionary Lookup" : "Translation"}
            </span>
          </div>
          <select 
            className="text-[11px] font-medium bg-transparent border-none outline-none text-blue-600 cursor-pointer"
            value={targetLang}
            onChange={(e) => handleTranslate(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Chinese">Chinese</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Source</span>
            <p className={cn(
              "text-gray-900 font-medium leading-snug",
              isSingleWord ? "text-xl font-serif" : "text-sm"
            )}>
              {content.text}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">Result</span>
            <div className="max-h-52 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
              {isTranslating ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              ) : (
                <div className="prose prose-sm max-w-full text-gray-800 text-[13px] leading-relaxed overflow-x-auto">
                  {translation ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-950 mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-[14px] font-semibold text-gray-900 mt-3 mb-1.5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[13px] font-medium text-gray-800 mt-2 mb-1" {...props} />,
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-3 border border-gray-200 rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 text-[12px]" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gray-50 text-gray-900 font-semibold" {...props} />,
                        th: ({node, ...props}) => <th className="px-3 py-2 text-left" {...props} />,
                        td: ({node, ...props}) => <td className="px-3 py-2 text-gray-600 border-t border-gray-100" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-950" {...props} />,
                      }}
                    >
                      {translation}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-gray-400 italic">No translation available. Check if a model is loaded.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100/50 flex items-center justify-between">
          {!loadedModel && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              Model required
            </div>
          )}
          <div className="flex-1" />
          <button 
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            onClick={() => hideTipAndSelection()}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  if (mode === "note") {
    return (
      <div 
        onMouseOver={() => transformSelection()}
        className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl w-64 animate-in fade-in zoom-in duration-200"
      >
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter your note..."
          className="w-full text-sm p-2 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none h-20 text-gray-900"
        />
        <div className="flex items-center justify-end gap-2 mt-1">
          <button 
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => hideTipAndSelection()}
          >
            Cancel
          </button>
          <button 
            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
            onClick={() => {
              addHighlightToStore({ content, position, comment: { text: noteText, emoji: "" } })
              hideTipAndSelection()
            }}
          >
            Save Note
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      onMouseOver={() => transformSelection()}
      className="flex items-center gap-1 p-1 bg-gray-900 rounded-md shadow-lg animate-in fade-in zoom-in duration-200"
    >
      <button 
        className="px-3 py-1.5 text-[13px] text-white font-medium hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5"
        onClick={() => {
          if (content.text) {
            addChatContext({
              type: "text",
              content: content.text,
              label: content.text.slice(0, 30) + (content.text.length > 30 ? "..." : ""),
              id: crypto.randomUUID(),
            })
          }
          hideTipAndSelection()
        }}
      >
        <Plus className="w-3.5 h-3.5"/>
        Add to Chat
      </button>
      <div className="w-[1px] h-4 bg-gray-700 mx-1" />
      <button 
        className="px-3 py-1.5 text-[13px] text-white font-medium hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5"
        onClick={() => setMode("note")}
      >
        <Edit2 className="w-3.5 h-3.5"/>
        Add Note
      </button>
      <div className="w-[1px] h-4 bg-gray-700 mx-1" />
      <button 
        className="px-3 py-1.5 text-[13px] text-white font-medium hover:bg-gray-800 rounded transition-colors flex items-center gap-1.5"
        onClick={() => handleTranslate("English")}
      >
        <Languages className="w-3.5 h-3.5"/>
        Translate
      </button>
    </div>
  )
}
