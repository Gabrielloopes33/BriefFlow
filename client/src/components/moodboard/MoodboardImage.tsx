import { useState } from "react";
import { Trash2, Pencil, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MoodboardImage as MoodboardImageType } from "@/hooks/use-client-moodboard";

interface Props {
  image: MoodboardImageType;
  onDelete: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onClick: () => void;
  isDeleting: boolean;
}

export function MoodboardImage({ image, onDelete, onUpdateLabel, onClick, isDeleting }: Props) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(image.label || "");
  const [loaded, setLoaded] = useState(false);

  const handleSave = () => {
    onUpdateLabel(image.id, label);
    setEditing(false);
  };

  return (
    <div className="group relative rounded-lg overflow-hidden border bg-card break-inside-avoid mb-3">
      {!loaded && (
        <div className="w-full aspect-[4/3] bg-muted animate-pulse" />
      )}
      <img
        src={image.public_url}
        alt={image.label || image.file_name}
        className={`w-full object-cover cursor-pointer transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onClick={onClick}
        loading="lazy"
      />

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-black/60 text-white hover:bg-black/80 border-0"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(!editing);
          }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-black/60 text-white hover:bg-destructive border-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
          disabled={isDeleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Label */}
      <div className="p-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
              OK
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground truncate">
            {image.label || image.file_name}
          </p>
        )}
      </div>
    </div>
  );
}
