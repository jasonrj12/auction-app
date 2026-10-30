export default function Avatar({ photoData, name = '', size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  const initial = name && name.trim().length > 0 ? name.trim()[0].toUpperCase() : '?';

  if (photoData) {
    return (
      <img
        src={photoData}
        alt={name || 'User avatar'}
        className={`${sizes[size] || sizes.md} rounded-full object-cover border-2 border-white shadow-sm shrink-0 ${className}`}
        onError={(e) => {
          // If image fails to render, hide image and show fallback
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
}
