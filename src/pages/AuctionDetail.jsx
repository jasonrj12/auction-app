import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useAuction from '../hooks/useAuction';
import useLiveBids from '../hooks/useLiveBids';
import useNow from '../hooks/useNow';
import { placeBid } from '../services/bids';
import { fmt } from '../lib/format';
import { friendlyError } from '../lib/errors';
import Badge from '../components/Badge';
import Countdown from '../components/Countdown';
import Button from '../components/Button';
import Notice from '../components/Notice';
import StatTile from '../components/StatTile';
import supabase from '../lib/supabase';

export default function AuctionDetail() {
  const { id } = useParams();
  const { user, profile, isBlocked } = useAuth();
  const { addToast } = useToast();
  const { auction, loading, notFound } = useAuction(id);
  const { feed, viewers } = useLiveBids(id, user);
  const now = useNow(1000);

  // Bid history from Firestore
  const [bidHistory, setBidHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!id || !db) return;

    const q = query(
      collection(db, 'auctions', id, 'bids'),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const bids = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setBidHistory(bids);
        setHistoryLoading(false);
      },
      (err) => {
        console.error('Error loading bid history:', err);
        setHistoryLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  // Compute minimum valid bid
  const minBid = useMemo(() => {
    if (!auction) return 0;
    if ((auction.bidCount || 0) === 0) {
      return auction.startPrice;
    }
    return auction.currentBid + (auction.minIncrement || 100);
  }, [auction]);

  // Local bid input state: keep in local state so realtime updates never wipe what user typed,
  // but bump up only if current input is below minBid
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!minBid) return;
    setBidAmount((prev) => {
      const num = Number(prev);
      if (!prev || isNaN(num) || num < minBid) {
        return String(minBid);
      }
      return prev;
    });
  }, [minBid]);

  const endsAtDate = useMemo(() => {
    if (!auction?.endsAt) return null;
    return auction.endsAt.toDate ? auction.endsAt.toDate() : new Date(auction.endsAt);
  }, [auction?.endsAt]);

  const isLive = useMemo(() => {
    if (!endsAtDate) return false;
    return endsAtDate.getTime() > now.getTime();
  }, [endsAtDate, now]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading auction details…</p>
        </div>
      </div>
    );
  }

  if (notFound || !auction) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Auction Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">
            The item you are looking for may have been removed or does not exist.
          </p>
          <Link to="/">
            <Button>Browse Live Auctions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSeller = user?.uid === auction.sellerId;
  const isLeading = Boolean(user?.uid && user.uid === auction.highestBidderId);

  const handlePlaceBid = async (e) => {
    e.preventDefault();

    if (!user) {
      addToast('Please log in or register to place a bid.', 'warning');
      return;
    }

    if (isBlocked) {
      addToast('Your account is suspended. You cannot place bids.', 'error');
      return;
    }

    if (isSeller) {
      addToast('You cannot bid on your own auction.', 'error');
      return;
    }

    const numAmount = Number(bidAmount);
    if (isNaN(numAmount) || numAmount < minBid) {
      addToast(`Bid must be at least ${fmt(minBid)}.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await placeBid(id, numAmount, user, profile);
      addToast(`Successfully placed bid of ${fmt(numAmount)}!`, 'success');
    } catch (err) {
      console.error('Bid error:', err);
      addToast(friendlyError(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine hint line content
  let hintContent = null;
  if (!isLive) {
    if ((auction.bidCount || 0) === 0) {
      hintContent = (
        <Notice type="info">
          Auction ended with no bids.
        </Notice>
      );
    } else {
      hintContent = (
        <Notice type="success">
          {isLeading ? (
            <span>🎉 Congratulations! <strong>You won</strong> this auction for <strong>{fmt(auction.currentBid)}</strong>.</span>
          ) : (
            <span>Sold to <strong>{auction.highestBidderName || 'highest bidder'}</strong> for <strong>{fmt(auction.currentBid)}</strong>.</span>
          )}
        </Notice>
      );
    }
  } else if (isBlocked) {
    hintContent = (
      <Notice type="error">
        Your account is suspended. You are restricted from bidding or creating listings.
      </Notice>
    );
  } else if (!user) {
    hintContent = (
      <Notice type="info">
        <Link to="/login" className="font-bold underline text-indigo-700 hover:text-indigo-900">
          Log in
        </Link>{' '}
        or{' '}
        <Link to="/register" className="font-bold underline text-indigo-700 hover:text-indigo-900">
          register
        </Link>{' '}
        to participate in this auction.
      </Notice>
    );
  } else if (isSeller) {
    hintContent = (
      <Notice type="info">
        You are the seller of this item. Sellers cannot bid on their own listings.
      </Notice>
    );
  } else {
    hintContent = (
      <p className="text-xs text-slate-500 font-medium">
        Minimum bid increment is <span className="text-slate-700 font-semibold">{fmt(auction.minIncrement || 100)}</span>. Next minimum bid is <span className="text-indigo-600 font-bold">{fmt(minBid)}</span>.
      </p>
    );
  }

  const canBid = isLive && user && !isBlocked && !isSeller;

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb navigation */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="hover:text-indigo-600 font-medium transition-colors">
            Auctions
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold truncate max-w-xs">{auction.title}</span>
        </div>

        {/* Top Product Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-sm mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Image Preview */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="w-full h-80 sm:h-96 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                {auction.imageUrl ? (
                  <img
                    src={auction.imageUrl}
                    alt={auction.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}

                <div
                  className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 text-indigo-300 font-black text-8xl select-none ${
                    auction.imageUrl ? 'hidden' : 'flex'
                  }`}
                >
                  {auction.title?.[0]?.toUpperCase() || 'A'}
                </div>

                <div className="absolute top-4 left-4 z-10">
                  <Badge live={isLive} />
                </div>
              </div>
            </div>

            {/* Auction Info & Bidding Panel */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Listed by <span className="text-slate-700 font-bold">{auction.sellerName || 'Anonymous'}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {auction.createdAt?.toDate ? auction.createdAt.toDate().toLocaleDateString() : ''}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                  {auction.title}
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {auction.description || 'No description provided for this item.'}
                </p>
              </div>

              {/* Price Display */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  {auction.bidCount === 0 ? 'Starting Price' : 'Current Highest Bid'}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-indigo-600 tracking-tight mt-1">
                  {fmt(auction.currentBid || auction.startPrice)}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <StatTile
                  label="Time Left"
                  value={isLive ? <Countdown endsAt={auction.endsAt} /> : 'Ended'}
                />
                <StatTile
                  label="Leading Bidder"
                  value={
                    auction.highestBidderName
                      ? isLeading
                        ? 'You'
                        : auction.highestBidderName
                      : 'None'
                  }
                  sub={isLeading ? 'Highest bid' : undefined}
                />
                <StatTile
                  label="Total Bids"
                  value={auction.bidCount || 0}
                />
              </div>

              {/* Bid Form */}
              {canBid && (
                <form onSubmit={handlePlaceBid} className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={minBid}
                        step="1"
                        required
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder={String(minBid)}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      size="lg"
                      className="px-8 shadow-md"
                    >
                      {isSubmitting ? 'Placing…' : 'Place Bid'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Status / Hint Notice */}
              {hintContent}
            </div>
          </div>
        </div>

        {/* Realtime Live Feed and Bid History Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Live Feed (Supabase Realtime) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h2 className="font-bold text-slate-900 text-base">Live Feed</h2>
              </div>
              {supabase ? (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  👁 {viewers} watching now
                </span>
              ) : null}
            </div>

            {!supabase ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Add your Supabase keys to <code className="bg-slate-100 px-1 rounded text-slate-600">.env</code> to enable the live feed.
              </div>
            ) : feed.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Waiting for incoming live bids…
              </div>
            ) : (
              <div className="space-y-2">
                {feed.map((liveBid, index) => (
                  <div
                    key={liveBid.id || index}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                      index === 0
                        ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold shadow-sm'
                        : 'bg-slate-50/60 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-600 font-bold">⚡</span>
                      <span className="text-sm truncate max-w-[150px]">{liveBid.user_name}</span>
                    </div>
                    <span className="text-sm font-extrabold text-indigo-600">
                      {fmt(Number(liveBid.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bid History (Firestore Subcollection) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-bold text-slate-900 text-base">Bid History</h2>
              <span className="text-xs font-semibold text-slate-400">
                {bidHistory.length} total recorded
              </span>
            </div>

            {historyLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Loading bid history…
              </div>
            ) : bidHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No bids placed yet. Be the first to bid!
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {bidHistory.map((bid, i) => (
                  <div
                    key={bid.id || i}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {bid.userName || 'Anonymous'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {bid.createdAt?.toDate
                          ? bid.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : 'Just now'}
                      </span>
                    </div>
                    <div className="text-base font-extrabold text-indigo-600">
                      {fmt(Number(bid.amount))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
