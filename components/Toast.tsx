import React, { useState, useCallback, useEffect } from 'react';

export interface Toast {
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
}

interface ToastContextValue {
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

export const ToastContext = React.createContext<ToastContextValue>({ addToast: () => { } });

export const useToast = () => React.useContext(ToastContext);

const ICONS: Record<Toast['type'], string> = {
    success: 'task_alt',
    info: 'info',
    warning: 'warning',
    error: 'error',
};

const COLORS: Record<Toast['type'], { bg: string; icon: string; bar: string }> = {
    success: { bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400', bar: 'bg-green-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', icon: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
    error: { bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', icon: 'text-red-600 dark:text-red-400', bar: 'bg-red-500' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const colors = COLORS[toast.type];

    useEffect(() => {
        const t = setTimeout(() => onDismiss(toast.id), 5000);
        return () => clearTimeout(t);
    }, [toast.id, onDismiss]);

    return (
        <div className={`relative flex gap-3 w-80 p-4 rounded-2xl border-2 shadow-xl ${colors.bg} overflow-hidden animate-fade-in`}>
            {/* Left colored bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bar}`} />

            {/* Icon */}
            <span className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${colors.icon}`}>{ICONS[toast.type]}</span>

            {/* Content */}
            <div className="flex-1 min-w-0 pl-1">
                <p className="font-black text-sm dark:text-white leading-tight">{toast.title}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{toast.message}</p>
            </div>

            {/* Close */}
            <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 self-start text-slate-400 hover:text-slate-600 transition-colors"
            >
                <span className="material-symbols-outlined text-lg">close</span>
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {/* Toast portal */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onDismiss={dismissToast} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
