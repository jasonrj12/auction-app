import { InfoIcon, AlertIcon, CheckIcon, CloseIcon } from './Icons';

const styles = {
  info: 'bg-slate-100 border-slate-200 text-slate-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-rose-50 border-rose-200 text-rose-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
};

export default function Notice({ type = 'info', children, className = '' }) {
  return (
    <div
      className={`border rounded-2xl p-4 text-sm flex items-start gap-3 ${styles[type] || styles.info} ${className}`}
    >
      <span className="shrink-0 mt-0.5">
        {type === 'error' && <CloseIcon className="w-4 h-4 text-rose-600" />}
        {type === 'success' && <CheckIcon className="w-4 h-4 text-emerald-600" />}
        {type === 'warning' && <AlertIcon className="w-4 h-4 text-amber-600" />}
        {type === 'info' && <InfoIcon className="w-4 h-4 text-slate-600" />}
      </span>
      <div className="flex-1 leading-relaxed font-medium">{children}</div>
    </div>
  );
}
