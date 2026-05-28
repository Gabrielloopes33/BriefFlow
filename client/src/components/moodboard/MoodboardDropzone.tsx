import { useCallback, useState } from "react";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

interface Props {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  imageCount: number;
}

export function MoodboardDropzone({ onUpload, isUploading, imageCount }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const isAllowed = (file: File): boolean => {
    if (ALLOWED_TYPES.includes(file.type)) return true;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter(isAllowed);
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files].slice(0, 20));
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isAllowed);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 20));
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const remaining = Math.max(0, 100 - imageCount);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
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
        onClick={() => document.getElementById("moodboard-upload")?.click()}
      >
        <ImagePlus className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          Arraste imagens ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, WEBP, GIF — máx. 10MB cada — até {remaining} restantes
        </p>
        <input
          id="moodboard-upload"
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedFiles.length} imagem(s) selecionada(s)
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedFiles([])}
              disabled={isUploading}
            >
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, i) => (
              <div
                key={i}
                className="relative group rounded-md overflow-hidden border w-16 h-16"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {isUploading ? "Enviando..." : "Enviar imagens"}
          </Button>
        </div>
      )}
    </div>
  );
}
