import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuctions from '../hooks/useAuctions';
import { useAuth } from '../context/AuthContext';
import { subscribeAllPlayers } from '../services/players';
import { subscribeAllTeams } from '../services/teams';
import { fmtChips } from '../lib/format';
import { TrophyIcon, PlayerIcon, OwnerIcon, LivePulse } from '../components/Icons';
import Button from '../components/Button';
import Chip from '../components/Chip';

export default function Home() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { auctions, loading: auctionsLoading } = useAuctions();
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

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

  if (!authLoading && user && isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300 mb-6 shadow-sm">
            <TrophyIcon className="w-4 h-4 text-blue-400" />
            <span>Badminton Player Auction Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto text-white">
            Build Your Franchise Squad with <span className="text-blue-400">Live Chip Bidding</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed font-medium">
            Register as a badminton shuttler or franchise owner. Tournament administrators host real-time auctions where teams spend chip purses to draft players.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link to="/players">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 shadow-md">
                Explore Shuttlers Pool
              </Button>
            </Link>
            <Link to="/teams">
              <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 font-bold px-7">
                View Franchise Owners
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="font-bold px-7">
                Register
              </Button>
            </Link>
          </div>

          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-14 pt-8 border-t border-slate-800 text-center">
            <div>
              <p className="text-3xl font-black text-white">{metrics.totalAthletes}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Shuttlers in Pool</p>
            </div>
            <div>
              <p className="text-3xl font-black text-blue-400">{metrics.totalTeams}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Franchises</p>
            </div>
            <div>
              <p className="text-3xl font-black text-emerald-400">{metrics.soldAthletes}</p>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-1">Shuttlers Acquired</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-200">{fmtChips(metrics.totalChipsCirculating)}</p>
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
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Live Badminton Auctions
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter real-time bidding rooms and participate in active tournament rounds
            </p>
          </div>
          <Link to="/players" className="text-xs font-bold text-blue-600 hover:text-blue-800">
            View All Shuttlers →
          </Link>
        </div>

        {auctionsLoading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold">Loading live sports auctions...</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-md mx-auto shadow-sm">
            <TrophyIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 mb-1">No live auctions right now</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tournaments will appear here when an administrator launches a player auction room.
            </p>
            <Link to="/register">
              <Button size="sm" variant="dark">Register to Join Next Auction</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auc) => (
              <div
                key={auc.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-10 h-10 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center font-bold">
                        <TrophyIcon className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {auc.title}
                        </h3>
                        <span className="text-[11px] text-slate-500 font-semibold">{auc.sport}</span>
                      </div>
                    </div>
                    <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <LivePulse />
                      <span>LIVE</span>
                    </span>
                  </div>

                  {auc.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 font-medium">
                      {auc.description}
                    </p>
                  )}

                  {/* Spotlight Snapshot */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {auc.currentPlayer ? (
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                          Now on Hammer:
                        </span>
                        <p className="text-sm font-black text-slate-900">{auc.currentPlayer.name}</p>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-500">Current Bid:</span>
                          <span className="font-black text-slate-900">{fmtChips(auc.currentBid)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-1 font-medium">
                        Table is ready for next player round
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link to={`/auction/${auc.id}`}>
                    <Button size="sm" variant="dark" className="w-full font-bold">
                      Enter Live Auction Room
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FEATURED PLAYERS PREVIEW */}
      <section className="py-12 bg-white border-t border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <PlayerIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Featured Badminton Shuttlers
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Top talent available across singles, doubles, and mixed disciplines
              </p>
            </div>
            <Link to="/players">
              <Button size="sm" variant="outline" className="font-bold">
                View All {players.length} Shuttlers →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {players.slice(0, 4).map((p) => (
              <div key={p.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="relative h-40 bg-slate-900">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <PlayerIcon className="w-12 h-12" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {p.sport}
                  </span>
                  {p.status === 'sold' && (
                    <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      SOLD
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-black text-slate-900 leading-tight">{p.name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{p.role}</p>
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Base Price</span>
                    <span className="font-black text-blue-700">{fmtChips(p.basePrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM OWNERS PREVIEW */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <OwnerIcon className="w-5 h-5 text-blue-600" />
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
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-blue-400 font-black text-lg flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                {t.teamLogo ? (
                  <img src={t.teamLogo} alt={t.teamName} className="w-full h-full object-cover" />
                ) : (
                  t.teamShortCode || t.teamName?.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-900 truncate">{t.teamName}</h4>
                <p className="text-[11px] text-slate-500 truncate">Owner: {t.ownerName}</p>
                <p className="text-xs font-black text-emerald-800 mt-1">
                  {fmtChips(t.remainingChips)} <span className="font-normal text-[10px] text-slate-400">left</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
