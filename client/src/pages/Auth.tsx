import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { saveAuthSession } from '@/lib/auth-session';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiPost<{
        user: { id: string; email: string; fullName?: string | null };
        tenantId: string;
        session: { token: string; expiresAt: string };
      }>('/api/auth/login', {
        email,
        password,
      });

      saveAuthSession({
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        tenantId: data.tenantId,
        user: data.user,
      });

      setSuccess('Login realizado com sucesso!');
      setTimeout(() => {
        setLocation('/dashboard');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await apiPost<{
        user: { id: string; email: string; fullName?: string | null };
        tenantId: string;
        session: { token: string; expiresAt: string };
      }>('/api/auth/signup', {
        email,
        password,
        fullName,
      });

      saveAuthSession({
        token: data.session.token,
        expiresAt: data.session.expiresAt,
        tenantId: data.tenantId,
        user: data.user,
      });

      setSuccess('Conta criada com sucesso!');
      setTimeout(() => {
        setLocation('/dashboard');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      setSuccess('Fluxo de recuperação será habilitado na próxima etapa de implementação.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === 'login' ? handleLogin :
                      mode === 'signup' ? handleSignup :
                      handleForgotPassword;

  const title = mode === 'login' ? 'Entrar na sua conta' :
                 mode === 'signup' ? 'Criar nova conta' :
                 'Recuperar senha';

  const description = mode === 'login' ? 'Insira suas credenciais para acessar o BriefFlow' :
                      mode === 'signup' ? 'Crie uma conta para começar a usar o BriefFlow' :
                      'Digite seu email para receber um link de recuperação';

  const buttonText = mode === 'login' ? 'Entrar' :
                    mode === 'signup' ? 'Criar conta' :
                    'Enviar email de recuperação';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>BriefFlow</span>
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-2">
            {title}
          </h1>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {mode === 'login' && 'Preencha com suas credenciais'}
              {mode === 'signup' && 'Todos os campos são obrigatórios'}
              {mode === 'forgot-password' && 'Você receberá um email com instruções'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {mode !== 'forgot-password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {buttonText}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center w-full">
              {mode === 'login' && (
                <>
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Criar conta
                  </button>
                </>
              )}

              {mode === 'signup' && (
                <>
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Entrar
                  </button>
                </>
              )}

              {mode === 'forgot-password' && (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Voltar para o login
                  </button>
                </>
              )}
            </div>

            {mode === 'login' && (
              <div className="text-sm text-center w-full">
                <button
                  type="button"
                  onClick={() => { setMode('forgot-password'); setError(''); setSuccess(''); }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
