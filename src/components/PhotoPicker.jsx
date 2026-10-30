import { useRef, useState } from 'react';
import Avatar from './Avatar';
import { fileToAvatar } from '../lib/image';

export default function PhotoPicker({ value, onChange, name = '', size = 'xl' }) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setProcessing(true);
    try {
      const dataUrl = await fileToAvatar(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err.message || 'Failed to process image.');
    } finally {
      setProcessing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <Avatar photoData={value} name={name} size={size} />
        
        <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[2px]">
          {processing ? 'Processing…' : 'Change'}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          {value ? 'Change photo' : 'Upload photo'}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-semibold text-rose-500 hover:text-rose-700 transition"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-rose-600 text-center">{error}</p>}
    </div>
  );
}
