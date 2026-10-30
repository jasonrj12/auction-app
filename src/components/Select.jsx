import { useState, useRef, useEffect } from 'react';

/**
 * Custom styled Select dropdown that matches the site design system.
 *
 * Props:
 *   label        – optional label string
 *   options      – array of { value, label } OR array of strings
 *   value        – current selected value
 *   onChange     – (value: string) => void   (not an event — just the value)
 *   placeholder  – placeholder text shown when nothing selected
 *   error        – error message string
 *   helper       – helper text below
 *   required     – shows red asterisk
 *   disabled     – greys out the control
 *   className    – extra classes on the wrapper div
 */
export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  error,
  helper,
  required = false,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Normalise options → [{value, label}]
  const normalised = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = normalised.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const choose = (val) => {
    onChange(val);
    setOpen(false);
  };

  const borderClass = error
    ? 'border-rose-400 bg-rose-50/50'
    : open
    ? 'border-blue-600 ring-2 ring-blue-500/20'
    : 'border-slate-300 hover:border-slate-400';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={ref}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 h-[42px] px-3.5 bg-white border rounded-xl text-sm transition focus:outline-none ${borderClass} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={selected ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="relative z-50">
          <ul
            className="absolute top-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            {placeholder && (
              <li
                className="px-4 py-2.5 text-sm text-slate-400 cursor-pointer hover:bg-slate-50 border-b border-slate-100"
                onClick={() => choose('')}
              >
                {placeholder}
              </li>
            )}
            {normalised.map((o) => {
              const isActive = o.value === value;
              return (
                <li
                  key={o.value}
                  onClick={() => choose(o.value)}
                  className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span>{o.label}</span>
                  {isActive && (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error  && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
