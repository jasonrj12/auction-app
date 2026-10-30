import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  const borderColors = {
    success: 'border-emerald-500 text-emerald-800',
    error: 'border-rose-500 text-rose-800',
    warning: 'border-amber-500 text-amber-800',
    info: 'border-indigo-500 text-indigo-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-white border-l-4 ${borderColors[toast.type] || borderColors.info} shadow-lg rounded-xl p-4 flex items-start gap-3 border border-slate-200 transition-all transform duration-200 ease-in-out`}
        >
          <span className="font-bold text-sm shrink-0 mt-0.5">
            {icons[toast.type] || '•'}
          </span>
          <p className="text-slate-800 text-sm flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="text-slate-400 hover:text-slate-600 text-base leading-none p-0.5 transition"
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
