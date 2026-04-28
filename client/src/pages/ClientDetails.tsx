import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { PageHeader } from "@/components/PageHeader";
import { useClient } from "@/hooks/use-clients";
import { useSources, useCreateSource, useDeleteSource } from "@/hooks/use-sources";
import { useContents } from "@/hooks/use-contents";
import { useBriefs, useGenerateBrief } from "@/hooks/use-briefs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSourceSchema } from "@shared/schema";
import { Loader2, Plus, Trash2, Globe, FileText, Sparkles, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type SourceFormValues = {
  name: string;
  url: string;
  type: "blog" | "news" | "youtube";
  isActive: boolean;
};

export default function ClientDetails() {
  const [match, params] = useRoute("/clients/:id");
  const clientId = params?.id!;
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  
  const [activeTab, setActiveTab] = useState("overview");

  if (clientLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!client) return <div className="p-8">Client not found</div>;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <PageHeader 
          title={client.name} 
          description={client.niche ? `${client.niche} • ${client.description}` : client.description || "Client Dashboard"}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-background border p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
            <TabsTrigger value="sources" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sources</TabsTrigger>
            <TabsTrigger value="content" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Scraped Content</TabsTrigger>
            <TabsTrigger value="briefs" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Briefs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">Target Audience</span>
                    <span className="text-foreground">{client.targetAudience || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block">Created At</span>
                    <span className="text-foreground">{new Date(client.createdAt!).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
              {/* Add more overview widgets here */}
            </div>
          </TabsContent>

          <TabsContent value="sources">
            <SourcesTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="briefs">
            <BriefsTab clientId={clientId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SourcesTab({ clientId }: { clientId: string }) {
  const { data: sources, isLoading } = useSources(clientId);
  const { mutate: deleteSource } = useDeleteSource();
  const [open, setOpen] = useState(false);

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold font-display">Monitoring Sources</h3>
          <p className="text-sm text-muted-foreground">Blogs, news sites, and feeds to scrape.</p>
        </div>
        <AddSourceDialog clientId={clientId} open={open} onOpenChange={setOpen} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sources?.map((source) => (
          <div key={source.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 hover:border-primary/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold">{source.name}</h4>
                <a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  {source.url} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={source.isActive ? "default" : "secondary"}>
                {source.isActive ? "Active" : "Paused"}
              </Badge>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteSource(source.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {sources?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
            No sources added yet.
          </div>
        )}
      </div>
    </div>
  );
}

function AddSourceDialog({ clientId, open, onOpenChange }: { clientId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateSource();
  const form = useForm<SourceFormValues>({
    resolver: zodResolver(insertSourceSchema.omit({ clientId: true }) as any),
    defaultValues: { name: "", url: "", type: "blog", isActive: true }
  });

  const onSubmit = (formData: SourceFormValues) => {
    mutate({ clientId, name: formData.name, url: formData.url, type: formData.type }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Source</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Source</DialogTitle>
          <DialogDescription>Add a URL to monitor for content generation.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Name</FormLabel>
                  <FormControl><Input placeholder="TechCrunch" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl><Input placeholder="https://techcrunch.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="news">News Site</SelectItem>
                      <SelectItem value="youtube">YouTube Channel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add Source
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ContentTab({ clientId }: { clientId: string }) {
  const { data: contents, isLoading } = useContents(clientId);

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold font-display">Scraped Content</h3>
          <p className="text-sm text-muted-foreground">Articles and posts collected from your sources.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {contents?.map((content) => (
          <Card key={content.id} className="border-border/50 hover:border-primary/20 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <a href={content.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                  {content.title}
                </a>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <span>{new Date(content.scrapedAt!).toLocaleDateString()}</span>
                {content.isAnalyzed && <Badge variant="outline" className="text-[10px] h-5">Analyzed</Badge>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{content.summary || "No summary available yet."}</p>
            </CardContent>
          </Card>
        ))}
         {contents?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
            No content scraped yet.
          </div>
        )}
      </div>
    </div>
  );
}

function BriefsTab({ clientId }: { clientId: string }) {
  const { data: briefs, isLoading } = useBriefs(clientId);
  const [open, setOpen] = useState(false);

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold font-display">Content Briefs</h3>
          <p className="text-sm text-muted-foreground">AI-generated briefs ready for production.</p>
        </div>
        <GenerateBriefDialog clientId={clientId} open={open} onOpenChange={setOpen} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {briefs?.map((brief) => (
          <Link key={brief.id} href={`/briefs/${brief.id}`}>
            <Card className="card-hover cursor-pointer h-full border-border/50 flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={brief.status === 'approved' ? 'default' : 'secondary'}>
                    {brief.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(brief.createdAt!), { addSuffix: true })}</span>
                </div>
                <CardTitle className="text-lg leading-tight">{brief.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {brief.angle || "No angle specified"}
                </p>
              </CardContent>
              <div className="p-6 pt-0 mt-auto border-t bg-muted/20 rounded-b-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-3">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Generated by {brief.generatedBy}
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {briefs?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card border border-dashed rounded-xl">
            No briefs generated yet. Click "Generate Brief" to start.
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateBriefDialog({ clientId, open, onOpenChange }: { clientId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useGenerateBrief();
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ clientId, topic }, {
      onSuccess: () => {
        onOpenChange(false);
        setTopic("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Brief
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Content Brief</DialogTitle>
          <DialogDescription>
            Let AI analyze your sources and create a new content brief.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic or Angle (Optional)</label>
            <Input 
              placeholder="e.g., The future of remote work" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to let AI suggest trending topics from your sources.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isPending ? "Analyzing & Generating..." : "Start Generation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
