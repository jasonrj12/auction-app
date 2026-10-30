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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtChips } from '../lib/format';
import { subscribeAllPlayers, deletePlayer } from '../services/players';
import { subscribeAllTeams, setTeamChips, deleteTeam } from '../services/teams';
import { seedSampleSportsData } from '../services/sampleData';
import { ShieldIcon, TrophyIcon, PlayerIcon, OwnerIcon } from '../components/Icons';
import Tabs from '../components/Tabs';
import Chip from '../components/Chip';
import Button from '../components/Button';
import Input from '../components/Input';

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'players', label: 'Players Pool' },
  { key: 'teams', label: 'Team Franchises & Purses' },
  { key: 'auctions', label: 'Auctions Moderation' },
  { key: 'users', label: 'User Management' },
];

export default function Admin() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center">
                <ShieldIcon className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Tournament Admin Console
              </h1>
              <Chip label="ADMIN" type="admin" />
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Manage sports tournament athletes, team owner chip purses, and live auction rooms
            </p>
          </div>
          <Link to="/create">
            <Button variant="dark" className="font-bold">
              + Create Sports Auction
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8">
          <Tabs tabs={ADMIN_TABS} active={tab} onChange={setTab} className="border-b-0" />
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'players' && <PlayersTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'auctions' && <AuctionsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsubU = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubA = onSnapshot(collection(db, 'auctions'), (s) => setAuctions(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubP = subscribeAllPlayers(setPlayers);
    const unsubT = subscribeAllTeams(setTeams);

    return () => {
      unsubU();
      unsubA();
      unsubP();
      unsubT();
    };
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedSampleSportsData(user, profile);
      addToast('Sample sports players and teams loaded successfully.', 'success');
    } catch (err) {
      console.error('Seed error:', err);
      addToast('Error seeding sample data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const totalSpent = teams.reduce((acc, t) => acc + (t.spentChips || 0), 0);
  const totalSold = players.filter((p) => p.status === 'sold').length;

  return (
    <div className="space-y-6">
      {/* Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Athletes</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{players.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Franchise Teams</p>
          <p className="text-3xl font-black text-blue-700 mt-1">{teams.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Athletes Sold</p>
          <p className="text-3xl font-black text-emerald-700 mt-1">{totalSold}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chips Spent</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{fmtChips(totalSpent)}</p>
        </div>
      </div>

      {/* Demo Seed Box */}
      <div className="bg-slate-100 border border-slate-200 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Quick-Start Demo Data
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Instantly populate high-profile sports stars and 4 teams with 100,000 chip purses for testing.
          </p>
        </div>
        <Button
          onClick={handleSeed}
          disabled={seeding}
          variant="dark"
          className="font-bold whitespace-nowrap"
        >
          {seeding ? 'Populating...' : 'Seed Sample Sports Data'}
        </Button>
      </div>
    </div>
  );
}

function PlayersTab() {
  const { addToast } = useToast();
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeAllPlayers(setPlayers);
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this player?')) return;
    try {
      await deletePlayer(id);
      addToast('Player removed.', 'info');
    } catch (err) {
      addToast('Failed to delete player.', 'error');
    }
  };

  const filtered = players.filter((p) =>
    !search.trim() || p.name?.toLowerCase().includes(search.toLowerCase()) || p.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Manage Players Pool ({players.length})</h2>
          <p className="text-xs text-slate-500">View, monitor, and remove registered sports athletes</p>
        </div>
        <div className="w-64">
          <Input placeholder="Filter players..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Player</th>
              <th className="py-3 px-3">Sport & Role</th>
              <th className="py-3 px-3">Base Price</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Winning Team</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                    {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : p.name?.slice(0, 1)}
                  </div>
                  <span>{p.name}</span>
                </td>
                <td className="py-3 px-3 text-slate-600">{p.sport} • {p.role}</td>
                <td className="py-3 px-3 font-bold text-blue-700">{fmtChips(p.basePrice)}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                    p.status === 'sold' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'in_auction' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {p.status || 'Available'}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-700">{p.soldToTeamName || '-'}</td>
                <td className="py-3 px-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="text-rose-600 text-xs py-1">
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamsTab() {
  const { addToast } = useToast();
  const [teams, setTeams] = useState([]);
  const [editChipsId, setEditChipsId] = useState(null);
  const [newChips, setNewChips] = useState('');

  useEffect(() => {
    const unsub = subscribeAllTeams(setTeams);
    return () => unsub();
  }, []);

  const handleUpdateChips = async (teamId) => {
    const num = Number(newChips);
    if (isNaN(num) || num < 0) {
      addToast('Enter a valid chip amount.', 'error');
      return;
    }
    try {
      await setTeamChips(teamId, num);
      addToast('Team chip purse updated successfully.', 'success');
      setEditChipsId(null);
      setNewChips('');
    } catch (err) {
      addToast('Failed to update chips.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this team franchise?')) return;
    try {
      await deleteTeam(id);
      addToast('Team removed.', 'info');
    } catch (err) {
      addToast('Failed to delete team.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Manage Team Franchises & Purses ({teams.length})</h2>
        <p className="text-xs text-slate-500">Adjust bidder chip balances, manage limits, and view squads</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Franchise</th>
              <th className="py-3 px-3">Owner Details</th>
              <th className="py-3 px-3">Remaining Purse</th>
              <th className="py-3 px-3">Spent Chips</th>
              <th className="py-3 px-3">Squad Count</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teams.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-blue-400 flex items-center justify-center font-bold text-xs overflow-hidden">
                    {t.teamLogo ? <img src={t.teamLogo} alt={t.teamName} className="w-full h-full object-cover" /> : t.teamShortCode || 'TM'}
                  </div>
                  <div>
                    <span>{t.teamName}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">{t.teamShortCode}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-700">
                  <span className="font-bold">{t.ownerName}</span>
                  <span className="text-[10px] text-slate-400 block">{t.ownerEmail}</span>
                </td>
                <td className="py-3 px-3 font-black text-emerald-800">
                  {editChipsId === t.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className="w-24 p-1 border rounded text-xs"
                        value={newChips}
                        onChange={(e) => setNewChips(e.target.value)}
                      />
                      <button onClick={() => handleUpdateChips(t.id)} className="text-emerald-600 font-bold">✓</button>
                      <button onClick={() => setEditChipsId(null)} className="text-slate-400">✕</button>
                    </div>
                  ) : (
                    <span>{fmtChips(t.remainingChips)}</span>
                  )}
                </td>
                <td className="py-3 px-3 text-slate-800 font-bold">{fmtChips(t.spentChips)}</td>
                <td className="py-3 px-3">{t.squad?.length || 0} / {t.squadLimit || 15}</td>
                <td className="py-3 px-3 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditChipsId(t.id);
                      setNewChips(String(t.remainingChips || 100000));
                    }}
                    className="text-xs py-1"
                  >
                    Adjust Purse
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(t.id)} className="text-rose-600 text-xs py-1">
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuctionsTab() {
  const { addToast } = useToast();
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'auctions'), (s) => {
      setAuctions(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this auction room?')) return;
    try {
      await deleteDoc(doc(db, 'auctions', id));
      addToast('Auction deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete auction.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Sports Auctions ({auctions.length})</h2>
          <p className="text-xs text-slate-500">Monitor active tournament rooms and live rounds</p>
        </div>
        <Link to="/create">
          <Button size="sm" variant="dark">+ New Auction</Button>
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {auctions.map((auc) => (
          <div key={auc.id} className="py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link to={`/auction/${auc.id}`} className="font-black text-sm text-slate-900 hover:text-blue-600">
                  {auc.title}
                </Link>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                  {auc.sport}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Status: <strong className="uppercase">{auc.status || 'live'}</strong> • Current Bid: {fmtChips(auc.currentBid)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/auction/${auc.id}`}>
                <Button size="sm" variant="outline" className="text-xs">
                  Enter Room
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => handleDelete(auc.id)} className="text-rose-600 text-xs">
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'users'), (s) => {
      setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      addToast(`Role changed to ${newRole}.`, 'success');
    } catch (err) {
      addToast('Failed to update role.', 'error');
    }
  };

  const handleToggleDisabled = async (uid, currentVal) => {
    try {
      await updateDoc(doc(db, 'users', uid), { disabled: !currentVal });
      addToast(currentVal ? 'User unblocked.' : 'User blocked.', 'info');
    } catch (err) {
      addToast('Failed to toggle user status.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">User Account Roles ({users.length})</h2>
        <p className="text-xs text-slate-500">Manage user roles (player, bidder, admin) and access</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Email</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 px-3 font-bold text-slate-900">{u.displayName || 'User'}</td>
                <td className="py-3 px-3 text-slate-600">{u.email}</td>
                <td className="py-3 px-3">
                  <select
                    value={u.role || 'player'}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="p-1 border rounded text-xs bg-slate-50 font-bold"
                  >
                    <option value="player">Athlete (Player)</option>
                    <option value="bidder">Team Owner (Bidder)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${u.disabled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {u.disabled ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleDisabled(u.id, u.disabled)}
                    className={`text-xs py-1 ${u.disabled ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {u.disabled ? 'Unblock' : 'Block'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
