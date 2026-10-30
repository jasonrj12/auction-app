import { useState, useEffect, useMemo } from 'react';
import { subscribeAllPlayers } from '../services/players';
import { fmtChips } from '../lib/format';
import { PlayerIcon, TrophyIcon, CheckIcon } from '../components/Icons';
import Avatar from '../components/Avatar';
import Chip from '../components/Chip';
import Button from '../components/Button';
import Input from '../components/Input';

export default function PlayersDirectory() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('basePrice-desc');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    const unsub = subscribeAllPlayers((list) => {
      setPlayers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const sportsList = useMemo(() => {
    const set = new Set(players.map((p) => p.sport).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (sportFilter !== 'All' && p.sport !== sportFilter) return false;
        if (statusFilter !== 'All' && p.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = p.name?.toLowerCase().includes(q);
          const matchesRole = p.role?.toLowerCase().includes(q);
          const matchesTeam = p.soldToTeamName?.toLowerCase().includes(q);
          if (!matchesName && !matchesRole && !matchesTeam) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'basePrice-desc') return (b.basePrice || 0) - (a.basePrice || 0);
        if (sortBy === 'basePrice-asc') return (a.basePrice || 0) - (b.basePrice || 0);
        if (sortBy === 'soldPrice-desc') return (b.soldPrice || 0) - (a.soldPrice || 0);
        if (sortBy === 'matches-desc') return (b.stats?.matches || 0) - (a.stats?.matches || 0);
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [players, sportFilter, statusFilter, search, sortBy]);

  const metrics = useMemo(() => {
    const total = players.length;
    const sold = players.filter((p) => p.status === 'sold').length;
    const available = players.filter((p) => p.status === 'available' || !p.status).length;
    const totalSpent = players.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    return { total, sold, available, totalSpent };
  }, [players]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center">
                <PlayerIcon className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Players Pool Directory
              </h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Explore all registered athletes across Cricket, Football, Basketball and more
            </p>
          </div>
        </div>

        {/* Metrics Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Players</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Available in Pool</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{metrics.available}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Players Sold</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.sold}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chips Spent On Players</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtChips(metrics.totalSpent)}</p>
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search players by name, role, or team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Statuses</option>
                <option value="available">Available in Pool</option>
                <option value="in_auction">In Auction</option>
                <option value="sold">Sold to Team</option>
                <option value="unsold">Unsold</option>
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="basePrice-desc">Base Price: High to Low</option>
                <option value="basePrice-asc">Base Price: Low to High</option>
                <option value="soldPrice-desc">Highest Sold Price</option>
                <option value="matches-desc">Most Matches Played</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Sport Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            <span className="text-xs font-bold text-slate-400 mr-1 uppercase">Sport:</span>
            {sportsList.map((sport) => {
              const isSelected = sportFilter === sport;
              return (
                <button
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sport}
                </button>
              );
            })}
          </div>
        </div>

        {/* Players Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading sports players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <PlayerIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No players found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search criteria or register a new sports player.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onSelect={() => setSelectedPlayer(player)}
              />
            ))}
          </div>
        )}

        {/* Player Profile Details Modal */}
        {selectedPlayer && (
          <PlayerDetailsModal
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}

      </div>
    </div>
  );
}

function PlayerCard({ player, onSelect }) {
  const isSold = player.status === 'sold';
  const isInAuction = player.status === 'in_auction';
  const isUnsold = player.status === 'unsold';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        {/* Card Header & Photo */}
        <div className="relative h-48 bg-slate-900 overflow-hidden">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top opacity-90 hover:scale-105 transition duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <PlayerIcon className="w-16 h-16" />
            </div>
          )}

          {/* Sport & Role Badge */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className="bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
              {player.sport}
            </span>
            <span className="bg-slate-800/90 backdrop-blur-md text-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-lg">
              {player.role}
            </span>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            {isSold ? (
              <span className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                <CheckIcon className="w-3 h-3" /> SOLD
              </span>
            ) : isInAuction ? (
              <span className="bg-blue-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm animate-pulse">
                IN AUCTION
              </span>
            ) : isUnsold ? (
              <span className="bg-slate-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg">
                UNSOLD
              </span>
            ) : (
              <span className="bg-white/95 backdrop-blur-md text-slate-800 font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm">
                Available
              </span>
            )}
          </div>

          {/* Player Name Overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-4">
            <h3 className="text-lg font-black text-white leading-tight">
              {player.name}
            </h3>
            {player.style && (
              <p className="text-slate-300 text-xs font-medium mt-0.5">{player.style}</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Matches</span>
            <span className="font-black text-slate-800">{player.stats?.matches ?? '-'}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Runs/Goals</span>
            <span className="font-black text-slate-800">{player.stats?.runsOrGoals ?? '-'}</span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Wkts/Assists</span>
            <span className="font-black text-slate-800">{player.stats?.wicketsOrAssists ?? '-'}</span>
          </div>
        </div>

        {/* Sold Information or Base Price */}
        <div className="p-4 space-y-2">
          {isSold ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-bold">Winning Team:</span>
                <span className="font-black text-emerald-950">{player.soldToTeamName || 'Team'}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-emerald-700">Sold Price:</span>
                <span className="font-black text-emerald-800 text-sm">{fmtChips(player.soldPrice)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Base Price</span>
                <span className="text-sm font-black text-blue-700">{fmtChips(player.basePrice)}</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {player.age ? `Age: ${player.age}` : 'Pro Athlete'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelect}
          className="w-full font-bold"
        >
          View Career Profile
        </Button>
      </div>
    </div>
  );
}

function PlayerDetailsModal({ player, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
        {/* Header Photo */}
        <div className="relative h-60 bg-slate-900">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <PlayerIcon className="w-20 h-20" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center font-bold hover:bg-black transition"
          >
            ✕
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-blue-600 px-2 py-0.5 rounded font-black uppercase">
                {player.sport}
              </span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                {player.role}
              </span>
            </div>
            <h2 className="text-2xl font-black">{player.name}</h2>
            <p className="text-xs text-slate-300 mt-0.5">{player.style}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {player.status === 'sold' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800">Acquired by Franchise</p>
                <p className="text-lg font-black text-emerald-950">{player.soldToTeamName}</p>
                {player.soldToOwnerName && (
                  <p className="text-xs text-emerald-700">Owner: {player.soldToOwnerName}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Winning Bid</span>
                <p className="text-lg font-black text-emerald-800">{fmtChips(player.soldPrice)}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Auction Status</span>
                <p className="text-sm font-black text-slate-900 capitalize">
                  {player.status || 'Available in Pool'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase">Base Price</span>
                <p className="text-lg font-black text-blue-700">{fmtChips(player.basePrice)}</p>
              </div>
            </div>
          )}

          {player.bio && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Athlete Biography
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {player.bio}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Career Statistics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Matches</span>
                <span className="text-base font-black text-slate-900">{player.stats?.matches ?? '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Runs / Goals</span>
                <span className="text-base font-black text-slate-900">{player.stats?.runsOrGoals ?? '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Wickets / Assists</span>
                <span className="text-base font-black text-slate-900">{player.stats?.wicketsOrAssists ?? '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">High Score</span>
                <span className="text-base font-black text-slate-900">{player.stats?.highestScore ?? '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Average</span>
                <span className="text-base font-black text-slate-900">{player.stats?.average ?? '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Strike Rate / Econ</span>
                <span className="text-base font-black text-slate-900">{player.stats?.strikeRate ?? '-'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={onClose} size="lg" variant="dark" className="w-full">
              Close Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
