import { createClient } from '@supabase/supabase-js';

// Detecta se está no browser (frontend) ou Node.js (backend)
const isBrowser = typeof window !== 'undefined';

// Configurações do ambiente - funciona tanto no Node.js quanto no Vite
// No browser (Vite build): usar import.meta.env para acessar variáveis VITE_
// No Node.js (backend): usar process.env
const supabaseUrl = isBrowser
  ? import.meta.env.VITE_SUPABASE_URL
  : (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);

const supabaseAnonKey = isBrowser
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

// Service role key must never be read from browser-exposed env vars.
const supabaseServiceKey = !isBrowser
  ? process.env.SUPABASE_SERVICE_KEY
  : undefined;

// Validação das variáveis
if (!supabaseUrl) {
  throw new Error(
    '❌ VITE_SUPABASE_URL não está definido!\n' +
    'Verifique se a variável de ambiente está configurada no Netlify.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '❌ VITE_SUPABASE_ANON_KEY não está definido!\n' +
    'Verifique se a variável de ambiente está configurada no Netlify.'
  );
}

if (!supabaseServiceKey && !isBrowser) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY não está definido (apenas necessário no backend)');
}

// Cliente com anon key (usado no frontend - RLS respeita user)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role (usado no backend - ignora RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null as any;
