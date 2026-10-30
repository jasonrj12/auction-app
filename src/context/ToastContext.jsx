import { createContext, useContext, useState, useCallback } from 'react';
import { CheckIcon, CloseIcon, AlertIcon, InfoIcon } from '../components/Icons';

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
    success: 'border-emerald-600 text-emerald-900',
    error: 'border-rose-600 text-rose-900',
    warning: 'border-amber-600 text-amber-900',
    info: 'border-slate-800 text-slate-900',
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
          <span className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckIcon className="w-4 h-4 text-emerald-600" />}
            {toast.type === 'error' && <CloseIcon className="w-4 h-4 text-rose-600" />}
            {toast.type === 'warning' && <AlertIcon className="w-4 h-4 text-amber-600" />}
            {toast.type === 'info' && <InfoIcon className="w-4 h-4 text-slate-700" />}
          </span>
          <p className="text-slate-800 text-sm flex-1 leading-snug font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
            aria-label="Dismiss alert"
          >
            <CloseIcon className="w-3.5 h-3.5" />
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
