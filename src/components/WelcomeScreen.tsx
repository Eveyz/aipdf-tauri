import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { FileText, Folder, FolderPlus, Loader2, Search } from "lucide-react"
import { usePdf } from "../hooks/usePdf"
import { useStore } from "../store"
import { formatRelativeTime } from "../lib/utils"
import { Button } from "./ui/button"
import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog"
import { Input } from "./ui/input"

export function WelcomeScreen() {
  const { openPdf } = usePdf()
  const { workspaces, createWorkspace, switchWorkspace, addDocument } = useStore()
  
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("New Workspace")
  const [isCreating, setIsCreating] = useState(false)

  // Scalability states
  const [searchQuery, setSearchQuery] = useState('')
  const [isWorkspacesExpanded, setIsWorkspacesExpanded] = useState(false)
  const [isFilesExpanded, setIsFilesExpanded] = useState(false)

  async function handleQuickOpen() {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      })
      if (path && typeof path === 'string') {
        const fileName = path.split("/").pop() || "Quick Open"
        
        // Step 1: Check for existing workspace containing this absolute path AND is type 'quick_read'
        const existingWs = await invoke<any | null>("find_workspace_by_path", { 
          path, 
          workspaceType: "quick_read" 
        })

        if (existingWs) {
          // If it exists, just switch to it and open the PDF
          await switchWorkspace(existingWs.id)
          await openPdf(path)
        } else {
          // Create a NEW workspace with type: 'quick_read'
          const wsId = await createWorkspace(fileName, "quick_read")
          await switchWorkspace(wsId)
          await addDocument(path)
          await openPdf(path)
          await useStore.getState().createSession()
        }
      }
    } catch (e) {
      console.error("Failed to open PDF:", e)
    }
  }

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim() || isCreating) return
    
    setIsCreating(true)
    try {
      // Logic to prevent simple name collisions for "New Workspace"
      let finalName = newWorkspaceName.trim()
      const existingNames = workspaces
        .filter(w => w.type === 'standard')
        .map(w => w.name)
      
      if (existingNames.includes(finalName)) {
        let counter = 1
        while (existingNames.includes(`${finalName} (${counter})`)) {
          counter++
        }
        finalName = `${finalName} (${counter})`
      }

      const id = await createWorkspace(finalName, "standard")
      await switchWorkspace(id)
      await useStore.getState().createSession()
      setIsNameDialogOpen(false)
    } catch (e) {
      console.error("[WelcomeScreen] Failed to create workspace:", e)
      alert("Error creating workspace: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setIsCreating(false)
    }
  }

  // Deduplicate and Filter logic
  const { filteredWorkspaces, filteredFiles } = useMemo(() => {
    const seen = new Set<string>()
    const unique = workspaces
      .filter(w => {
        if (seen.has(w.id)) return false
        seen.add(w.id)
        return true
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)

    const search = searchQuery.toLowerCase().trim()
    const filtered = search 
      ? unique.filter(w => w.name.toLowerCase().includes(search))
      : unique

    return {
      filteredWorkspaces: filtered.filter(w => w.type === "standard"),
      filteredFiles: filtered.filter(w => w.type === "quick_read")
    }
  }, [workspaces, searchQuery])

  const defaultCount = 8
  const displayWorkspaces = isWorkspacesExpanded ? filteredWorkspaces : filteredWorkspaces.slice(0, defaultCount)
  const displayFiles = isFilesExpanded ? filteredFiles : filteredFiles.slice(0, defaultCount)

  return (
    <div className="h-full bg-[#F9F9FB] overflow-y-auto">
      <div className="max-w-4xl mx-auto pt-20 px-6 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Welcome back</h1>
          
          {/* Inline Search Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg w-64 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200 transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or files..."
              className="bg-transparent text-sm outline-none placeholder-gray-400 w-full"
            />
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {/* Card 1: New Workspace */}
          <button 
            type="button"
            onClick={() => {
              setNewWorkspaceName("New Workspace")
              setIsNameDialogOpen(true)
            }}
            className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex items-start text-left gap-4 w-full relative z-10"
          >
            <FolderPlus className="w-8 h-8 text-gray-900 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">New Workspace</h3>
              <p className="text-xs text-gray-500 mt-1">Create a project to chat with multiple PDFs</p>
            </div>
          </button>

          {/* Card 2: Quick Open */}
          <button 
            type="button"
            onClick={handleQuickOpen}
            className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex items-start text-left gap-4 w-full relative z-10"
          >
            <FileText className="w-8 h-8 text-gray-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Quick Open</h3>
              <p className="text-xs text-gray-500 mt-1">Read and chat with a single PDF file</p>
            </div>
          </button>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">RECENT WORKSPACES</h2>
            <div className={`flex flex-col gap-1 transition-all duration-300 ${isWorkspacesExpanded ? 'max-h-[50vh] overflow-y-auto custom-scrollbar pr-2' : 'overflow-hidden'}`}>
              {filteredWorkspaces.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  {searchQuery ? `No workspaces found matching "${searchQuery}"` : "No workspaces yet."}
                </div>
              ) : (
                <>
                  {displayWorkspaces.map((workspace) => (
                    <button 
                      key={workspace.id}
                      onClick={() => switchWorkspace(workspace.id)}
                      className="flex items-center justify-between p-3 bg-transparent hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition-all group border border-transparent hover:border-gray-200 w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        <span className="text-sm text-gray-800 font-medium">{workspace.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {formatRelativeTime(workspace.updatedAt)}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
            {filteredWorkspaces.length > defaultCount && (
              <button 
                onClick={() => setIsWorkspacesExpanded(!isWorkspacesExpanded)}
                className="mt-2 w-full text-left pl-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                {isWorkspacesExpanded ? "Show less" : `View all ${filteredWorkspaces.length} workspaces`}
              </button>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">RECENT FILES</h2>
            <div className={`flex flex-col gap-1 transition-all duration-300 ${isFilesExpanded ? 'max-h-[50vh] overflow-y-auto custom-scrollbar pr-2' : 'overflow-hidden'}`}>
              {filteredFiles.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  {searchQuery ? `No files found matching "${searchQuery}"` : "No recent files."}
                </div>
              ) : (
                <>
                  {displayFiles.map((workspace) => (
                    <button 
                      key={workspace.id}
                      onClick={() => switchWorkspace(workspace.id)}
                      className="flex items-center gap-2 p-2 hover:bg-white hover:shadow-sm rounded-md text-sm text-gray-700 cursor-pointer group transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                      <span className="truncate flex-1">{workspace.name}</span>
                      <span className="text-[10px] text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatRelativeTime(workspace.updatedAt)}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
            {filteredFiles.length > defaultCount && (
              <button 
                onClick={() => setIsFilesExpanded(!isFilesExpanded)}
                className="mt-2 w-full text-left pl-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                {isFilesExpanded ? "Show less" : `View all ${filteredFiles.length} files`}
              </button>
            )}
          </section>
        </div>
      </div>

      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Name your workspace</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name..."
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim() || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
