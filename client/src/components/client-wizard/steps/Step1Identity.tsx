import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WizardFormData } from "../ClientWizard";

const NICHES = [
  "Consultoria de negócios",
  "Saúde e bem-estar",
  "Marketing Digital",
  "Educação",
  "Tecnologia / SaaS",
  "E-commerce",
  "Moda e beleza",
  "Alimentação e gastronomia",
  "Imóveis",
  "Finanças e investimentos",
  "Esportes e fitness",
  "Entretenimento",
  "Outro",
];

interface Props {
  form: UseFormReturn<WizardFormData>;
}

export function Step1Identity({ form }: Props) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do cliente *</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Acme Consultoria" {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="niche"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Segmento / Nicho</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nicho..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {NICHES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site ou perfil principal</FormLabel>
            <FormControl>
              <Input
                placeholder="https://exemplo.com.br"
                type="url"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição breve</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva brevemente o cliente, o que faz e seu diferencial..."
                rows={3}
                maxLength={200}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground text-right">
              {(field.value ?? "").length}/200
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
