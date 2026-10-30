import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAuction } from '../services/auctions';
import { useToast } from '../context/ToastContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Notice from '../components/Notice';
import { friendlyError } from '../lib/errors';

function getDefaultEndsAt() {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // Format as YYYY-MM-DDTHH:mm in local time for datetime-local input
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = future.getFullYear();
  const MM = pad(future.getMonth() + 1);
  const dd = pad(future.getDate());
  const hh = pad(future.getHours());
  const mm = pad(future.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export default function CreateAuction() {
  const { user, profile, isBlocked } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    startPrice: '',
    minIncrement: '100',
    endsAt: getDefaultEndsAt(),
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <Notice type="error" className="mb-6 text-left">
            Your account has been suspended by an administrator. You cannot list new items or place bids.
          </Notice>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const validate = () => {
    const errs = {};

    if (!form.title.trim()) {
      errs.title = 'Item title is required.';
    }

    const price = Number(form.startPrice);
    if (!form.startPrice || isNaN(price) || price <= 0) {
      errs.startPrice = 'Starting bid must be a positive number.';
    }

    const increment = Number(form.minIncrement);
    if (!form.minIncrement || isNaN(increment) || increment <= 0) {
      errs.minIncrement = 'Minimum increment must be a positive number.';
    }

    if (!form.endsAt) {
      errs.endsAt = 'End date and time is required.';
    } else {
      const selected = new Date(form.endsAt);
      const minFuture = new Date(Date.now() + 60 * 1000); // at least 1 min in future
      if (isNaN(selected.getTime()) || selected < minFuture) {
        errs.endsAt = 'End time must be at least 1 minute into the future.';
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const newAuctionId = await createAuction(form, user, profile);
      addToast('Your auction has been successfully listed!', 'success');
      navigate(`/auction/${newAuctionId}`);
    } catch (err) {
      console.error('Create auction error:', err);
      setGeneralError(friendlyError(err));
      addToast(friendlyError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm">
          <div className="mb-8">
            <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">
              Seller Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              List an Item for Auction
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Fill in the item details to start receiving live bids immediately
            </p>
          </div>

          {generalError && (
            <Notice type="error" className="mb-6">
              {generalError}
            </Notice>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Item Title"
              id="title"
              type="text"
              placeholder="e.g. Vintage 1970s Chronograph Watch"
              value={form.title}
              onChange={update('title')}
              error={errors.title}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={update('description')}
                placeholder="Describe the condition, authenticity, provenance, and specifications of your item…"
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <Input
              label="Image URL"
              id="imageUrl"
              type="url"
              placeholder="https://images.unsplash.com/…"
              value={form.imageUrl}
              onChange={update('imageUrl')}
              helper="Direct link to a public image (JPG, PNG, WebP). Leave blank to use letter banner."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Starting Bid"
                id="startPrice"
                type="number"
                min="1"
                step="1"
                placeholder="1000"
                value={form.startPrice}
                onChange={update('startPrice')}
                error={errors.startPrice}
                required
              />

              <Input
                label="Minimum Bid Increment"
                id="minIncrement"
                type="number"
                min="1"
                step="1"
                placeholder="100"
                value={form.minIncrement}
                onChange={update('minIncrement')}
                error={errors.minIncrement}
                helper="Default: 100"
                required
              />
            </div>

            <Input
              label="Auction Ends At"
              id="endsAt"
              type="datetime-local"
              value={form.endsAt}
              onChange={update('endsAt')}
              error={errors.endsAt}
              helper="Must be at least 1 minute in the future. Defaults to 24 hours from now."
              required
            />

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="shadow-md"
              >
                {submitting ? 'Publishing Listing…' : 'Publish Auction'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
