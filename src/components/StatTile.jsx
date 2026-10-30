export default function StatTile({ label, value, sub, className = '' }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between ${className}`}
    >
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-2">
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}
