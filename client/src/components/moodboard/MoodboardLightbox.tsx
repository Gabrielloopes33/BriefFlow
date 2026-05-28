import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodboardImage } from "@/hooks/use-client-moodboard";

interface Props {
  images: MoodboardImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function MoodboardLightbox({ images, currentIndex, onClose, onNavigate }: Props) {
  const current = images[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, images.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Prev */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.public_url}
          alt={current.label || current.file_name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        {current.label && (
          <p className="text-center text-white/80 text-sm mt-3">{current.label}</p>
        )}
        <p className="text-center text-white/50 text-xs mt-1">
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      {/* Next */}
      {currentIndex < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}
    </div>
  );
}
