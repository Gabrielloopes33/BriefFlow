
import { Link } from "wouter";
import { ArrowRight, Bot, Database, Zap } from "lucide-react";

export function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans">

            {/* Navbar */}
            <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white">
                            BF
                        </div>
                        <span className="font-display font-bold text-xl tracking-tight">BriefFlow</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                        <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
                        <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
                        <a href="#docs" className="hover:text-foreground transition-colors">Docs</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                            Entrar
                        </Link>
                        <Link href="/dashboard" className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-[0_0_20px_-5px_rgba(250,93,25,0.5)] hover:shadow-[0_0_25px_-5px_rgba(250,93,25,0.6)]">
                            Começar Agora
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(250,93,25,0.15),transparent_50%)]"></div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-8 fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        V2.0 NO AR
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50 fade-in [animation-delay:0.1s]">
                        Transforme dados em <br />
                        <span className="text-primary">Conteúdo Engajador</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 fade-in [animation-delay:0.2s]">
                        BriefFlow é o workspace com IA para criadores modernos. Conecte suas métricas, converse com seus dados e gere conteúdo viral em segundos.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 fade-in [animation-delay:0.3s]">
                        <Link href="/dashboard" className="w-full md:w-auto h-12 px-8 rounded-lg bg-white text-black font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                            Começar Grátis <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button className="w-full md:w-auto h-12 px-8 rounded-lg border border-border bg-secondary/50 text-foreground font-medium hover:bg-secondary transition-colors">
                            Ver Documentação
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="py-24 border-t border-white/5 bg-black/20">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="feature-card p-6 rounded-2xl">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                                <Bot size={24} />
                            </div>
                            <h3 className="text-xl font-display font-bold mb-2">Assistente de Chat IA</h3>
                            <p className="text-muted-foreground">
                                Brainstorm de ideias, crie legendas e refine sua voz com nosso modelo de IA contextualizado para criadores.
                            </p>
                        </div>
                        <div className="feature-card p-6 rounded-2xl">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                                <Database size={24} />
                            </div>
                            <h3 className="text-xl font-display font-bold mb-2">Base de Referências</h3>
                            <p className="text-muted-foreground">
                                Armazene e organize seu melhor conteúdo, análise de concorrentes e links de inspiração em um só lugar.
                            </p>
                        </div>
                        <div className="feature-card p-6 rounded-2xl">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-display font-bold mb-2">Métricas Inteligentes</h3>
                            <p className="text-muted-foreground">
                                Conecte Meta e Google Analytics para ver performance em tempo real e obter insights acionáveis de crescimento.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-black">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center font-bold text-white text-xs">BF</div>
                        <span className="font-display font-bold text-lg">BriefFlow</span>
                    </div>
                    <div className="text-muted-foreground text-sm">
                        © 2025 BriefFlow Inc. Todos os direitos reservados.
                    </div>
                </div>
            </footer>

        </div>
    );
}
