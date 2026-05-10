import { useEffect, useState } from "react"
import { Download, Trash2, Power, RefreshCw } from "lucide-react"
import { useAi } from "../hooks/useAi"
import { useStore, type ModelEntry } from "../store"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { cn } from "../lib/utils"

export function ModelManager() {
  const { modelManagerOpen, setModelManagerOpen, downloadProgress, loadedModel } = useStore()
  const { listModels, loadModel, unloadModel, downloadModel, deleteModel } = useAi()
  const [models, setModels] = useState<ModelEntry[]>([])
  const [downloadUrl, setDownloadUrl] = useState("")
  const [downloadId, setDownloadId] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (modelManagerOpen) {
      refreshModels()
    }
  }, [modelManagerOpen])

  async function refreshModels() {
    try {
      const m = await listModels()
      setModels(m)
    } catch (e) {
      console.error("Failed to list models:", e)
    }
  }

  async function handleLoad(modelId: string) {
    setLoading(true)
    try {
      await loadModel(modelId)
    } catch (e) {
      console.error("Failed to load model:", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnload() {
    setLoading(true)
    try {
      await unloadModel()
    } catch (e) {
      console.error("Failed to unload model:", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!downloadUrl.trim() || !downloadId.trim()) return
    try {
      await downloadModel(downloadId.trim(), downloadUrl.trim())
      setDownloadUrl("")
      setDownloadId("")
      setTimeout(refreshModels, 2000)
    } catch (e) {
      console.error("Failed to download model:", e)
    }
  }

  async function handleDelete(modelId: string) {
    try {
      await deleteModel(modelId)
      await refreshModels()
    } catch (e) {
      console.error("Failed to delete model:", e)
    }
  }

  return (
    <Dialog open={modelManagerOpen} onOpenChange={setModelManagerOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Model Manager</DialogTitle>
        </DialogHeader>

        {/* Loaded model */}
        {loadedModel && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active: {loadedModel.name}</p>
                <p className="text-xs text-muted-foreground">{loadedModel.modelType}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleUnload} disabled={loading}>
                <Power className="mr-1.5 h-3.5 w-3.5" />
                Unload
              </Button>
            </div>
          </div>
        )}

        {/* Model list */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Available Models</h4>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refreshModels}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="h-48 rounded-lg border">
          {models.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No models found. Download one below.
            </p>
          ) : (
            <div className="divide-y">
              {models.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.model_type} &middot; {m.model_size_mb} MB
                      {m.has_tokenizer ? " &middot; tokenizer" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {loadedModel?.id !== m.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoad(m.id)}
                        disabled={loading || !m.has_model}
                      >
                        Load
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Download */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Download Model</h4>
          <p className="text-xs text-muted-foreground">
            Enter a HuggingFace model URL (e.g., https://huggingface.co/user/model)
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Model ID (e.g., phi-3-mini)"
              value={downloadId}
              onChange={(e) => setDownloadId(e.target.value)}
            />
            <Input
              placeholder="https://huggingface.co/..."
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
            />
            <Button
              onClick={handleDownload}
              disabled={!downloadUrl.trim() || !downloadId.trim()}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* Download progress */}
          {downloadProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{downloadProgress.file_name}</span>
                <span>{Math.round(downloadProgress.percentage)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full bg-primary transition-all",
                    downloadProgress.percentage >= 100 && "bg-green-500"
                  )}
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
