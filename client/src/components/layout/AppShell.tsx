
import { Link, useLocation } from "wouter";
import { LayoutDashboard, WandSparkles, Plus, Settings, BarChart2, Users, Bot, LibraryBig } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [location] = useLocation();

    const NAV_ITEMS = [
        { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
        { icon: WandSparkles, label: "Studio", path: "/studio" },
        { icon: Users, label: "Clientes", path: "/clients" },
        { icon: LibraryBig, label: "Biblioteca", path: "/library" },
        { icon: Bot, label: "Agentes", path: "/agents" },
        { icon: BarChart2, label: "Analytics", path: "/analytics" },
        { icon: Settings, label: "Settings", path: "/settings" },
    ];

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[60px] md:w-[240px] flex flex-col border-r border-border/50 bg-background/50 backdrop-blur-xl transition-all duration-300">
                <div className="h-14 flex items-center px-4 border-b border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-primary flex-center flex items-center justify-center font-bold text-white shrink-0">
                        BF
                    </div>
                    <span className="ml-3 font-display font-bold text-lg hidden md:block tracking-tight text-gradient">BriefFlow</span>
                </div>

                <div className="flex-1 py-4 flex flex-col gap-2 px-2">
                    <button className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all mb-4 group">
                        <Plus size={18} />
                        <span className="hidden md:block font-medium text-sm">New Project</span>
                    </button>

                    {NAV_ITEMS.map((item) => {
                        const isActive = location === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? "bg-secondary text-white shadow-sm ring-1 ring-border"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-white"
                                }`}
                            >
                                <Icon size={18} className={isActive ? "text-primary" : ""} />
                                <span className="hidden md:block">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center">
                            <span className="text-xs font-mono">JD</span>
                        </div>
                        <div className="hidden md:flex flex-col">
                            <span className="text-sm font-medium">John Doe</span>
                            <span className="text-xs text-muted-foreground">Pro Plan</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Header - Optional global stats or breadcrumbs */}
                <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-mono text-muted-foreground">SYSTEM ONLINE</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 rounded">
                            API: ENABLED
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden p-0 md:p-6 relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
                    {children}
                </div>
            </main>
        </div>
    );
}
