import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createSportsAuction } from '../services/sportsAuctions';
import { useToast } from '../context/ToastContext';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import Notice from '../components/Notice';
import { TrophyIcon, AlertIcon } from '../components/Icons';
import { friendlyError } from '../lib/errors';

const SPORTS = ['Badminton'];

export default function CreateAuction() {
  const { user, profile, isBlocked } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    sport: 'Badminton',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
    minIncrement: '500',
    defaultChips: '100000',
    status: 'live',
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertIcon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <Notice type="error" className="mb-6 text-left">
            Your account has been suspended by an administrator.
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
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) {
      errs.title = 'Tournament or League title is required.';
    }
    const inc = Number(form.minIncrement);
    if (isNaN(inc) || inc < 50) {
      errs.minIncrement = 'Minimum bid increment must be at least 50 chips.';
    }
    const chips = Number(form.defaultChips);
    if (isNaN(chips) || chips < 1000) {
      errs.defaultChips = 'Default chips must be at least 1,000 chips.';
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

    setSubmitting(true);

    try {
      const auctionId = await createSportsAuction(form, user, profile);
      addToast('Sports Auction room created successfully. Live round is ready.', 'success');
      navigate(`/auction/${auctionId}`);
    } catch (err) {
      console.error('Failed to create sports auction:', err);
      setGeneralError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-sm">
              <TrophyIcon className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Create Sports Auction
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Set up a live tournament player auction room for team owners to bid with chips
              </p>
            </div>
          </div>

          {generalError && (
            <Notice type="error" className="mb-6">
              {generalError}
            </Notice>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Tournament / League Title"
              id="title"
              placeholder="e.g. Premier Badminton Super League 2026"
              value={form.title}
              onChange={update('title')}
              error={errors.title}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Sport Discipline"
                value={form.sport}
                onChange={(v) => update('sport')({ target: { value: v } })}
                options={SPORTS}
                placeholder={null}
              />

              <Select
                label="Auction Status"
                value={form.status}
                onChange={(v) => update('status')({ target: { value: v } })}
                options={[
                  { value: 'live',     label: 'Live (Bidding open immediately)' },
                  { value: 'upcoming', label: 'Upcoming / Scheduled' },
                ]}
                placeholder={null}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Default Team Purse (Chips)"
                id="defaultChips"
                type="number"
                value={form.defaultChips}
                onChange={update('defaultChips')}
                error={errors.defaultChips}
                helper="Budget assigned to participating team owners"
                required
              />

              <Input
                label="Minimum Bid Increment (Chips)"
                id="minIncrement"
                type="number"
                value={form.minIncrement}
                onChange={update('minIncrement')}
                error={errors.minIncrement}
                helper="Minimum chips added per new bid (e.g. 500)"
                required
              />
            </div>

            <Input
              label="Banner Image URL"
              id="imageUrl"
              type="url"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={update('imageUrl')}
              helper="Tournament banner photo"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Auction Description & Rules
              </label>
              <textarea
                rows={3}
                placeholder="Specify tournament rules, max squad limit, overseas player rules, etc."
                value={form.description}
                onChange={update('description')}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1 font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-slate-900 hover:bg-black font-bold"
              >
                {submitting ? 'Launching Auction…' : 'Launch Sports Auction'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
