import { FilePlus, Plus } from "lucide-react"
import { usePdf } from "../../hooks/usePdf"
import { useStore, type Document } from "../../store"
import { open } from "@tauri-apps/plugin-dialog"

export function NoDocumentsState() {
  const { addDocument } = useStore()
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

  return (
    <div className="flex h-full items-center justify-center bg-[#F9F9FB] text-gray-500">
      <div className="text-center">
        <p className="mb-4">No documents in this workspace</p>
        <button 
          onClick={handleAddFile} 
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black transition-colors shadow-sm mx-auto"
        >
          <FilePlus className="h-4 w-4" />
          Add PDF to Workspace
        </button>
      </div>
    </div>
  )
}

interface SelectDocumentStateProps {
  documents: Document[]
}

export function SelectDocumentState({ documents }: SelectDocumentStateProps) {
  const { addDocument } = useStore()
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

  return (
    <div className="flex h-full items-center justify-center bg-[#F9F9FB] text-gray-500">
      <div className="text-center">
        <p className="mb-4">Select a document to read</p>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => openPdf(doc.path)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 shadow-sm transition-all text-gray-800 font-medium"
            >
              {doc.name}
            </button>
          ))}
          <button 
            onClick={handleAddFile}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-black transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>
      </div>
    </div>
  )
}
