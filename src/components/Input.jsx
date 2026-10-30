export default function Input({
  label,
  id,
  error,
  helper,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={id}
        required={required}
        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
          error
            ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-400'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  );
}
