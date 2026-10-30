import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useAuction from '../hooks/useAuction';
import useLiveBids from '../hooks/useLiveBids';
import { getTeamByUserId, subscribeAllTeams } from '../services/teams';
import { subscribeAllPlayers } from '../services/players';
import {
  bringPlayerToHammer,
  placeSportsBid,
  sellPlayerToWinner,
  passPlayerUnsold,
} from '../services/sportsAuctions';
import { fmtChips } from '../lib/format';
import { friendlyError } from '../lib/errors';
import { TrophyIcon, GavelIcon, PlayerIcon, LivePulse, CheckIcon } from '../components/Icons';
import Button from '../components/Button';
import Notice from '../components/Notice';
import Chip from '../components/Chip';

export default function AuctionDetail() {
  const { id } = useParams();
  const { user, profile, isAdmin } = useAuth();
  const { addToast } = useToast();
  const { auction, loading, notFound } = useAuction(id);
  const { feed } = useLiveBids(id, user);

  // User's own team (if logged in as bidder)
  const [userTeam, setUserTeam] = useState(null);

  // All teams in tournament
  const [allTeams, setAllTeams] = useState([]);

  // All players
  const [allPlayers, setAllPlayers] = useState([]);

  // Bid history from Firestore subcollection
  const [bidHistory, setBidHistory] = useState([]);

  // Modal / selector for bringing next player to hammer (Admin)
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [customBid, setCustomBid] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pool'); // 'pool' | 'sold' | 'unsold'

  // Load user team
  useEffect(() => {
    if (user?.uid) {
      getTeamByUserId(user.uid).then((team) => {
        setUserTeam(team);
      });
    }
  }, [user]);

  // Subscribe to all teams
  useEffect(() => {
    const unsub = subscribeAllTeams((teams) => {
      setAllTeams(teams);
      if (user?.uid) {
        const myTeam = teams.find((t) => t.userId === user.uid || t.id === user.uid);
        if (myTeam) setUserTeam(myTeam);
      }
    });
    return () => unsub();
  }, [user]);

  // Subscribe to all players
  useEffect(() => {
    const unsub = subscribeAllPlayers((players) => {
      setAllPlayers(players);
    });
    return () => unsub();
  }, []);

  // Subscribe to bids
  useEffect(() => {
    if (!id || !db) return;
    const q = query(
      collection(db, 'auctions', id, 'bids'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setBidHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [id]);

  const currentPlayer = auction?.currentPlayer;
  const minIncrement = Number(auction?.minIncrement || 500);

  // Next minimum bid calculation
  const nextMinBid = useMemo(() => {
    if (!currentPlayer) return 0;
    const current = Number(auction?.currentBid || currentPlayer.basePrice || 0);
    return (auction?.bidCount || 0) === 0 ? current : current + minIncrement;
  }, [auction, currentPlayer, minIncrement]);

  // Handle Quick Bids
  const handlePlaceBid = async (amount) => {
    if (!user) {
      addToast('Please log in to place bids.', 'error');
      return;
    }
    if (!userTeam) {
      addToast('You must register as a Team Owner to place bids.', 'error');
      return;
    }
    if (userTeam.remainingChips < amount) {
      addToast(`Insufficient chips! Remaining purse: ${fmtChips(userTeam.remainingChips)}`, 'error');
      return;
    }

    setActionLoading(true);
    try {
      await placeSportsBid(id, amount, user, userTeam);
      addToast(`Bid of ${fmtChips(amount)} placed successfully.`, 'success');
      setCustomBid('');
    } catch (err) {
      console.error('Bid error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: Bring player to hammer
  const handleBringToHammer = async (player) => {
    setActionLoading(true);
    try {
      await bringPlayerToHammer(id, player);
      setShowPlayerPicker(false);
      addToast(`${player.name} is now on the auction hammer.`, 'success');
    } catch (err) {
      console.error('Hammer error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: Sell player to winning team
  const handleSellPlayer = async () => {
    if (!currentPlayer || !auction.highestBidderTeamId) {
      addToast('Cannot sell: No valid highest bidder on the table.', 'error');
      return;
    }

    const winningTeam = allTeams.find((t) => t.id === auction.highestBidderTeamId);
    if (!winningTeam) {
      addToast('Winning team information not found.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await sellPlayerToWinner(id, currentPlayer, winningTeam, auction.currentBid);
      addToast(
        `SOLD: ${currentPlayer.name} acquired by ${winningTeam.teamName} for ${fmtChips(auction.currentBid)}.`,
        'success'
      );
    } catch (err) {
      console.error('Sell error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: Mark player unsold
  const handlePassUnsold = async () => {
    if (!currentPlayer) return;
    setActionLoading(true);
    try {
      await passPlayerUnsold(id, currentPlayer);
      addToast(`${currentPlayer.name} marked UNSOLD.`, 'info');
    } catch (err) {
      console.error('Unsold error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-slate-900 mb-3" />
          <p className="text-slate-500 font-semibold text-sm">Connecting to Sports Auction room…</p>
        </div>
      </div>
    );
  }

  if (notFound || !auction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <GavelIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Auction Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            The sports auction room you are looking for does not exist or has been archived.
          </p>
          <Link to="/">
            <Button variant="dark">Back to Auctions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const availablePool = allPlayers.filter((p) => p.status === 'available' || !p.status);
  const soldPlayers = allPlayers.filter((p) => p.status === 'sold');
  const unsoldPlayers = allPlayers.filter((p) => p.status === 'unsold');

  const isLeading = userTeam && auction.highestBidderTeamId === userTeam.id;

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-sm">
              <TrophyIcon className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {auction.title}
                </h1>
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <LivePulse />
                  <span>LIVE</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sport: <strong>{auction.sport}</strong> • Min Increment: <strong>+{fmtChips(minIncrement)}</strong>
              </p>
            </div>
          </div>

          {/* User Team Purse Status */}
          {userTeam && (
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Your Franchise</span>
                <span className="text-sm font-black text-emerald-950">{userTeam.teamName}</span>
              </div>
              <div className="border-l border-emerald-200 pl-4">
                <span className="text-lg font-black text-emerald-800 block leading-tight">
                  {fmtChips(userTeam.remainingChips)}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">Available Purse</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid: Player Spotlight + Bidders & Live Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* SPOTLIGHT: Current Player on Hammer (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {currentPlayer ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Spotlight Header Banner */}
                <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LivePulse />
                    <span className="text-xs font-black tracking-wider uppercase text-blue-400">
                      ON THE AUCTION HAMMER NOW
                    </span>
                  </div>
                  <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                    {currentPlayer.sport} • {currentPlayer.role}
                  </span>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Player Headshot Photo */}
                    <div className="w-full sm:w-52 h-60 rounded-2xl bg-slate-900 overflow-hidden flex-shrink-0 relative border border-slate-200 shadow-sm">
                      {currentPlayer.photoUrl ? (
                        <img
                          src={currentPlayer.photoUrl}
                          alt={currentPlayer.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <PlayerIcon className="w-16 h-16" />
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        Base: {fmtChips(currentPlayer.basePrice)}
                      </span>
                    </div>

                    {/* Player Info & Stats */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                          {currentPlayer.name}
                        </h2>
                        {currentPlayer.style && (
                          <p className="text-xs text-blue-700 font-bold mt-0.5">
                            {currentPlayer.style}
                          </p>
                        )}
                        {currentPlayer.bio && (
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {currentPlayer.bio}
                          </p>
                        )}
                      </div>

                      {/* Career Highlights */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Matches</span>
                          <span className="text-sm font-black text-slate-900">{currentPlayer.stats?.matches ?? '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Runs/Goals</span>
                          <span className="text-sm font-black text-slate-900">{currentPlayer.stats?.runsOrGoals ?? '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Wkts/Assists</span>
                          <span className="text-sm font-black text-slate-900">{currentPlayer.stats?.wicketsOrAssists ?? '-'}</span>
                        </div>
                      </div>

                      {/* Current Bid & Leading Franchise Card */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                            Current Highest Bid
                          </span>
                          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                            {fmtChips(auction.currentBid || currentPlayer.basePrice)}
                          </div>
                          {auction.highestBidderTeamName ? (
                            <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                              <span>Leading:</span>
                              <strong className="text-blue-700">{auction.highestBidderTeamName}</strong>
                              <span className="text-[11px] font-normal text-slate-500">({auction.highestBidderOwnerName})</span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 italic mt-0.5">
                              Opening bid awaits at base price
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Bids Placed</span>
                          <span className="text-xl font-black text-slate-800">{auction.bidCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bidding Controls (For Team Owners) */}
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Place Team Bid in Chips
                    </h3>

                    {!user ? (
                      <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-200">
                        <p className="text-xs text-slate-600 mb-2 font-medium">
                          Log in as a registered Team Owner to bid on this player.
                        </p>
                        <Link to="/login">
                          <Button size="sm" variant="dark">Log in to Bid</Button>
                        </Link>
                      </div>
                    ) : !userTeam ? (
                      <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-200">
                        <p className="text-xs text-slate-700 font-semibold mb-2">
                          You are currently registered as a Player. Only Team Owners can purchase players.
                        </p>
                        <Link to="/register">
                          <Button size="sm" variant="outline">Register a Team Franchise</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {isLeading && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center">
                            Your team ({userTeam.teamName}) currently holds the highest bid!
                          </div>
                        )}

                        {/* Quick increment buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[nextMinBid, nextMinBid + 500, nextMinBid + 1000, nextMinBid + 2500].map((amt, idx) => {
                            const canAfford = userTeam.remainingChips >= amt;
                            return (
                              <button
                                key={idx}
                                disabled={actionLoading || isLeading || !canAfford}
                                onClick={() => handlePlaceBid(amt)}
                                className={`p-3 rounded-2xl font-black text-xs transition border flex flex-col items-center justify-center ${
                                  isLeading
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : canAfford
                                    ? 'bg-slate-50 hover:bg-slate-900 hover:text-white border-slate-200 text-slate-900 shadow-sm'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <span>Bid</span>
                                <span className="text-sm font-black">+{fmtChips(amt)}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Bid Input */}
                        <div className="flex gap-2 pt-2">
                          <input
                            type="number"
                            placeholder={`Enter chips (min ${nextMinBid})...`}
                            value={customBid}
                            onChange={(e) => setCustomBid(e.target.value)}
                            disabled={isLeading || actionLoading}
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <Button
                            disabled={
                              isLeading ||
                              actionLoading ||
                              !customBid ||
                              Number(customBid) < nextMinBid ||
                              userTeam.remainingChips < Number(customBid)
                            }
                            onClick={() => handlePlaceBid(Number(customBid))}
                            variant="dark"
                            className="font-bold px-6"
                          >
                            Place Bid
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Auctioneer Desk Controls (ADMIN ONLY) */}
                  {isAdmin && (
                    <div className="mt-6 pt-6 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Auctioneer Desk (Admin Actions)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          disabled={actionLoading || !auction.highestBidderTeamId}
                          onClick={handleSellPlayer}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 shadow-sm"
                        >
                          SOLD to {auction.highestBidderTeamName || 'Leading Team'} ({fmtChips(auction.currentBid)})
                        </Button>

                        <Button
                          variant="outline"
                          disabled={actionLoading}
                          onClick={handlePassUnsold}
                          className="font-bold py-3 text-slate-700"
                        >
                          Mark UNSOLD / Pass Player
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              /* Empty Table */
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                <GavelIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h2 className="text-xl font-black text-slate-900 mb-1">
                  The Auction Table is Clear
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                  {isAdmin
                    ? 'As tournament administrator, select a player from the available pool below to bring to the hammer.'
                    : 'The auctioneer is preparing the next player. Stay tuned for the next bidding round.'}
                </p>

                {isAdmin && (
                  <Button
                    onClick={() => setShowPlayerPicker(true)}
                    size="lg"
                    variant="dark"
                    className="font-bold shadow-md"
                  >
                    Select Next Player for Auction
                  </Button>
                )}
              </div>
            )}

            {/* Auction Player Pools Tabs */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('pool')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'pool'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Available Pool ({availablePool.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sold')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'sold'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Sold Players ({soldPlayers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('unsold')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === 'unsold'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Unsold ({unsoldPlayers.length})
                  </button>
                </div>

                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPlayerPicker(true)}
                    className="text-xs font-bold"
                  >
                    + Pick Player
                  </Button>
                )}
              </div>

              {/* Pool List */}
              {activeTab === 'pool' && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availablePool.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      No available players remaining in the pool.
                    </p>
                  ) : (
                    availablePool.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              p.name?.slice(0, 1)
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {p.sport} • {p.role}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-blue-700">
                            Base: {fmtChips(p.basePrice)}
                          </span>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="dark"
                              disabled={actionLoading || Boolean(currentPlayer)}
                              onClick={() => handleBringToHammer(p)}
                              className="text-xs py-1 px-3"
                            >
                              Put on Hammer
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sold List */}
              {activeTab === 'sold' && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {soldPlayers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      No players have been sold yet.
                    </p>
                  ) : (
                    soldPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden flex-shrink-0">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              p.name?.slice(0, 1)
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                            <p className="text-[11px] text-emerald-800 font-bold">
                              Sold to: {p.soldToTeamName || 'Team'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-800">
                          {fmtChips(p.soldPrice)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Unsold List */}
              {activeTab === 'unsold' && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {unsoldPlayers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">
                      No unsold players.
                    </p>
                  ) : (
                    unsoldPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                          <p className="text-[11px] text-slate-500">{p.sport} • {p.role}</p>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading || Boolean(currentPlayer)}
                            onClick={() => handleBringToHammer(p)}
                            className="text-xs"
                          >
                            Re-open
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

          </div>

          {/* SIDEBAR: Competing Franchises & Live Feed (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Live Bids Feed */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <LivePulse />
                  <span>Live Bids Feed</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Real-Time</span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {bidHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No bids recorded in this round yet.
                  </p>
                ) : (
                  bidHistory.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-black text-slate-900 block leading-tight">
                          {b.teamName || b.userName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {b.playerName ? `for ${b.playerName}` : 'Bid'}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 bg-slate-200 px-2 py-0.5 rounded-lg">
                        +{fmtChips(b.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Competing Teams & Purses Leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Franchise Purses
                </span>
                <span className="text-[10px] font-bold text-slate-400">{allTeams.length} Teams</span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {allTeams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No teams registered yet.
                  </p>
                ) : (
                  allTeams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-2xl border transition ${
                        auction.highestBidderTeamId === team.id
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden">
                            {team.teamLogo ? (
                              <img src={team.teamLogo} alt={team.teamName} className="w-full h-full object-cover" />
                            ) : (
                              team.teamShortCode || team.teamName?.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block leading-tight">
                              {team.teamName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {team.squad?.length || 0} players won
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-800 block">
                            {fmtChips(team.remainingChips)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Admin: Select Player Modal */}
      {showPlayerPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Select Player for Auction</h3>
                <p className="text-xs text-slate-500">Choose a player to put on the hammer for bidding</p>
              </div>
              <button
                onClick={() => setShowPlayerPicker(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {availablePool.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  No available players found in the pool.
                </p>
              ) : (
                availablePool.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 flex items-center justify-between transition cursor-pointer"
                    onClick={() => handleBringToHammer(p)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          p.name?.slice(0, 1)
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                        <p className="text-[11px] text-slate-500">{p.sport} • {p.role}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-blue-700 block">
                        Base: {fmtChips(p.basePrice)}
                      </span>
                      <span className="text-[10px] text-slate-400">Click to start round</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
