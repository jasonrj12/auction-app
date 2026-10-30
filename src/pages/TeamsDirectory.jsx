import { useState, useEffect, useMemo } from 'react';
import { subscribeAllTeams } from '../services/teams';
import { fmtChips } from '../lib/format';
import { OwnerIcon, ShieldIcon, CloseIcon } from '../components/Icons';
import Button from '../components/Button';
import Input from '../components/Input';

export default function TeamsDirectory() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('remainingChips-desc');
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const unsub = subscribeAllTeams((list) => {
      setTeams(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTeams = useMemo(() => {
    return teams
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const matchesTeam = t.teamName?.toLowerCase().includes(q);
        const matchesOwner = t.ownerName?.toLowerCase().includes(q);
        const matchesCode = t.teamShortCode?.toLowerCase().includes(q);
        return matchesTeam || matchesOwner || matchesCode;
      })
      .sort((a, b) => {
        if (sortBy === 'remainingChips-desc') return (b.remainingChips || 0) - (a.remainingChips || 0);
        if (sortBy === 'remainingChips-asc') return (a.remainingChips || 0) - (b.remainingChips || 0);
        if (sortBy === 'spentChips-desc') return (b.spentChips || 0) - (a.spentChips || 0);
        if (sortBy === 'squad-desc') return (b.squad?.length || 0) - (a.squad?.length || 0);
        return (a.teamName || '').localeCompare(b.teamName || '');
      });
  }, [teams, search, sortBy]);

  const metrics = useMemo(() => {
    const totalTeams = teams.length;
    const totalCirculation = teams.reduce((sum, t) => sum + (t.totalChips || 0), 0);
    const totalSpent = teams.reduce((sum, t) => sum + (t.spentChips || 0), 0);
    const totalPlayersBought = teams.reduce((sum, t) => sum + (t.squad?.length || 0), 0);
    return { totalTeams, totalCirculation, totalSpent, totalPlayersBought };
  }, [teams]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center">
                <OwnerIcon className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Team Owners & Franchises
              </h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Explore participating franchises, team owner details, chip purse budgets, and squads
            </p>
          </div>
        </div>

        {/* Metrics Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Teams</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalTeams}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Purse Budget</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{fmtChips(metrics.totalCirculation)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Chips Spent</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{fmtChips(metrics.totalSpent)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Players Acquired</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.totalPlayersBought}</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search by franchise name, short code, or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="remainingChips-desc">Highest Remaining Purse</option>
                <option value="remainingChips-asc">Lowest Remaining Purse</option>
                <option value="spentChips-desc">Most Chips Spent</option>
                <option value="squad-desc">Largest Squad Size</option>
                <option value="name-asc">Team Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Loading team owners...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto">
            <ShieldIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No team owners found</h3>
            <p className="text-sm text-slate-500">
              Register as a Team Owner to start bidding on sports players.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onViewSquad={() => setSelectedTeam(team)}
              />
            ))}
          </div>
        )}

        {/* Team Squad Roster Modal */}
        {selectedTeam && (
          <TeamRosterModal
            team={selectedTeam}
            onClose={() => setSelectedTeam(null)}
          />
        )}

      </div>
    </div>
  );
}

function TeamCard({ team, onViewSquad }) {
  const totalChips = Number(team.totalChips || 100000);
  const remainingChips = Number(team.remainingChips || 0);
  const spentChips = Number(team.spentChips || 0);
  const squad = team.squad || [];
  const squadLimit = Number(team.squadLimit || 15);

  const spentPercent = Math.min(100, Math.round((spentChips / totalChips) * 100));

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div className="p-6">
        {/* Team Crest & Name */}
        <div className="flex items-start gap-4 mb-5">
          {team.teamLogo ? (
            <img
              src={team.teamLogo}
              alt={team.teamName}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-blue-400 font-black text-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              {team.teamShortCode || team.teamName?.slice(0, 2).toUpperCase() || 'TM'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 truncate">
                {team.teamName}
              </h3>
              {team.teamShortCode && (
                <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  {team.teamShortCode}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5 truncate">
              <span>Owner:</span>
              <span className="text-slate-800 font-bold">{team.ownerName || 'Franchise Owner'}</span>
            </p>
            {team.ownerPhone && (
              <p className="text-[11px] text-slate-400 mt-0.5">{team.ownerPhone}</p>
            )}
          </div>
        </div>

        {/* Chip Purse Breakdown */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Remaining Purse</span>
            <span className="text-emerald-700 font-black text-sm">
              {fmtChips(remainingChips)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${spentPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
            <span>Spent: <strong>{fmtChips(spentChips)}</strong></span>
            <span>Total: <strong>{fmtChips(totalChips)}</strong></span>
          </div>
        </div>

        {/* Squad Status & Preview */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-400 uppercase text-[10px]">Squad Roster</span>
            <span className="text-slate-700">{squad.length} / {squadLimit} Players</span>
          </div>

          {squad.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
              No players acquired yet. Ready for live auctions.
            </p>
          ) : (
            <div className="flex items-center -space-x-2 overflow-hidden py-1">
              {squad.slice(0, 5).map((player, idx) => (
                <div
                  key={idx}
                  className="w-9 h-9 rounded-full border-2 border-white bg-slate-800 text-white flex items-center justify-center text-xs font-black overflow-hidden shadow-sm"
                  title={`${player.name} (${player.role})`}
                >
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    player.name?.slice(0, 1)
                  )}
                </div>
              ))}
              {squad.length > 5 && (
                <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 text-slate-800 flex items-center justify-center text-xs font-bold shadow-sm">
                  +{squad.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-6 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewSquad}
          className="w-full font-bold"
        >
          View Team Squad & Finances
        </Button>
      </div>
    </div>
  );
}

function TeamRosterModal({ team, onClose }) {
  const squad = team.squad || [];
  const totalChips = Number(team.totalChips || 100000);
  const remainingChips = Number(team.remainingChips || 0);
  const spentChips = Number(team.spentChips || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            {team.teamLogo ? (
              <img
                src={team.teamLogo}
                alt={team.teamName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-blue-400 font-black text-lg flex items-center justify-center">
                {team.teamShortCode || 'TM'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {team.teamName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Owner: <strong className="text-slate-800">{team.ownerName}</strong> • {squad.length} Players
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-300 transition"
            aria-label="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Financial Summary */}
        <div className="p-6 bg-white border-b border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Remaining Purse</span>
            <span className="text-base font-black text-emerald-800">{fmtChips(remainingChips)}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Spent Chips</span>
            <span className="text-base font-black text-slate-900">{fmtChips(spentChips)}</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Total Purse</span>
            <span className="text-base font-black text-blue-900">{fmtChips(totalChips)}</span>
          </div>
        </div>

        {/* Squad List */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Acquired Squad Roster ({squad.length})
          </h3>

          {squad.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <ShieldIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No players won in auction yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Participate in live auctions to bid on players using your chips.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {squad.map((player, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-sm overflow-hidden flex-shrink-0">
                      {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        player.name?.slice(0, 1)
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{player.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {player.sport} • {player.role}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Purchased For</span>
                    <span className="text-sm font-black text-slate-900">
                      {fmtChips(player.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-slate-100">
          <Button onClick={onClose} size="lg" variant="dark" className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
