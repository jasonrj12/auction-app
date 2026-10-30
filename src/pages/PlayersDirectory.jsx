import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeAllPlayers } from '../services/players';
import { fmtChips } from '../lib/format';
import { PlayerIcon, CheckIcon, CloseIcon } from '../components/Icons';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';

const PLAYER_LEVELS = [
  'All',
  'Beginner',
  'Intermediate',
  'Advanced',
  'Professional',
];

const GENDER_FILTERS = [
  'All',
  'Male',
  'Female',
];

export default function PlayersDirectory() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('basePrice-desc');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin?tab=players', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const unsub = subscribeAllPlayers((list) => {
      setPlayers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        // Level filter
        if (levelFilter !== 'All') {
          const pLevel = (p.level || p.tier || '').toLowerCase();
          if (!pLevel.includes(levelFilter.toLowerCase())) return false;
        }

        // Gender filter
        if (genderFilter !== 'All') {
          const pGender = (p.gender || p.role || '').toLowerCase();
          if (!pGender.includes(genderFilter.toLowerCase())) return false;
        }

        // Status filter
        if (statusFilter !== 'All' && p.status !== statusFilter) return false;

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = p.name?.toLowerCase().includes(q);
          const matchesLevel = p.level?.toLowerCase().includes(q);
          const matchesGender = p.gender?.toLowerCase().includes(q);
          const matchesRole = p.role?.toLowerCase().includes(q);
          const matchesTeam = p.soldToTeamName?.toLowerCase().includes(q);
          if (!matchesName && !matchesLevel && !matchesGender && !matchesRole && !matchesTeam) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'basePrice-desc') return (b.basePrice || 0) - (a.basePrice || 0);
        if (sortBy === 'basePrice-asc') return (a.basePrice || 0) - (b.basePrice || 0);
        if (sortBy === 'soldPrice-desc') return (b.soldPrice || 0) - (a.soldPrice || 0);
        if (sortBy === 'matches-desc') return (b.stats?.matches || b.matches || 0) - (a.stats?.matches || a.matches || 0);
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [players, levelFilter, genderFilter, statusFilter, search, sortBy]);

  const metrics = useMemo(() => {
    const total = players.length;
    const sold = players.filter((p) => p.status === 'sold').length;
    const available = players.filter((p) => p.status === 'available' || !p.status).length;
    const totalSpent = players.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
    return { total, sold, available, totalSpent };
  }, [players]);

  if (!authLoading && user && isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-sm">
                <PlayerIcon className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Badminton Players Pool
              </h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Registered badminton shuttlers available for franchise auction draft
            </p>
          </div>
        </div>

        {/* Real-time Metrics Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Shuttlers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Available in Pool</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{metrics.available}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Shuttlers Drafted</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.sold}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chips Spent On Talent</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtChips(metrics.totalSpent)}</p>
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search shuttlers by name, level, gender, team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <Select
                value={statusFilter}
                onChange={(v) => setStatusFilter(v || 'All')}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'available', label: 'Available in Pool' },
                  { value: 'in_auction', label: 'In Auction (Hammer)' },
                  { value: 'sold', label: 'Sold to Franchise' },
                  { value: 'unsold', label: 'Unsold' },
                ]}
                placeholder={null}
              />
            </div>

            <div>
              <Select
                value={sortBy}
                onChange={(v) => setSortBy(v || 'basePrice-desc')}
                options={[
                  { value: 'basePrice-desc', label: 'Base Price: High to Low' },
                  { value: 'basePrice-asc', label: 'Base Price: Low to High' },
                  { value: 'soldPrice-desc', label: 'Highest Sold Price' },
                  { value: 'matches-desc', label: 'Most Matches Played' },
                  { value: 'name-asc', label: 'Name: A to Z' },
                ]}
                placeholder={null}
              />
            </div>
          </div>

          {/* Quick Filter Pills: Playing Level & Gender */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            {/* Level Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">Level:</span>
              {PLAYER_LEVELS.map((lvl) => {
                const isSelected = levelFilter === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl === 'All' ? 'All Levels' : lvl}
                  </button>
                );
              })}
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">Gender:</span>
              {GENDER_FILTERS.map((g) => {
                const isSelected = genderFilter === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGenderFilter(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {g === 'All' ? 'All Genders' : g}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shuttlers Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading shuttlers pool...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <PlayerIcon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Shuttlers Found</h3>
            <p className="text-sm text-slate-500">
              No registered badminton players match the selected level, gender, or search criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onSelect={() => setSelectedPlayer(player)}
              />
            ))}
          </div>
        )}

        {/* Detailed Player Modal */}
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
  const [imgError, setImgError] = useState(false);

  const isSold = player.status === 'sold';
  const isInAuction = player.status === 'in_auction';
  const isUnsold = player.status === 'unsold';

  const photoSrc = player.photoUrl || player.photoData || player.photo || null;

  const matches = Number(player.stats?.matches ?? player.matches ?? 0);
  const wins = Number(player.stats?.runsOrGoals ?? player.runsOrGoals ?? 0);
  const losses = Number(player.stats?.wicketsOrAssists ?? player.wicketsOrAssists ?? 0);

  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : null;

  // Level badge styling
  const levelText = player.level || player.tier || 'Player';
  const levelLower = levelText.toLowerCase();
  let levelBadgeStyle = 'bg-slate-800 text-slate-100';
  if (levelLower.includes('pro')) {
    levelBadgeStyle = 'bg-amber-400 text-slate-950 font-black shadow-sm';
  } else if (levelLower.includes('advance')) {
    levelBadgeStyle = 'bg-blue-600 text-white font-black shadow-sm';
  } else if (levelLower.includes('inter')) {
    levelBadgeStyle = 'bg-emerald-600 text-white font-black shadow-sm';
  } else if (levelLower.includes('begin')) {
    levelBadgeStyle = 'bg-slate-700 text-white font-bold';
  }

  return (
    <div
      onClick={onSelect}
      className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Photo Container */}
        <div className="relative h-60 bg-slate-950 overflow-hidden">
          {photoSrc && !imgError ? (
            <img
              src={photoSrc}
              alt={player.name}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-500 p-6 text-center">
              <span className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center font-black text-2xl mb-2 border border-slate-700 shadow-sm">
                {player.name ? player.name[0].toUpperCase() : 'B'}
              </span>
              <span className="text-xs font-semibold text-slate-400 tracking-wide">Badminton Shuttler</span>
            </div>
          )}

          {/* Gentle gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent pointer-events-none" />

          {/* Top Left Badges: Level & Gender */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
            <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${levelBadgeStyle}`}>
              {levelText}
            </span>
            {player.gender && (
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full border border-white/10 uppercase tracking-wide">
                {player.gender}
              </span>
            )}
          </div>

          {/* Top Right: Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            {isSold ? (
              <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                <span>SOLD</span>
              </span>
            ) : isInAuction ? (
              <span className="bg-blue-600 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                LIVE
              </span>
            ) : isUnsold ? (
              <span className="bg-slate-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                UNSOLD
              </span>
            ) : (
              <span className="bg-white/95 text-slate-900 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                AVAILABLE
              </span>
            )}
          </div>

          {/* Bottom Photo Overlay: Player Identity */}
          <div className="absolute bottom-0 inset-x-0 p-4 z-10">
            <h3 className="text-lg font-black text-white leading-tight truncate drop-shadow-sm">
              {player.name}
            </h3>
            <p className="text-slate-300 text-xs font-medium mt-0.5 truncate">
              {player.gender ? `${player.gender} Shuttler` : 'Badminton Shuttler'}
              {player.level ? ` • ${player.level}` : ''}
            </p>
          </div>
        </div>

        {/* Match Statistics Mini Strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70 text-center">
          <div className="py-2.5 px-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Matches</span>
            <span className="block text-sm font-black text-slate-900 mt-0.5">{matches || '-'}</span>
          </div>
          <div className="py-2.5 px-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Wins</span>
            <span className="block text-sm font-black text-slate-900 mt-0.5">{wins || '-'}</span>
          </div>
          <div className="py-2.5 px-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {winRate !== null ? 'Win Rate' : 'Losses'}
            </span>
            <span className="block text-sm font-black text-blue-700 mt-0.5">
              {winRate !== null ? `${winRate}%` : losses || '-'}
            </span>
          </div>
        </div>

        {/* Pricing / Sold Details Box */}
        <div className="p-4">
          {isSold ? (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">
                  Drafted By
                </span>
                <span className="text-xs font-black text-emerald-950 truncate block mt-0.5">
                  {player.soldToTeamName || 'Franchise'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Sold Price</span>
                <span className="text-sm font-black text-emerald-800">{fmtChips(player.soldPrice)}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                  Base Price
                </span>
                <span className="text-base font-black text-blue-700">{fmtChips(player.basePrice)}</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200/70">
                Badminton
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Button */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full font-bold border-slate-200 hover:bg-slate-900 hover:text-white transition-colors"
        >
          View Shuttler Profile
        </Button>
      </div>
    </div>
  );
}

function PlayerDetailsModal({ player, onClose }) {
  const [modalImgError, setModalImgError] = useState(false);
  const photoSrc = player.photoUrl || player.photoData || player.photo || null;

  const matches = Number(player.stats?.matches ?? player.matches ?? 0);
  const wins = Number(player.stats?.runsOrGoals ?? player.runsOrGoals ?? 0);
  const losses = Number(player.stats?.wicketsOrAssists ?? player.wicketsOrAssists ?? 0);
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl">
        {/* Modal Banner Photo */}
        <div className="relative h-64 bg-slate-950">
          {photoSrc && !modalImgError ? (
            <img
              src={photoSrc}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={() => setModalImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
              <span className="w-20 h-20 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center font-black text-3xl mb-2">
                {player.name ? player.name[0].toUpperCase() : 'B'}
              </span>
              <span className="text-xs font-semibold text-slate-400">Badminton Shuttler</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition"
            aria-label="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-6 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] bg-blue-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                Badminton
              </span>
              {player.level && (
                <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {player.level}
                </span>
              )}
              {player.gender && (
                <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  {player.gender}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">{player.name}</h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Status & Financial Banner */}
          {player.status === 'sold' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Drafted by Franchise</p>
                <p className="text-lg font-black text-emerald-950 mt-0.5">{player.soldToTeamName}</p>
                {player.soldToOwnerName && (
                  <p className="text-xs text-emerald-700 mt-0.5">Owner: {player.soldToOwnerName}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block tracking-wider">Winning Bid</span>
                <p className="text-xl font-black text-emerald-800">{fmtChips(player.soldPrice)}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Auction Status</span>
                <p className="text-base font-black text-slate-900 capitalize mt-0.5">
                  {player.status === 'in_auction' ? 'Currently on Hammer' : 'Available in Pool'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Base Price</span>
                <p className="text-xl font-black text-blue-700">{fmtChips(player.basePrice)}</p>
              </div>
            </div>
          )}

          {/* Career Record Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Player Record & Performance
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Matches</span>
                <span className="text-base font-black text-slate-900 mt-0.5">{matches || '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Wins</span>
                <span className="text-base font-black text-slate-900 mt-0.5">{wins || '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Losses</span>
                <span className="text-base font-black text-slate-900 mt-0.5">{losses || '-'}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Win Rate</span>
                <span className="text-base font-black text-blue-700 mt-0.5">{winRate !== null ? `${winRate}%` : '-'}</span>
              </div>
            </div>
          </div>

          {/* Playing Notes / Bio */}
          {player.bio && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Athlete Background & Playing Notes
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {player.bio}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button onClick={onClose} size="lg" variant="dark" className="w-full font-bold">
              Close Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
