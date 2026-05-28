import { useState } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { MoodboardImage } from "./MoodboardImage";
import { MoodboardDropzone } from "./MoodboardDropzone";
import { MoodboardLightbox } from "./MoodboardLightbox";
import {
  useClientMoodboard,
  useUploadMoodboardImages,
  useDeleteMoodboardImage,
  useUpdateMoodboardImage,
} from "@/hooks/use-client-moodboard";

interface Props {
  clientId: string;
  showUpload?: boolean;
}

export function MoodboardGrid({ clientId, showUpload = true }: Props) {
  const { data: images, isLoading } = useClientMoodboard(clientId);
  const uploadMutation = useUploadMoodboardImages(clientId);
  const deleteMutation = useDeleteMoodboardImage(clientId);
  const updateMutation = useUpdateMoodboardImage(clientId);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
        <MoodboardDropzone
          onUpload={(files) => uploadMutation.mutate(files)}
          isUploading={uploadMutation.isPending}
          imageCount={images?.length || 0}
        />
      ) : null}

      {images?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
          <ImageOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma imagem no moodboard ainda.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-4 gap-3">
          {images?.map((img, index) => (
            <MoodboardImage
              key={img.id}
              image={img}
              onDelete={(id) => deleteMutation.mutate(id)}
              onUpdateLabel={(id, label) => updateMutation.mutate({ imageId: id, label })}
              onClick={() => setLightboxIndex(index)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && images && (
        <MoodboardLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}
    </div>
  );
}
