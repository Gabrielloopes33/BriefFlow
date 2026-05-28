import { useCallback, useState } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/json",
];

const ALLOWED_EXTS = [".pdf", ".md", ".txt", ".docx", ".csv", ".json"];

interface Props {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export function DocumentDropzone({ onUpload, isUploading }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isAllowed = (file: File): boolean => {
    if (ALLOWED_TYPES.includes(file.type)) return true;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    return ALLOWED_EXTS.includes(ext);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && isAllowed(file)) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isAllowed(file)) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("doc-upload")?.click()}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          Arraste um arquivo ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, MD, TXT, DOCX, CSV, JSON — máx. 25MB
        </p>
        <input
          id="doc-upload"
          type="file"
          className="hidden"
          accept=".pdf,.md,.txt,.docx,.csv,.json"
          onChange={handleFileSelect}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <File className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Enviar"
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedFile(null)}
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
