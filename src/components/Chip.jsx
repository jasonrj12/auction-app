const styles = {
  live: 'bg-red-50 text-red-700 border-red-200',
  ended: 'bg-slate-100 text-slate-700 border-slate-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  admin: 'bg-slate-900 text-white border-slate-900',
  leading: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  outbid: 'bg-rose-50 text-rose-800 border-rose-200',
  won: 'bg-blue-50 text-blue-800 border-blue-200',
  lost: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  blocked: 'bg-rose-50 text-rose-800 border-rose-200',
  user: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Chip({ label, type = 'user', className = '' }) {
  const selectedStyle = styles[type] || styles.user;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${selectedStyle} ${className}`}
    >
      {label}
    </span>
  );
}
