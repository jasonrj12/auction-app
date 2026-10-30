import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmt } from '../lib/format';
import { friendlyError } from '../lib/errors';
import Tabs from '../components/Tabs';
import StatTile from '../components/StatTile';
import DataTable from '../components/DataTable';
import Chip from '../components/Chip';
import Avatar from '../components/Avatar';
import Button from '../components/Button';

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'User Management' },
  { key: 'auctions', label: 'Auction Moderation' },
];

export default function Admin() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Admin Console
              </h1>
              <Chip label="ADMIN" type="admin" />
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Manage platform users, moderate listings, and view live metrics
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8">
          <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} className="border-b-0" />
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'auctions' && <AuctionsTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubAuctions = onSnapshot(
      query(collection(db, 'auctions'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAuctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    return () => {
      unsubUsers();
      unsubAuctions();
    };
  }, []);

  const now = new Date();
  const liveAuctions = auctions.filter((a) => {
    const ends = a.endsAt?.toDate ? a.endsAt.toDate() : new Date(a.endsAt);
    return ends > now;
  });

  const endedAuctions = auctions.filter((a) => {
    const ends = a.endsAt?.toDate ? a.endsAt.toDate() : new Date(a.endsAt);
    return ends <= now;
  });

  const salesVolume = endedAuctions
    .filter((a) => (a.bidCount || 0) > 0)
    .reduce((sum, a) => sum + (Number(a.currentBid) || 0), 0);

  const totalBids = auctions.reduce((sum, a) => sum + (Number(a.bidCount) || 0), 0);
  const admins = users.filter((u) => u.role === 'admin');
  const blocked = users.filter((u) => u.disabled === true);

  const recentColumns = [
    {
      key: 'title',
      label: 'Item',
      render: (r) => (
        <Link
          to={`/auction/${r.id}`}
          className="font-bold text-slate-900 hover:text-indigo-600 transition truncate max-w-[200px] block"
        >
          {r.title}
        </Link>
      ),
    },
    { key: 'sellerName', label: 'Seller' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const ends = r.endsAt?.toDate ? r.endsAt.toDate() : new Date(r.endsAt);
        const isLive = ends > now;
        return <Chip label={isLive ? 'Live' : 'Ended'} type={isLive ? 'live' : 'ended'} />;
      },
    },
    { key: 'bidCount', label: 'Total Bids', render: (r) => r.bidCount || 0 },
    {
      key: 'currentBid',
      label: 'Current / Final Bid',
      render: (r) => fmt(r.currentBid || r.startPrice),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (r) =>
        r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '—',
    },
  ];

  if (loading) {
    return <div className="py-12 text-center text-slate-400 text-sm">Loading statistics…</div>;
  }

  return (
    <div className="space-y-8">
      {/* 8 Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total Users" value={users.length} />
        <StatTile label="Administrators" value={admins.length} />
        <StatTile label="Blocked Users" value={blocked.length} />
        <StatTile label="Total Auctions" value={auctions.length} />
        <StatTile label="Live Now" value={liveAuctions.length} />
        <StatTile label="Ended Auctions" value={endedAuctions.length} />
        <StatTile label="Total Bids Placed" value={totalBids} />
        <StatTile label="Sales Volume" value={fmt(salesVolume)} sub="Ended with bids" />
      </div>

      {/* 8 Most Recent Auctions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Recently Listed Auctions
          </h2>
          <span className="text-xs text-slate-400 font-medium">8 most recent</span>
        </div>
        <DataTable
          columns={recentColumns}
          rows={auctions.slice(0, 8)}
          emptyText="No auctions listed on the platform yet."
        />
      </div>
    </div>
  );
}

function UsersTab() {
  const { user: currentAdmin } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  const handleToggleRole = async (targetUser) => {
    const isTargetAdmin = targetUser.role === 'admin';
    const actionLabel = isTargetAdmin ? 'remove admin role from' : 'grant admin role to';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${targetUser.displayName || targetUser.email}?`)) {
      return;
    }

    const newRole = isTargetAdmin ? 'user' : 'admin';
    setActionId(`${targetUser.id}-role`);

    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        role: newRole,
      });
      addToast(`Updated ${targetUser.displayName || targetUser.email} to ${newRole}.`, 'success');
    } catch (err) {
      console.error('Role update error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleBlock = async (targetUser) => {
    const isCurrentlyBlocked = targetUser.disabled === true;
    const actionLabel = isCurrentlyBlocked ? 'unblock' : 'block';

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${targetUser.displayName || targetUser.email}?`)) {
      return;
    }

    setActionId(`${targetUser.id}-disabled`);
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        disabled: !isCurrentlyBlocked,
      });
      addToast(
        `User ${targetUser.displayName || targetUser.email} has been ${isCurrentlyBlocked ? 'unblocked' : 'blocked'}.`,
        'success'
      );
    } catch (err) {
      console.error('Block update error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar photoData={u.photoData} name={u.displayName || u.email} size="sm" />
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 max-w-[140px] truncate">
              {u.displayName || 'Unnamed'}
            </span>
            <span className="text-xs text-slate-400">{u.id.substring(0, 8)}…</span>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (u) => <span className="font-medium text-slate-700">{u.email}</span>,
    },
    {
      key: 'phone',
      label: 'Mobile',
      render: (u) => u.phone || <span className="text-slate-400">—</span>,
    },
    {
      key: 'dob',
      label: 'Date of Birth',
      render: (u) => u.dob || <span className="text-slate-400">—</span>,
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <Chip
          label={u.role === 'admin' ? 'Admin' : 'User'}
          type={u.role === 'admin' ? 'admin' : 'user'}
        />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => (
        <Chip
          label={u.disabled ? 'Blocked' : 'Active'}
          type={u.disabled ? 'blocked' : 'active'}
        />
      ),
    },
    {
      key: 'joined',
      label: 'Joined',
      render: (u) =>
        u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (u) => {
        if (u.id === currentAdmin?.uid) {
          return (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              (You)
            </span>
          );
        }

        const isUpdatingRole = actionId === `${u.id}-role`;
        const isUpdatingBlock = actionId === `${u.id}-disabled`;

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isUpdatingRole || isUpdatingBlock}
              onClick={() => handleToggleRole(u)}
            >
              {isUpdatingRole
                ? 'Updating…'
                : u.role === 'admin'
                ? 'Remove admin'
                : 'Make admin'}
            </Button>

            <Button
              size="sm"
              variant={u.disabled ? 'secondary' : 'danger'}
              disabled={isUpdatingRole || isUpdatingBlock}
              onClick={() => handleToggleBlock(u)}
            >
              {isUpdatingBlock ? 'Updating…' : u.disabled ? 'Unblock' : 'Block'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search users by name, email, or mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-xs text-slate-400">
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading users…</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredUsers}
          emptyText="No users found matching your search."
        />
      )}
    </div>
  );
}

function AuctionsTab() {
  const { addToast } = useToast();
  const [auctions, setAuctions] = useState([]);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      query(collection(db, 'auctions'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAuctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const now = new Date();

  const filteredAuctions = auctions.filter((a) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.title || '').toLowerCase().includes(q) ||
      (a.sellerName || '').toLowerCase().includes(q)
    );
  });

  const handleEndNow = async (auction) => {
    if (!window.confirm(`Are you sure you want to end "${auction.title}" right now? The current leading bidder will win.`)) {
      return;
    }

    setActionId(`${auction.id}-end`);
    try {
      await updateDoc(doc(db, 'auctions', auction.id), {
        endsAt: Timestamp.fromDate(new Date()),
      });
      addToast(`Auction "${auction.title}" ended immediately.`, 'success');
    } catch (err) {
      console.error('End auction error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (auction) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE "${auction.title}" and all its bids? This action cannot be undone.`)) {
      return;
    }

    setActionId(`${auction.id}-del`);
    try {
      // 1. Delete all bids in subcollection
      const bidsSnap = await getDocs(collection(db, 'auctions', auction.id, 'bids'));
      if (!bidsSnap.empty) {
        const batch = writeBatch(db);
        bidsSnap.forEach((bDoc) => batch.delete(bDoc.ref));
        await batch.commit();
      }

      // 2. Delete auction document
      await deleteDoc(doc(db, 'auctions', auction.id));
      addToast(`Auction "${auction.title}" deleted.`, 'success');
    } catch (err) {
      console.error('Delete auction error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionId(null);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Item Title',
      render: (r) => (
        <Link
          to={`/auction/${r.id}`}
          className="font-bold text-slate-900 hover:text-indigo-600 transition truncate max-w-[200px] block"
          title={r.title}
        >
          {r.title}
        </Link>
      ),
    },
    { key: 'sellerName', label: 'Seller' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const ends = r.endsAt?.toDate ? r.endsAt.toDate() : new Date(r.endsAt);
        const live = ends > now;
        return <Chip label={live ? 'Live' : 'Ended'} type={live ? 'live' : 'ended'} />;
      },
    },
    { key: 'bidCount', label: 'Bids', render: (r) => r.bidCount || 0 },
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
      key: 'endsAt',
      label: 'End Time',
      render: (r) =>
        r.endsAt?.toDate ? r.endsAt.toDate().toLocaleString() : '—',
    },
    {
      key: 'actions',
      label: 'Moderation Actions',
      render: (r) => {
        const ends = r.endsAt?.toDate ? r.endsAt.toDate() : new Date(r.endsAt);
        const isLive = ends > now;
        const isEnding = actionId === `${r.id}-end`;
        const isDeleting = actionId === `${r.id}-del`;

        return (
          <div className="flex items-center gap-2">
            {isLive && (
              <Button
                size="sm"
                variant="warning"
                disabled={isEnding || isDeleting}
                onClick={() => handleEndNow(r)}
              >
                {isEnding ? 'Ending…' : 'End now'}
              </Button>
            )}

            <Button
              size="sm"
              variant="danger"
              disabled={isEnding || isDeleting}
              onClick={() => handleDelete(r)}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search auctions by title or seller…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-xs text-slate-400">
          Showing {filteredAuctions.length} of {auctions.length} auctions
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading auctions…</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredAuctions}
          emptyText="No auctions found matching your search."
        />
      )}
    </div>
  );
}
