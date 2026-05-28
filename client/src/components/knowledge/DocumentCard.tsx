import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileType,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClientDocument, DocumentType } from "@/hooks/use-client-documents";

interface Props {
  doc: ClientDocument;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  isDeleting: boolean;
  downloadUrl: string | null;
}

const TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5" />,
  md: <FileCode className="w-5 h-5" />,
  txt: <FileType className="w-5 h-5" />,
  docx: <FileText className="w-5 h-5" />,
  csv: <FileSpreadsheet className="w-5 h-5" />,
  json: <FileCode className="w-5 h-5" />,
};

const TYPE_COLORS: Record<DocumentType, string> = {
  pdf: "text-red-400",
  md: "text-blue-400",
  txt: "text-gray-400",
  docx: "text-indigo-400",
  csv: "text-green-400",
  json: "text-yellow-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  processing: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
  indexed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <AlertCircle className="w-4 h-4 text-destructive" />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  indexed: "Indexado",
  failed: "Falhou",
};

export function DocumentCard({
  doc,
  onDelete,
  onDownload,
  onUpdateLabel,
  isDeleting,
  downloadUrl,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(doc.label || "");

  const handleSaveLabel = () => {
    onUpdateLabel(doc.id, label);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/20 transition-all group">
      <div className={TYPE_COLORS[doc.file_type]}>{TYPE_ICONS[doc.file_type]}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.file_name}</p>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLabel();
              }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleSaveLabel}>
              OK
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {STATUS_ICONS[doc.extraction_status]}
              {STATUS_LABELS[doc.extraction_status]}
            </span>
            {doc.label && (
              <>
                <span>•</span>
                <span>{doc.label}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditing(!editing)}
          title="Editar label"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDownload(doc.id)}
          title="Download"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(doc.id)}
          disabled={isDeleting}
          title="Deletar"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>

      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden"
          download={doc.file_name}
        >
          download
        </a>
      )}
    </div>
  );
}
