import { Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ConversationalInputProps {
  value: string;
  loading: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ConversationalInput({ value, loading, disabled, onChange, onSubmit }: ConversationalInputProps) {
  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="O que você quer criar hoje?"
        className="min-h-32 bg-secondary/20 border-border/50 text-base"
      />
      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={loading || disabled || !value.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
          {loading ? "Gerando conteúdo..." : "Gerar conteúdo"}
        </Button>
      </div>
    </div>
  );
}
