import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtChips } from '../lib/format';
import { subscribeAllPlayers, updatePlayer, deletePlayer } from '../services/players';
import { subscribeAllTeams, setTeamChips, deleteTeam } from '../services/teams';
import {
  bringPlayerToHammer,
  sellPlayerToWinner,
  passPlayerUnsold,
  setAuctionStatus,
  endSportsAuction,
} from '../services/sportsAuctions';
import {
  ShieldIcon,
  TrophyIcon,
  PlayerIcon,
  OwnerIcon,
  GavelIcon,
  LivePulse,
  CheckIcon,
  CloseIcon,
  PlusIcon,
  InfoIcon,
} from '../components/Icons';
import Button from '../components/Button';
import Input from '../components/Input';
import Avatar from '../components/Avatar';

const ADMIN_TABS = [
  { key: 'bidding', label: 'Live Bidding & Auctions' },
  { key: 'players', label: 'Players Pool' },
  { key: 'teams', label: 'Franchises & Chip Purses' },
  { key: 'users', label: 'User Roles & Access' },
];

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(
    ADMIN_TABS.some((t) => t.key === initialTab) ? initialTab : 'bidding'
  );

  useEffect(() => {
    const currentParam = searchParams.get('tab');
    if (currentParam && ADMIN_TABS.some((t) => t.key === currentParam)) {
      setTab(currentParam);
    }
  }, [searchParams]);

  const handleTabChange = (key) => {
    setTab(key);
    setSearchParams({ tab: key });
  };

  // Shared Data across Admin console
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubP = subscribeAllPlayers(setPlayers);
    const unsubT = subscribeAllTeams(setTeams);

    if (!db) return () => {};
    const unsubA = onSnapshot(collection(db, 'auctions'), (snap) => {
      setAuctions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubU = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubP();
      unsubT();
      unsubA();
      unsubU();
    };
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const liveAuctionsCount = auctions.filter((a) => a.status === 'live').length;
    const soldPlayersCount = players.filter((p) => p.status === 'sold').length;
    const totalSpent = teams.reduce((acc, t) => acc + (t.spentChips || 0), 0);
    return {
      liveAuctions: liveAuctionsCount,
      totalPlayers: players.length,
      soldPlayers: soldPlayersCount,
      totalTeams: teams.length,
      totalSpent,
    };
  }, [auctions, players, teams]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-sm">
                <ShieldIcon className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Tournament Admin Console
                  </h1>
                  <span className="bg-slate-900 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                    ADMIN
                  </span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Live auctioneer podium, player draft registry, team purse ledger, and user permissions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/create">
              <Button size="md" variant="dark" className="font-bold flex items-center gap-1.5 shadow-sm">
                <PlusIcon className="w-4 h-4" />
                <span>Create New Auction</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Live Auction Rooms</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.liveAuctions}</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Shuttlers Drafted</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {metrics.soldPlayers} <span className="text-xs text-slate-400 font-semibold">/ {metrics.totalPlayers}</span>
            </p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Franchises</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.totalTeams}</p>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chips Transacted</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">{fmtChips(metrics.totalSpent)}</p>
          </div>
        </div>

        {/* Clean Aligned Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {ADMIN_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {t.key === 'bidding' && <GavelIcon className="w-4 h-4" />}
                  {t.key === 'players' && <PlayerIcon className="w-4 h-4" />}
                  {t.key === 'teams' && <OwnerIcon className="w-4 h-4" />}
                  {t.key === 'users' && <ShieldIcon className="w-4 h-4" />}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab View */}
        {tab === 'bidding' && (
          <BiddingTab auctions={auctions} players={players} teams={teams} />
        )}

        {tab === 'players' && (
          <PlayersTab players={players} />
        )}

        {tab === 'teams' && (
          <TeamsTab teams={teams} />
        )}

        {tab === 'users' && (
          <UsersTab users={users} />
        )}

      </div>
    </div>
  );
}

/* =========================================================================
   TAB 1: LIVE BIDDING & AUCTIONS CONTROLLER (PRIMARY FOCUS)
========================================================================= */
function BiddingTab({ auctions, players, teams }) {
  const { addToast } = useToast();
  const [selectedAuctionForHammer, setSelectedAuctionForHammer] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleDeleteAuction = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the auction "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'auctions', id));
      addToast('Auction deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete auction.', 'error');
    }
  };

  const handleToggleStatus = async (auc) => {
    const nextStatus = auc.status === 'live' ? 'paused' : 'live';
    try {
      await setAuctionStatus(auc.id, nextStatus);
      addToast(
        nextStatus === 'paused'
          ? 'Auction PAUSED. Live bidding is suspended.'
          : 'Auction is LIVE! Bidding active.',
        nextStatus === 'paused' ? 'info' : 'success'
      );
    } catch (err) {
      addToast('Failed to update status.', 'error');
    }
  };

  const handleHammerSold = async (auc) => {
    if (!auc.currentPlayer || !auc.highestBidderTeamId) {
      addToast('Cannot award player: No bids placed yet.', 'error');
      return;
    }
    const winningTeam = teams.find((t) => t.id === auc.highestBidderTeamId);
    if (!winningTeam) {
      addToast('Winning team information not found.', 'error');
      return;
    }

    setLoadingAction(true);
    try {
      await sellPlayerToWinner(auc.id, auc.currentPlayer, winningTeam, auc.currentBid);
      addToast(
        `HAMMER DOWN: ${auc.currentPlayer.name} SOLD to ${winningTeam.teamName} for ${fmtChips(auc.currentBid)}.`,
        'success'
      );
    } catch (err) {
      addToast(err.message || 'Failed to sell player.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleHammerPass = async (auc) => {
    if (!auc.currentPlayer) return;
    setLoadingAction(true);
    try {
      await passPlayerUnsold(auc.id, auc.currentPlayer);
      addToast(`${auc.currentPlayer.name} passed as UNSOLD.`, 'info');
    } catch (err) {
      addToast('Failed to pass player.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GavelIcon className="w-5 h-5 text-blue-600" />
            <span>Auction Rooms & Live Bidding Desk</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Conduct live player auctions, manage the hammer block, and declare bids
          </p>
        </div>
        <Link to="/create">
          <Button size="sm" variant="dark" className="font-bold whitespace-nowrap">
            + Setup New Auction Room
          </Button>
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
          <TrophyIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No Auction Rooms Created</h3>
          <p className="text-xs text-slate-500 mb-5">
            Launch an auction room to begin drafting players with real-time chip bidding.
          </p>
          <Link to="/create">
            <Button size="md" variant="dark" className="font-bold">
              Create First Auction
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {auctions.map((auc) => {
            const isLive = auc.status === 'live';
            const isPaused = auc.status === 'paused';
            const currentPlayer = auc.currentPlayer;
            const holdingTeam = auc.highestBidderTeamName;
            const holdingBid = Number(auc.currentBid || 0);

            return (
              <div
                key={auc.id}
                className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition"
              >
                {/* Room Top Bar */}
                <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-white/10 text-blue-400 flex items-center justify-center font-bold">
                      <TrophyIcon className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-lg font-black tracking-tight text-white">{auc.title}</h3>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase">
                          {auc.sport || 'Badminton'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Min Increment: <strong>{fmtChips(auc.minIncrement || 500)}</strong> • Starting Franchise Purse: <strong>{fmtChips(auc.defaultChips || 100000)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Room Status Pill & Primary CTAs */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 ${
                        isLive
                          ? 'bg-red-600 text-white shadow animate-pulse'
                          : isPaused
                          ? 'bg-amber-500 text-white shadow'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isLive && <LivePulse />}
                      {isPaused && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                      <span>{isLive ? 'LIVE BIDDING' : isPaused ? 'BIDDING PAUSED' : auc.status?.toUpperCase() || 'UPCOMING'}</span>
                    </span>

                    <Button
                      size="sm"
                      onClick={() => handleToggleStatus(auc)}
                      className={`text-xs font-bold py-1.5 px-3.5 shadow whitespace-nowrap ${
                        isLive
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : isPaused
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {isLive ? 'Pause Bidding' : isPaused ? 'Resume Live Bidding' : 'Start Live Bidding'}
                    </Button>

                    <Link to={`/auction/${auc.id}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3.5 shadow whitespace-nowrap">
                        Enter Live Room
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Live Hammer Desk Area */}
                <div className="p-6 bg-slate-50/70 border-b border-slate-200">
                  {/* Paused Warning Banner */}
                  {isPaused && (
                    <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
                        <span>AUCTION IS CURRENTLY PAUSED BY ADMIN — Live bidding is suspended on all bidder screens.</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleToggleStatus(auc)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-1 px-3 self-start sm:self-auto"
                      >
                        Resume Live Bidding
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <GavelIcon className="w-4 h-4 text-blue-600" />
                      <span>Live Hammer Spotlight</span>
                    </span>

                    <span className="text-xs text-slate-500 font-semibold">
                      Total Bids In Round: <strong className="text-slate-900">{auc.bidCount || 0}</strong>
                    </span>
                  </div>

                  {currentPlayer ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
                      {/* Player Details */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-xl">
                          {currentPlayer.photoUrl ? (
                            <img src={currentPlayer.photoUrl} alt={currentPlayer.name} className="w-full h-full object-cover" />
                          ) : (
                            currentPlayer.name?.slice(0, 1) || 'B'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-slate-900 leading-tight">{currentPlayer.name}</h4>
                            {currentPlayer.level && (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                                {currentPlayer.level}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Base Price: <strong className="text-slate-800">{fmtChips(currentPlayer.basePrice)}</strong>
                            {currentPlayer.gender && ` • ${currentPlayer.gender}`}
                          </p>
                        </div>
                      </div>

                      {/* Current Highest Bid Display */}
                      <div className="bg-slate-50 rounded-2xl p-3 sm:px-5 border border-slate-200/80 text-center sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Highest Bid
                        </span>
                        <p className="text-2xl font-black text-blue-700 leading-tight mt-0.5">
                          {fmtChips(holdingBid)}
                        </p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                          {holdingTeam ? `Held by: ${holdingTeam}` : 'No bids yet (Base Price)'}
                        </p>
                      </div>

                      {/* Auctioneer Instant Controls */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleHammerSold(auc)}
                          disabled={loadingAction || !auc.highestBidderTeamId}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-4 shadow-sm whitespace-nowrap"
                        >
                          SOLD to {holdingTeam || 'Bidder'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHammerPass(auc)}
                          disabled={loadingAction}
                          className="text-xs font-bold py-2.5 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          Pass Unsold
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAuctionForHammer(auc)}
                          className="text-xs font-bold py-2.5 text-blue-700 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                        >
                          Switch Shuttler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                      <p className="text-sm font-bold text-slate-800 mb-1">
                        Hammer is open. No shuttler is currently on the bidding block.
                      </p>
                      <p className="text-xs text-slate-500 mb-4">
                        Select a player from the badminton pool to bring them up for live bidding.
                      </p>
                      <Button
                        size="sm"
                        variant="dark"
                        onClick={() => setSelectedAuctionForHammer(auc)}
                        className="font-bold text-xs"
                      >
                        + Select Shuttler For Hammer
                      </Button>
                    </div>
                  )}
                </div>

                {/* Room Admin Footer Controls */}
                <div className="px-6 py-3.5 bg-white flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>
                      Drafted Players: <strong className="text-slate-800">{auc.soldPlayerIds?.length || 0}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Passed Unsold: <strong className="text-slate-800">{auc.unsoldPlayerIds?.length || 0}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(auc)}
                      className="font-bold text-slate-700 hover:text-blue-600 transition"
                    >
                      {isLive ? 'Pause Bidding' : isPaused ? 'Resume Live Bidding' : 'Start Live Bidding'}
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAuction(auc.id, auc.title)}
                      className="font-bold text-rose-600 hover:text-rose-800 transition"
                    >
                      Delete Room
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Bring Shuttler to Hammer */}
      {selectedAuctionForHammer && (
        <HammerPickerModal
          auction={selectedAuctionForHammer}
          players={players}
          onClose={() => setSelectedAuctionForHammer(null)}
          onSelectPlayer={async (player) => {
            try {
              await bringPlayerToHammer(selectedAuctionForHammer.id, player);
              addToast(`${player.name} is now on the auction hammer!`, 'success');
              setSelectedAuctionForHammer(null);
            } catch (err) {
              addToast('Failed to bring player to hammer.', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   TAB 2: PLAYERS POOL MANAGEMENT (CLEAN ALIGNED TABLE)
========================================================================= */
function PlayersTab({ players }) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingPlayer, setEditingPlayer] = useState(null);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete shuttler "${name}"?`)) return;
    try {
      await deletePlayer(id);
      addToast('Shuttler deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete player.', 'error');
    }
  };

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesLevel = p.level?.toLowerCase().includes(q);
        const matchesRole = p.role?.toLowerCase().includes(q);
        const matchesTeam = p.soldToTeamName?.toLowerCase().includes(q);
        if (!matchesName && !matchesLevel && !matchesRole && !matchesTeam) return false;
      }
      return true;
    });
  }, [players, statusFilter, search]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Registered Shuttlers Pool ({players.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View, adjust base prices, manage auction availability, or delete athletes
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full md:w-64">
            <Input
              placeholder="Search by name, team, level..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[42px] px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available</option>
            <option value="in_auction">In Auction</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>
      </div>

      {/* Rigid Aligned Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-1/4">Shuttler</th>
              <th className="py-3.5 px-4 w-1/6">Level & Gender</th>
              <th className="py-3.5 px-4 w-1/6">Base Price</th>
              <th className="py-3.5 px-4 w-1/6">Status</th>
              <th className="py-3.5 px-4 w-1/6">Franchise</th>
              <th className="py-3.5 px-4 text-right w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400 font-medium italic">
                  No shuttlers match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const photoSrc = p.photoUrl || p.photoData || p.photo;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Shuttler Name & Avatar */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar photoData={photoSrc} name={p.name} size="sm" />
                        <span className="truncate max-w-[180px]">{p.name}</span>
                      </div>
                    </td>

                    {/* Level & Gender */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 block">{p.level || p.tier || 'Player'}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{p.gender || 'Badminton'}</span>
                    </td>

                    {/* Base Price */}
                    <td className="py-3 px-4 font-black text-blue-700">
                      {fmtChips(p.basePrice)}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          p.status === 'sold'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'in_auction'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : p.status === 'unsold'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {p.status || 'Available'}
                      </span>
                    </td>

                    {/* Winning Team */}
                    <td className="py-3 px-4 text-slate-700 font-semibold truncate max-w-[140px]">
                      {p.soldToTeamName ? (
                        <div>
                          <span className="font-bold text-slate-900 block truncate">{p.soldToTeamName}</span>
                          <span className="text-[10px] text-emerald-700 font-black">{fmtChips(p.soldPrice)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPlayer(p)}
                          className="text-[11px] font-bold py-1 px-2.5 text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-[11px] font-bold py-1 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSave={async (updatedData) => {
            try {
              await updatePlayer(editingPlayer.id, updatedData);
              addToast('Player details updated.', 'success');
              setEditingPlayer(null);
            } catch (err) {
              addToast('Failed to update player.', 'error');
            }
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
   TAB 3: FRANCHISES & CHIP PURSES (ALIGNED LEDGER)
========================================================================= */
function TeamsTab({ teams }) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [adjustingTeam, setAdjustingTeam] = useState(null);
  const [viewingSquadTeam, setViewingSquadTeam] = useState(null);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete franchise "${name}"? This removes the team and owner account access.`)) return;
    try {
      await deleteTeam(id);
      addToast('Franchise removed.', 'info');
    } catch (err) {
      addToast('Failed to delete team.', 'error');
    }
  };

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.teamName?.toLowerCase().includes(q) ||
        t.teamShortCode?.toLowerCase().includes(q) ||
        t.ownerName?.toLowerCase().includes(q) ||
        t.ownerEmail?.toLowerCase().includes(q)
      );
    });
  }, [teams, search]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Team Franchises & Chip Purses ({teams.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor bidder chip budgets, adjust spending limits, and review rosters
          </p>
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search franchise or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-1/4">Franchise</th>
              <th className="py-3.5 px-4 w-1/4">Owner Details</th>
              <th className="py-3.5 px-4 w-1/6">Remaining Chips</th>
              <th className="py-3.5 px-4 w-1/6">Spent Chips</th>
              <th className="py-3.5 px-4 w-1/6">Squad Size</th>
              <th className="py-3.5 px-4 text-right w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400 font-medium italic">
                  No franchises found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const remaining = Number(t.remainingChips || 0);
                const spent = Number(t.spentChips || 0);
                const squadCount = t.squad?.length || 0;
                const limit = t.squadLimit || 12;

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-blue-400 font-black flex items-center justify-center shrink-0 overflow-hidden text-xs">
                          {t.teamLogo ? (
                            <img src={t.teamLogo} alt={t.teamName} className="w-full h-full object-cover" />
                          ) : (
                            t.teamShortCode || t.teamName?.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block truncate max-w-[160px]">{t.teamName}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{t.teamShortCode || 'FRANCHISE'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block truncate max-w-[160px]">{t.ownerName}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">{t.ownerEmail}</span>
                    </td>

                    <td className="py-3 px-4 font-black text-emerald-800 text-sm">
                      {fmtChips(remaining)}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-700">
                      {fmtChips(spent)}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setViewingSquadTeam(t)}
                        className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <span>{squadCount} / {limit} Shuttlers</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustingTeam(t)}
                          className="text-[11px] font-bold py-1 px-2.5 text-slate-700 hover:bg-slate-100"
                        >
                          Adjust Purse
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(t.id, t.teamName)}
                          className="text-[11px] font-bold py-1 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Purse Adjustment Modal */}
      {adjustingTeam && (
        <AdjustPurseModal
          team={adjustingTeam}
          onClose={() => setAdjustingTeam(null)}
          onSave={async (newAmount) => {
            try {
              await setTeamChips(adjustingTeam.id, newAmount);
              addToast(`Purse for ${adjustingTeam.teamName} set to ${fmtChips(newAmount)}.`, 'success');
              setAdjustingTeam(null);
            } catch (err) {
              addToast('Failed to adjust purse.', 'error');
            }
          }}
        />
      )}

      {/* Squad Roster Modal */}
      {viewingSquadTeam && (
        <SquadRosterModal
          team={viewingSquadTeam}
          onClose={() => setViewingSquadTeam(null)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   TAB 4: USER ROLES & ACCESS CONTROL
========================================================================= */
function UsersTab({ users }) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const handleRoleChange = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      addToast(`User role updated to ${newRole.toUpperCase()}.`, 'success');
    } catch (err) {
      addToast('Failed to update role.', 'error');
    }
  };

  const handleToggleDisabled = async (uid, currentVal) => {
    try {
      await updateDoc(doc(db, 'users', uid), { disabled: !currentVal });
      addToast(currentVal ? 'User unblocked.' : 'User account suspended.', 'info');
    } catch (err) {
      addToast('Failed to update user status.', 'error');
    }
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            User Accounts & Roles ({users.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign user roles (Admin, Bidder, Athlete) and control access permissions
          </p>
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search user name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-1/3">User Profile</th>
              <th className="py-3.5 px-4 w-1/4">Email Address</th>
              <th className="py-3.5 px-4 w-1/5">Assigned Role</th>
              <th className="py-3.5 px-4 w-1/6">Status</th>
              <th className="py-3.5 px-4 text-right w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400 font-medium italic">
                  No user accounts match the search.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isBlocked = !!u.disabled;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar photoData={u.photoData} name={u.displayName || u.email} size="sm" />
                        <span className="truncate max-w-[200px]">{u.displayName || 'Registered User'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium truncate max-w-[200px]">
                      {u.email}
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={u.role || 'player'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="player">Athlete (Player)</option>
                        <option value="bidder">Team Owner (Bidder)</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isBlocked
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleDisabled(u.id, isBlocked)}
                        className={`text-[11px] font-bold py-1 px-3 ${
                          isBlocked
                            ? 'text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            : 'text-rose-600 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        {isBlocked ? 'Unblock' : 'Suspend'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   MODALS FOR PRECISE, NON-WARPING ADMIN WORKFLOWS
========================================================================= */

function HammerPickerModal({ auction, players, onClose, onSelectPlayer }) {
  const [query, setQuery] = useState('');
  const availablePlayers = players.filter((p) => p.status === 'available' || !p.status);

  const filtered = availablePlayers.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.level?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Select Shuttler for Hammer</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose an available player to place under active bidding for {auction.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <Input
            placeholder="Search available shuttlers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">
              No available shuttlers found in the pool.
            </p>
          ) : (
            filtered.map((p) => {
              const photo = p.photoUrl || p.photoData || p.photo;
              return (
                <div
                  key={p.id}
                  className="p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-3">
                    <Avatar photoData={photo} name={p.name} size="md" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{p.name}</h4>
                      <p className="text-xs text-slate-500">
                        {p.level || 'Badminton'} {p.gender ? `• ${p.gender}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-blue-700">{fmtChips(p.basePrice)}</span>
                    <Button
                      size="sm"
                      variant="dark"
                      onClick={() => onSelectPlayer(p)}
                      className="font-bold text-xs py-1.5"
                    >
                      Put on Hammer
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AdjustPurseModal({ team, onClose, onSave }) {
  const [chips, setChips] = useState(String(team.remainingChips || 100000));

  const handleQuickAdd = (addAmount) => {
    const current = Number(chips) || 0;
    setChips(String(current + addAmount));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(chips);
    if (isNaN(num) || num < 0) return;
    onSave(num);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Adjust Chip Purse</h3>
            <p className="text-xs text-slate-500 mt-0.5">{team.teamName} ({team.ownerName})</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Remaining Chip Purse"
            type="number"
            value={chips}
            onChange={(e) => setChips(e.target.value)}
            helper="Current chips available to spend in live bidding"
            required
          />

          {/* Quick Increment Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Increment Options
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickAdd(25000)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                +25k
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(50000)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                +50k
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(100000)}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                +100k
              </button>
              <button
                type="button"
                onClick={() => setChips('100000')}
                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition"
              >
                Reset 100k
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="dark" size="sm" className="font-bold px-6">
              Save Purse
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPlayerModal({ player, onClose, onSave }) {
  const [basePrice, setBasePrice] = useState(String(player.basePrice || 5000));
  const [status, setStatus] = useState(player.status || 'available');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(basePrice);
    if (isNaN(num) || num < 0) return;
    onSave({
      basePrice: num,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Edit Shuttler Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">{player.name} ({player.level || 'Badminton'})</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Auction Base Price (Chips)"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pool Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="available">Available in Pool</option>
              <option value="in_auction">In Auction (Hammer)</option>
              <option value="sold">Sold to Franchise</option>
              <option value="unsold">Unsold</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="dark" size="sm" className="font-bold px-6">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SquadRosterModal({ team, onClose }) {
  const squad = team.squad || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">{team.teamName} Roster</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Owner: {team.ownerName} • {squad.length} / {team.squadLimit || 12} Shuttlers
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {squad.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">
              No players drafted into squad yet.
            </p>
          ) : (
            squad.map((p, idx) => (
              <div
                key={p.playerId || idx}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar photoData={p.photoUrl} name={p.name} size="sm" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{p.name}</h4>
                    <p className="text-xs text-slate-500">{p.role || 'Badminton Player'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Acquisition Price</span>
                  <span className="text-xs font-black text-emerald-800">{fmtChips(p.price)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 text-right">
          <Button onClick={onClose} size="sm" variant="outline">
            Close Roster
          </Button>
        </div>
      </div>
    </div>
  );
}
