import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useAnalyticsAccounts, 
  useSelectAccount, 
  useHideAccount,
  useMetaOrganic,
  useMetaAds 
} from "@/hooks/use-analytics";
import { 
    BarChart3, 
    Link2, 
    Loader2, 
    TrendingUp, 
    Users, 
    Eye, 
    MousePointer,
    DollarSign,
    Target,
    Facebook,
    Globe,
    Check,
    EyeOff,
    Plus,
} from "lucide-react";
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
} from "recharts";

interface AnalyticsAccount {
  id: string;
  platform: 'meta' | 'google';
  account_id: string;
  account_name: string;
  account_type: 'page' | 'ad_account' | 'mcc';
  is_selected: boolean;
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("meta-organic");
  const { data: accounts, isLoading: accountsLoading } = useAnalyticsAccounts();
  const selectAccount = useSelectAccount();
  const hideAccount = useHideAccount();
  const { data: metaOrganicData, isLoading: metaOrganicLoading } = useMetaOrganic();
  const { data: metaAdsData, isLoading: metaAdsLoading } = useMetaAds();

  const metaAccounts = accounts?.meta || [];
  const googleAccounts = accounts?.google || [];
  const hasMetaAccounts = metaAccounts.length > 0;
  const hasGoogleAccounts = googleAccounts.length > 0;

  const selectedMetaAccount = metaAccounts.find(a => a.is_selected);
  const selectedGoogleAccount = googleAccounts.find(a => a.is_selected);

  const handleConnectMeta = () => {
    window.location.href = "/api/auth/meta";
  };

  const handleConnectGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  const handleSelectAccount = async (platform: string, accountId: string) => {
    await selectAccount.mutateAsync({ platform, accountId });
  };

  const handleHideAccount = async (id: string) => {
    if (confirm('Tem certeza que deseja ocultar esta conta?')) {
      await hideAccount.mutateAsync(id);
    }
  };

  // Parse metrics for charts
  const parseMetricValue = (metricName: string) => {
    const data = metaOrganicData as any;
    if (!data?.metrics) return [];
    const metric = data.metrics.find((m: any) => m.name === metricName);
    if (!metric) return [];
    return metric.values.map((v: any, i: number) => ({
      name: `Dia ${i + 1}`,
      value: parseInt(v.value) || 0,
    }));
  };

  const impressionsData = parseMetricValue("page_impressions");
  const reachData = parseMetricValue("page_impressions_unique");

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gradient mb-2">Analytics</h1>
            <p className="text-muted-foreground text-sm">Métricas e relatórios de desempenho</p>
          </div>
        </div>

        {/* Connected Accounts Section */}
        <Card className="feature-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users size={18} />
              Contas Conectadas
            </CardTitle>
            <CardDescription>
              Gerencie suas contas do Meta e Google Ads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meta Accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Facebook size={16} className="text-blue-500" />
                  <span className="font-medium">Meta</span>
                  {hasMetaAccounts && (
                    <Badge variant="secondary">{metaAccounts.length} conta(s)</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleConnectMeta}>
                  <Plus size={14} className="mr-2" />
                  Conectar Outra
                </Button>
              </div>
              
              {accountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando...
                </div>
              ) : hasMetaAccounts ? (
                <div className="space-y-2">
                  {metaAccounts.map((account) => (
                    <div 
                      key={account.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        account.is_selected 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-secondary/30 border-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          account.account_type === 'page' ? 'bg-green-500' : 'bg-orange-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{account.account_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.account_type === 'page' ? 'Página' : 'Conta de Anúncios'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!account.is_selected && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSelectAccount('meta', account.account_id)}
                            disabled={selectAccount.isPending}
                          >
                            <Check size={14} className="mr-1" />
                            Selecionar
                          </Button>
                        )}
                        {account.is_selected && (
                          <Badge variant="default" className="text-[10px]">Selecionada</Badge>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleHideAccount(account.id)}
                          disabled={hideAccount.isPending}
                        >
                          <EyeOff size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={handleConnectMeta}>
                  <Link2 size={14} className="mr-2" />
                  Conectar Meta
                </Button>
              )}
            </div>

            <div className="border-t border-border/50" />

            {/* Google Accounts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-red-500" />
                  <span className="font-medium">Google Ads</span>
                  {hasGoogleAccounts && (
                    <Badge variant="secondary">{googleAccounts.length} conta(s)</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleConnectGoogle}>
                  <Plus size={14} className="mr-2" />
                  Conectar Outra
                </Button>
              </div>
              
              {accountsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando...
                </div>
              ) : hasGoogleAccounts ? (
                <div className="space-y-2">
                  {googleAccounts.map((account) => (
                    <div 
                      key={account.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        account.is_selected 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-secondary/30 border-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div>
                          <p className="font-medium text-sm">{account.account_name}</p>
                          <p className="text-xs text-muted-foreground">Conta MCC</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!account.is_selected && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSelectAccount('google', account.account_id)}
                            disabled={selectAccount.isPending}
                          >
                            <Check size={14} className="mr-1" />
                            Selecionar
                          </Button>
                        )}
                        {account.is_selected && (
                          <Badge variant="default" className="text-[10px]">Selecionada</Badge>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleHideAccount(account.id)}
                          disabled={hideAccount.isPending}
                        >
                          <EyeOff size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={handleConnectGoogle}>
                  <Link2 size={14} className="mr-2" />
                  Conectar Google Ads
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="meta-organic">
              Meta Orgânico
              {selectedMetaAccount && <Badge variant="secondary" className="ml-2 text-[10px]">✓</Badge>}
            </TabsTrigger>
            <TabsTrigger value="meta-ads">
              Meta Ads
              {selectedMetaAccount?.account_type === 'ad_account' && (
                <Badge variant="secondary" className="ml-2 text-[10px]">✓</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="google-ads">
              Google Ads
              {selectedGoogleAccount && <Badge variant="secondary" className="ml-2 text-[10px]">✓</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Meta Organic Tab */}
          <TabsContent value="meta-organic" className="space-y-6">
            {!selectedMetaAccount ? (
              <Card className="feature-card">
                <CardContent className="p-12 text-center">
                  <Facebook className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Selecione uma conta Meta</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Escolha uma página ou conta de anúncios acima para visualizar métricas
                  </p>
                </CardContent>
              </Card>
            ) : metaOrganicLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{selectedMetaAccount.account_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedMetaAccount.account_type === 'page' ? 'Página' : 'Conta de Anúncios'}
                    </p>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Eye size={14} />
                        Impressões
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {impressionsData[0]?.value.toLocaleString() || "0"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users size={14} />
                        Alcance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {reachData[0]?.value.toLocaleString() || "0"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp size={14} />
                        Engajamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">-</div>
                    </CardContent>
                  </Card>
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users size={14} />
                        Seguidores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">-</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="feature-card">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Impressões (28 dias)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={impressionsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="feature-card">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Alcance (28 dias)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reachData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Meta Ads Tab */}
          <TabsContent value="meta-ads" className="space-y-6">
            {!selectedMetaAccount || selectedMetaAccount.account_type !== 'ad_account' ? (
              <Card className="feature-card">
                <CardContent className="p-12 text-center">
                  <Facebook className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Selecione uma conta de anúncios</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Escolha uma conta de anúncios Meta acima para visualizar campanhas
                  </p>
                </CardContent>
              </Card>
            ) : metaAdsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{selectedMetaAccount.account_name}</h3>
                    <p className="text-sm text-muted-foreground">Conta de Anúncios</p>
                  </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign size={14} />
                        Gasto Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(metaAdsData as any)?.campaigns?.reduce((acc: number, c: any) => 
                          acc + parseFloat(c.insights?.data?.[0]?.spend || "0"), 0
                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MousePointer size={14} />
                        CTR
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">-</div>
                    </CardContent>
                  </Card>
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign size={14} />
                        CPC
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">-</div>
                    </CardContent>
                  </Card>
                  <Card className="feature-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Target size={14} />
                        ROAS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">-</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Campaigns Table */}
                <Card className="feature-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Gasto</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Impressões</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliques</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(metaAdsData as any)?.campaigns?.map((campaign: any) => (
                            <tr key={campaign.id} className="border-b border-border/50 last:border-0">
                              <td className="py-3 px-4">{campaign.name}</td>
                              <td className="py-3 px-4">
                                <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {campaign.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                {parseFloat(campaign.insights?.data?.[0]?.spend || "0").toLocaleString('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                })}
                              </td>
                              <td className="py-3 px-4">
                                {parseInt(campaign.insights?.data?.[0]?.impressions || "0").toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                {parseInt(campaign.insights?.data?.[0]?.clicks || "0").toLocaleString()}
                              </td>
                            </tr>
                          )) || (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                Nenhuma campanha encontrada
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="google-ads" className="space-y-6">
            {!selectedGoogleAccount ? (
              <Card className="feature-card">
                <CardContent className="p-12 text-center">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Selecione uma conta Google Ads</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Escolha uma conta Google Ads acima para visualizar métricas
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="feature-card">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Em desenvolvimento</h3>
                  <p className="text-muted-foreground text-sm">
                    A integração com Google Ads está sendo configurada.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
