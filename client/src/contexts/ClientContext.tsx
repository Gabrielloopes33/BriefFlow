import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getStorageValue, setStorageValue, removeStorageValue, STORAGE_KEYS } from '@/lib/client-storage';

export interface ClientContextType {
  activeClientId: string | null;
  activeClient: any | null;
  setActiveClient: (clientId: string | null) => void;
  clearActiveClient: () => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

interface ClientProviderProps {
  children: ReactNode;
  initialClients?: any[];
}

export function ClientProvider({ children, initialClients }: ClientProviderProps) {
  const [activeClientId, setActiveClientIdState] = useState<string | null>(() => 
    getStorageValue<string | null>(STORAGE_KEYS.ACTIVE_CLIENT)
  );
  const [isLoading, setIsLoading] = useState(true);

  // Sincroniza com eventos de storage (múltiplas abas)
  useEffect(() => {
    const handleStorageChange = (event: CustomEvent) => {
      if (event.detail?.key === STORAGE_KEYS.ACTIVE_CLIENT) {
        setActiveClientIdState(event.detail.value);
      }
    };

    window.addEventListener('bf-storage-change', handleStorageChange as EventListener);
    
    // Listener para storage nativo (múltiplas janelas)
    const handleNativeStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.ACTIVE_CLIENT) {
        const value = event.newValue ? JSON.parse(event.newValue) : null;
        setActiveClientIdState(value);
      }
    };
    
    window.addEventListener('storage', handleNativeStorage);

    return () => {
      window.removeEventListener('bf-storage-change', handleStorageChange as EventListener);
      window.removeEventListener('storage', handleNativeStorage);
    };
  }, []);

  // Encontra o cliente ativo na lista
  const clientList = initialClients || [];

  const activeClient = activeClientId 
    ? clientList.find(c => c.id === activeClientId) || null
    : null;

  const setActiveClient = useCallback((clientId: string | null) => {
    if (clientId) {
      setActiveClientIdState(clientId);
      setStorageValue(STORAGE_KEYS.ACTIVE_CLIENT, clientId);
    } else {
      clearActiveClient();
    }
  }, []);

  const clearActiveClient = useCallback(() => {
    setActiveClientIdState(null);
    removeStorageValue(STORAGE_KEYS.ACTIVE_CLIENT);
  }, []);

  // Marca como carregado após hydratation
  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <ClientContext.Provider 
      value={{
        activeClientId,
        activeClient,
        setActiveClient,
        clearActiveClient,
        isLoading,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const context = useContext(ClientContext);
  
  if (context === undefined) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  
  return context;
}
