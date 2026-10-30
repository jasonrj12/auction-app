import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAuctions from '../hooks/useAuctions';
import { subscribeAllPlayers } from '../services/players';
import { subscribeAllTeams } from '../services/teams';
import { fmtChips } from '../lib/format';
import Button from '../components/Button';
import Chip from '../components/Chip';

const SPORT_ICONS = {
  Cricket: '🏏',
  Football: '⚽',
  Basketball: '🏀',
  Kabaddi: '🤼',
  Badminton: '🏸',
  Tennis: '🎾',
  Volleyball: '🏐',
};

export default function Home() {
  const { auctions, loading: auctionsLoading } = useAuctions();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const unsubP = subscribeAllPlayers(setPlayers);
    const unsubT = subscribeAllTeams(setTeams);
    return () => {
      unsubP();
      unsubT();
    };
  }, []);

  const metrics = useMemo(() => {
    const totalAthletes = players.length;
    const soldAthletes = players.filter((p) => p.status === 'sold').length;
    const totalTeams = teams.length;
    const totalChipsCirculating = teams.reduce((acc, t) => acc + (t.totalChips || 0), 0);
    return { totalAthletes, soldAthletes, totalTeams, totalChipsCirculating };
  }, [players, teams]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-amber-300 mb-6 shadow-sm">
            <span>🏆</span>
            <span>The Official Sports Player Auction Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Build Your Championship Squad with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400">Live Chip Bidding</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed">
            Register as a sports player or team owner. Admins host real-time tournaments where franchise owners spend chips to acquire world-class athletes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link to="/players">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/20 px-7">
                Explore Players Pool
              </Button>
            </Link>
            <Link to="/teams">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold px-7">
                View Team Owners
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7">
                Register Now
              </Button>
            </Link>
          </div>

          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-14 pt-8 border-t border-white/10 text-center">
            <div>
              <p className="text-3xl font-black text-amber-400">{metrics.totalAthletes}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Registered Athletes</p>
            </div>
            <div>
              <p className="text-3xl font-black text-indigo-400">{metrics.totalTeams}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Franchise Teams</p>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-400">{metrics.soldAthletes}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Players Acquired</p>
            </div>
            <div>
              <p className="text-3xl font-black text-rose-400">{fmtChips(metrics.totalChipsCirculating)}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Chips in Circulation</p>
            </div>
          </div>

        </div>
      </section>

      {/* ACTIVE SPORTS AUCTIONS SECTION */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Live Sports Auctions
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter real-time bidding rooms and watch players go under the hammer
            </p>
          </div>
          <Link to="/players" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
            View All Players →
          </Link>
        </div>

        {auctionsLoading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading live sports auctions...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-md mx-auto shadow-sm">
            <span className="text-4xl block mb-2">🏏</span>
            <h3 className="text-base font-bold text-slate-900 mb-1">No live auctions right now</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tournaments will appear here when an admin launches a player auction room.
            </p>
            <Link to="/register">
              <Button size="sm">Register to Join Next Auction</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auc) => {
              const icon = SPORT_ICONS[auc.sport] || '🏆';
              return (
                <div
                  key={auc.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl">
                          {icon}
                        </span>
                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-tight">
                            {auc.title}
                          </h3>
                          <span className="text-[11px] text-slate-500 font-semibold">{auc.sport}</span>
                        </div>
                      </div>
                      <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase animate-pulse">
                        LIVE
                      </span>
                    </div>

                    {auc.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-4">
                        {auc.description}
                      </p>
                    )}

                    {/* Spotlight Snapshot */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {auc.currentPlayer ? (
                        <div>
                          <span className="text-[10px] font-bold text-amber-700 uppercase block">
                            Now on Hammer:
                          </span>
                          <p className="text-sm font-black text-slate-900">{auc.currentPlayer.name}</p>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-slate-500">Current Bid:</span>
                            <span className="font-black text-indigo-700">🪙 {fmtChips(auc.currentBid)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-1">
                          Table is ready for next player round
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Link to={`/auction/${auc.id}`}>
                      <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">
                        Enter Live Auction Room ⚡
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FEATURED PLAYERS PREVIEW */}
      <section className="py-12 bg-white border-t border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏃</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Featured Athletes
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Top-tier talent available across global sporting disciplines
              </p>
            </div>
            <Link to="/players">
              <Button size="sm" variant="outline" className="font-bold">
                View All {players.length} Players →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {players.slice(0, 4).map((p) => {
              const icon = SPORT_ICONS[p.sport] || '🏅';
              return (
                <div key={p.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="relative h-40 bg-slate-900">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">{icon}</div>
                    )}
                    <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded">
                      {p.sport}
                    </span>
                    {p.status === 'sold' && (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">
                        SOLD
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{p.role}</p>
                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Base Price</span>
                      <span className="font-black text-indigo-700">{fmtChips(p.basePrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TEAM OWNERS PREVIEW */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👑</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Franchise Owners & Bidders
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Participating franchises competing with dedicated chip budgets
            </p>
          </div>
          <Link to="/teams">
            <Button size="sm" variant="outline" className="font-bold">
              View All {teams.length} Teams →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teams.slice(0, 3).map((t) => (
            <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                {t.teamLogo ? (
                  <img src={t.teamLogo} alt={t.teamName} className="w-full h-full object-cover" />
                ) : (
                  t.teamShortCode || t.teamName?.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-900 truncate">{t.teamName}</h4>
                <p className="text-[11px] text-slate-500 truncate">Owner: {t.ownerName}</p>
                <p className="text-xs font-black text-emerald-700 mt-1">
                  🪙 {fmtChips(t.remainingChips)} <span className="font-normal text-[10px] text-slate-400">left</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
