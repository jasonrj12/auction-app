const styles = {
  info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-rose-50 border-rose-200 text-rose-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
};

const icons = {
  info: 'ℹ',
  warning: '⚠',
  error: '✕',
  success: '✓',
};

export default function Notice({ type = 'info', children, className = '' }) {
  return (
    <div
      className={`border rounded-2xl p-4 text-sm flex items-start gap-3 ${styles[type] || styles.info} ${className}`}
    >
      <span className="font-bold shrink-0 mt-0.5">{icons[type] || '•'}</span>
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
