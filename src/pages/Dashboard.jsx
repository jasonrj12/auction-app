import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmt } from '../lib/format';
import { friendlyError } from '../lib/errors';
import { validatePhone, validateDob } from '../lib/validators';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import StatTile from '../components/StatTile';
import Tabs from '../components/Tabs';
import Notice from '../components/Notice';
import Button from '../components/Button';
import Input from '../components/Input';
import PhotoPicker from '../components/PhotoPicker';
import AuctionCard from '../components/AuctionCard';
import DataTable from '../components/DataTable';

const TABS = [
  { key: 'bids', label: 'My Bids' },
  { key: 'listings', label: 'My Listings' },
  { key: 'profile', label: 'Edit Profile' },
];

export default function Dashboard() {
  const { user, profile, isAdmin, isBlocked, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('bids');

  // Real-time bids queries
  const [bidAuctions, setBidAuctions] = useState([]);
  const [leadingAuctions, setLeadingAuctions] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;

    // 1. Query auctions where user is in bidderIds array
    const qBidders = query(
      collection(db, 'auctions'),
      where('bidderIds', 'array-contains', user.uid)
    );
    const unsubBidders = onSnapshot(
      qBidders,
      (snap) => {
        setBidAuctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => console.error('Error fetching bid auctions:', err)
    );

    // 2. Query auctions where user is highestBidderId (merges older auctions that might lack bidderIds)
    const qLeading = query(
      collection(db, 'auctions'),
      where('highestBidderId', '==', user.uid)
    );
    const unsubLeading = onSnapshot(
      qLeading,
      (snap) => {
        setLeadingAuctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Error fetching leading auctions:', err)
    );

    // 3. Query user's own listings
    const qListings = query(
      collection(db, 'auctions'),
      where('sellerId', '==', user.uid)
    );
    const unsubListings = onSnapshot(
      qListings,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort newest first
        items.sort((a, b) => {
          const aT = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bT = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bT - aT;
        });
        setListings(items);
      },
      (err) => console.error('Error fetching user listings:', err)
    );

    return () => {
      unsubBidders();
      unsubLeading();
      unsubListings();
    };
  }, [user]);

  // Merge the two bid sets uniquely by ID
  const mergedBidAuctions = useMemo(() => {
    const map = new Map();
    bidAuctions.forEach((a) => map.set(a.id, a));
    leadingAuctions.forEach((a) => {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    });
    return Array.from(map.values());
  }, [bidAuctions, leadingAuctions]);

  // Compute metrics
  const now = new Date();
  const leadingNow = mergedBidAuctions.filter((a) => {
    const ends = a.endsAt?.toDate ? a.endsAt.toDate() : new Date(a.endsAt);
    return ends > now && a.highestBidderId === user?.uid;
  });

  const wonAuctions = mergedBidAuctions.filter((a) => {
    const ends = a.endsAt?.toDate ? a.endsAt.toDate() : new Date(a.endsAt);
    return ends <= now && a.highestBidderId === user?.uid;
  });

  const totalSpent = wonAuctions.reduce((sum, a) => sum + (Number(a.currentBid) || 0), 0);

  const tabsWithCounts = TABS.map((t) => {
    if (t.key === 'bids') return { ...t, count: mergedBidAuctions.length };
    if (t.key === 'listings') return { ...t, count: listings.length };
    return t;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar
              photoData={profile?.photoData}
              name={profile?.displayName || user?.email}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {profile?.displayName || 'My Account'}
                </h1>
                {isAdmin && <Chip label="ADMIN" type="admin" />}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
              {profile?.phone && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <span>📱</span> {profile.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/create">
              <Button size="sm">Create New Listing</Button>
            </Link>
          </div>
        </div>

        {/* Suspended Account Banner */}
        {isBlocked && (
          <Notice type="error" className="mb-8">
            <strong>Account Suspended:</strong> An administrator has disabled bidding and listing privileges on this account.
          </Notice>
        )}

        {/* Statistics Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <StatTile label="Auctions Bid On" value={mergedBidAuctions.length} />
          <StatTile
            label="Leading Now"
            value={leadingNow.length}
            sub={leadingNow.length > 0 ? 'Highest bidder' : undefined}
          />
          <StatTile label="Won" value={wonAuctions.length} />
          <StatTile label="Total Spent" value={fmt(totalSpent)} />
          <StatTile label="Your Listings" value={listings.length} />
        </div>

        {/* Tabs Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-6">
          <Tabs
            tabs={tabsWithCounts}
            active={tab}
            onChange={setTab}
            className="border-b-0"
          />
        </div>

        {/* Tab Contents */}
        {tab === 'bids' && (
          <MyBidsTab auctions={mergedBidAuctions} userId={user?.uid} loading={loading} />
        )}

        {tab === 'listings' && (
          <MyListingsTab listings={listings} addToast={addToast} />
        )}

        {tab === 'profile' && (
          <ProfileTab
            user={user}
            profile={profile}
            refreshProfile={refreshProfile}
            addToast={addToast}
          />
        )}
      </div>
    </div>
  );
}

function MyBidsTab({ auctions, userId, loading }) {
  const now = new Date();

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 text-sm">
        Loading your bids…
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 text-center shadow-sm">
        <div className="text-5xl mb-3">🔨</div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No bids yet</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
          You haven't participated in any auctions yet. Browse active listings to place your first bid!
        </p>
        <Link to="/">
          <Button>Browse Auctions</Button>
        </Link>
      </div>
    );
  }

  const getStatus = (auction) => {
    const ends = auction.endsAt?.toDate ? auction.endsAt.toDate() : new Date(auction.endsAt);
    const isLive = ends > now;

    if (isLive) {
      return auction.highestBidderId === userId
        ? { label: 'Leading', type: 'leading' }
        : { label: 'Outbid', type: 'outbid' };
    } else {
      return auction.highestBidderId === userId
        ? { label: 'Won', type: 'won' }
        : { label: 'Lost', type: 'lost' };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {auctions.map((auction) => {
        const status = getStatus(auction);
        return (
          <div key={auction.id} className="relative group">
            {/* Overlay status chip */}
            <div className="absolute top-3 left-3 z-20">
              <Chip label={status.label} type={status.type} className="shadow-sm font-bold" />
            </div>
            <AuctionCard auction={auction} />
          </div>
        );
      })}
    </div>
  );
}

function MyListingsTab({ listings, addToast }) {
  const [deletingId, setDeletingId] = useState(null);
  const now = new Date();

  const handleDelete = async (auction) => {
    if (!window.confirm(`Are you sure you want to delete "${auction.title}"?`)) {
      return;
    }

    setDeletingId(auction.id);
    try {
      // Delete any bids
      const bidsSnap = await getDocs(collection(db, 'auctions', auction.id, 'bids'));
      if (!bidsSnap.empty) {
        const batch = writeBatch(db);
        bidsSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await deleteDoc(doc(db, 'auctions', auction.id));
      addToast('Listing deleted successfully.', 'success');
    } catch (err) {
      console.error('Delete listing error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Item Title',
      render: (r) => (
        <Link
          to={`/auction/${r.id}`}
          className="font-bold text-slate-900 hover:text-indigo-600 transition"
        >
          {r.title}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const ends = r.endsAt?.toDate ? r.endsAt.toDate() : new Date(r.endsAt);
        const live = ends > now;
        return <Chip label={live ? 'Live' : 'Ended'} type={live ? 'live' : 'ended'} />;
      },
    },
    {
      key: 'bidCount',
      label: 'Bids',
      render: (r) => (
        <span className="font-semibold text-slate-700">{r.bidCount || 0}</span>
      ),
    },
    {
      key: 'currentBid',
      label: 'Current Bid',
      render: (r) => (
        <span className="font-extrabold text-indigo-600">
          {fmt(r.currentBid || r.startPrice)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => {
        const hasBids = (r.bidCount || 0) > 0;
        if (hasBids) {
          return (
            <span className="text-xs text-slate-400 font-medium italic">
              Has active bids
            </span>
          );
        }
        return (
          <Button
            size="sm"
            variant="danger"
            disabled={deletingId === r.id}
            onClick={() => handleDelete(r)}
          >
            {deletingId === r.id ? 'Deleting…' : 'Delete'}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          {listings.length} item{listings.length === 1 ? '' : 's'} listed
        </p>
        <Link to="/create">
          <Button size="sm">New Listing</Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={listings}
        emptyText="You haven't listed any auctions yet. Click 'New Listing' to get started!"
      />
    </div>
  );
}

function ProfileTab({ user, profile, refreshProfile, addToast }) {
  // Keep form state strictly local so firestore snapshots don't reset while user types
  const [photoData, setPhotoData] = useState(profile?.photoData || '');
  const [form, setForm] = useState({
    name: profile?.displayName || '',
    phone: profile?.phone || '',
    dob: profile?.dob || '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!form.name.trim()) {
      errs.name = 'Full name is required (max 40 chars).';
    } else if (form.name.trim().length > 40) {
      errs.name = 'Full name must be at most 40 characters.';
    }

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errs.phone = phoneErr;

    const dobErr = validateDob(form.dob);
    if (dobErr) errs.dob = dobErr;

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: form.name.trim(),
        });
      }

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: form.name.trim(),
        phone: form.phone.trim(),
        dob: form.dob,
        photoData: photoData || '',
      });

      await refreshProfile();
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Save profile error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      addToast(`Password reset email sent to ${user.email}`, 'success');
    } catch (err) {
      console.error('Password reset error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Profile Details</h2>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex flex-col items-center justify-center mb-4">
          <PhotoPicker
            value={photoData}
            onChange={setPhotoData}
            name={form.name}
            size="xl"
          />
          <span className="text-xs text-slate-400 mt-2">
            Click image to choose new photo (auto-resized)
          </span>
        </div>

        <Input
          label="Full name"
          id="name"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          required
        />

        <Input
          label="Mobile number"
          id="phone"
          type="tel"
          value={form.phone}
          onChange={update('phone')}
          error={errors.phone}
          required
        />

        <Input
          label="Date of birth"
          id="dob"
          type="date"
          value={form.dob}
          onChange={update('dob')}
          error={errors.dob}
          required
        />

        <div>
          <label className="text-sm font-medium text-slate-700">Email Address</label>
          <div className="mt-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm">
            {user?.email} <span className="text-xs text-slate-400 ml-2">(Read-only)</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Account Role</label>
          <div className="mt-1 flex items-center gap-2">
            <Chip
              label={profile?.role === 'admin' ? 'Administrator' : 'Standard User'}
              type={profile?.role === 'admin' ? 'admin' : 'user'}
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100">
          <Button type="submit" disabled={saving} size="md" className="w-full sm:w-auto">
            {saving ? 'Saving changes…' : 'Save Changes'}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={resetting}
            onClick={handleSendPasswordReset}
            size="md"
            className="w-full sm:w-auto"
          >
            {resetting ? 'Sending…' : 'Send Password Reset Email'}
          </Button>
        </div>
      </form>
    </div>
  );
}
