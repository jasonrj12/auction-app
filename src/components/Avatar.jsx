import { useState, useEffect } from 'react';

export default function Avatar({ photoData, name = '', size = 'md', className = '' }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoData]);

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const initial = name && name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

  if (photoData && !hasError) {
    return (
      <img
        src={photoData}
        alt={name || 'User avatar'}
        className={`${sizes[size] || sizes.md} rounded-full object-cover border-2 border-slate-200 shadow-sm shrink-0 ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full bg-slate-900 flex items-center justify-center text-white font-black border-2 border-slate-200 shadow-sm shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
}
