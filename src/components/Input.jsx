import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

export default function Input({
  label,
  id,
  error,
  helper,
  className = '',
  required = false,
  type = 'text',
  showPasswordToggle = false,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={effectiveType}
          required={required}
          className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 ${
            showPasswordToggle && isPassword ? 'pr-11' : ''
          } ${
            error
              ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-400'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          {...props}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none p-1 rounded-md transition"
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOffIcon className="w-4 h-4 text-slate-500" />
            ) : (
              <EyeIcon className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  );
}
