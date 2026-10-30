import { useRef, useState } from 'react';
import Avatar from './Avatar';
import { fileToAvatar } from '../lib/image';

export default function PhotoPicker({ value, onChange, name = '', size = 'xl' }) {
  const inputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div
        className="relative group cursor-pointer"
        onClick={() => inputRef.current?.click()}
        title="Click to choose a photo"
      >
        <Avatar photoData={value} name={name} size={size} />

        <div className="absolute inset-0 bg-slate-950/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold backdrop-blur-[2px]">
          <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{processing ? 'Processing...' : value ? 'Change' : 'Upload'}</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-blue-600 hover:text-blue-800 transition"
        >
          {value ? 'Change Photo' : 'Upload Photo'}
        </button>

        <span className="text-slate-300">•</span>

        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-slate-600 hover:text-slate-900 transition"
        >
          {showUrlInput ? 'Cancel URL' : 'Image Link'}
        </button>

        {value && (
          <>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-rose-500 hover:text-rose-700 transition"
            >
              Remove
            </button>
          </>
        )}
      </div>

      {showUrlInput && (
        <form onSubmit={handleApplyUrl} className="flex gap-2 w-full mt-1">
          <input
            type="url"
            placeholder="Paste direct image URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition"
          >
            Apply
          </button>
        </form>
      )}

      {error && <p className="text-xs text-rose-600 text-center font-medium">{error}</p>}
    </div>
  );
}
