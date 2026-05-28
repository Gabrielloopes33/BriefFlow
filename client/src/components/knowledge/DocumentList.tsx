import { useState } from "react";
import { Loader2, FileX } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import { DocumentDropzone } from "./DocumentDropzone";
import {
  useClientDocuments,
  useUploadDocument,
  useDeleteDocument,
  useUpdateDocumentLabel,
  useDocumentSignedUrl,
} from "@/hooks/use-client-documents";

interface Props {
  clientId: string;
  showUpload?: boolean;
}

export function DocumentList({ clientId, showUpload = true }: Props) {
  const { data: docs, isLoading } = useClientDocuments(clientId);
  const uploadMutation = useUploadDocument(clientId);
  const deleteMutation = useDeleteDocument(clientId);
  const labelMutation = useUpdateDocumentLabel(clientId);
  const [downloadDocId, setDownloadDocId] = useState<string | null>(null);
  const { data: urlData } = useDocumentSignedUrl(clientId, downloadDocId);

  const handleDownload = (docId: string) => {
    setDownloadDocId(docId);
  };

  if (urlData?.signedUrl && downloadDocId) {
    window.open(urlData.signedUrl, "_blank");
    setDownloadDocId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showUpload ? (
        <DocumentDropzone
          onUpload={(file) => uploadMutation.mutate(file)}
          isUploading={uploadMutation.isPending}
        />
      ) : null}

      {docs?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
          <FileX className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum documento na base de conhecimento ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {docs?.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={(id) => deleteMutation.mutate(id)}
              onDownload={handleDownload}
              onUpdateLabel={(id, label) => labelMutation.mutate({ documentId: id, label })}
              isDeleting={deleteMutation.isPending}
              downloadUrl={null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
