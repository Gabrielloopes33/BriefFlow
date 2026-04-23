import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/use-clients";
import { useContents } from "@/hooks/use-contents";
import { Calendar, ExternalLink, FileText, Search, Filter, Loader2 } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function Contents() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: clients } = useClients();
  const { data: contents, isLoading } = useContents(selectedClient);

  const getSourceColor = (type: string) => {
    switch (type) {
      case "RSS":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "BLOG":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "NEWS":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const filteredContents = contents?.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          content.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || content.sourceType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Biblioteca de Conteudo" 
        description="Navegue e gerencie conteudo coletado de suas fontes."
      />

      {/* Client Selector */}
      <Card className="mb-6 bg-card border-border/50">
        <CardHeader>
          <CardTitle>Selecionar Cliente</CardTitle>
          <CardDescription>
            Escolha um cliente para ver seu conteudo coletado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente para ver conteudo" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClient && (
        <>
          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Pesquisar conteudo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-border/50"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="RSS">RSS</SelectItem>
                      <SelectItem value="BLOG">Blog</SelectItem>
                      <SelectItem value="NEWS">Notícias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold">
                Conteudo Coletado {filteredContents && `(${filteredContents.length})`}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredContents && filteredContents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredContents.map((content, index) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="bg-card border-border/50 hover:border-primary/50 cursor-pointer h-full transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2 mb-2">
                              <a
                                href={content.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                {content.title}
                              </a>
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={getSourceColor(content.sourceType)}>
                                {content.sourceType}
                              </Badge>
                              <Badge variant="secondary">
                                {content.sourceName}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={content.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground line-clamp-3 mb-3">
                          {content.summary}
                        </p>
                        {content.keyPoints && content.keyPoints.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Pontos Principais:</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                              {content.keyPoints.slice(0, 3).map((point: any, idx: number) => (
                                <li key={idx}>{point}</li>
                              ))}
                              {content.keyPoints.length > 3 && (
                                <li className="text-primary">...e mais {content.keyPoints.length - 3}</li>
                              )}
                            </ul>
                          </div>
                        )}
                        {content.analysis && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm">
                              <span className="font-medium">Relevância:</span> {content.analysis.relevanceScore}/10
                            </p>
                            {content.analysis.topics && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {content.analysis.topics.map((topic: any, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="col-span-full py-12 text-center bg-card border-border/50 rounded-xl"
              >
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery || filterType !== "all" ? "Nenhum conteúdo encontrado" : "Nenhum conteúdo coletado ainda"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filterType !== "all"
                    ? "Tente ajustar sua busca ou filtros para encontrar o que procura."
                    : "O conteúdo aparecerá aqui assim que as fontes forem coletadas e analisadas."}
                </p>
              </motion.div>
            )}
          </div>
        </>
      )}

      {!selectedClient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-12 text-center bg-card border-border/50 rounded-xl"
        >
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Selecione um cliente</h3>
          <p className="text-muted-foreground">
            Escolha um cliente para ver seu conteudo coletado.
          </p>
        </motion.div>
      )}
    </div>
  );
}
