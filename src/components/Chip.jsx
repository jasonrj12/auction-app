const styles = {
  live: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ended: 'bg-rose-100 text-rose-800 border-rose-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  admin: 'bg-violet-100 text-violet-800 border-violet-200',
  leading: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  outbid: 'bg-rose-100 text-rose-800 border-rose-200',
  won: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  lost: 'bg-slate-100 text-slate-700 border-slate-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  blocked: 'bg-rose-100 text-rose-800 border-rose-200',
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
