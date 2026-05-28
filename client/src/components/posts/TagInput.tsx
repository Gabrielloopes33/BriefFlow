import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({
  tags,
  onChange,
  suggestions = [],
  placeholder = "Adicionar tag...",
  maxTags = 10,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s)
  );

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || tags.includes(normalized) || tags.length >= maxTags) return;
    onChange([...tags, normalized]);
    setInputValue("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[38px] px-2 py-1.5 rounded-md border border-input bg-background",
          "focus-within:ring-1 focus-within:ring-ring focus-within:border-ring",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0 || suggestions.length > 0);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={disabled || tags.length >= maxTags}
          className="flex-1 min-w-[80px] border-0 bg-transparent px-1 py-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-40 overflow-auto">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
