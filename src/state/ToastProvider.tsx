'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface Toast {
  id: number;
  text: string;
}

const ToastCtx = createContext<(text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

/** Transient confirmations, bottom-right, auto-dismissed after ~3s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((text: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap" id="toasts">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
