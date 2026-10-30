import { useState, useMemo } from 'react';
import useAuctions from '../hooks/useAuctions';
import AuctionCard from '../components/AuctionCard';
import Tabs from '../components/Tabs';
import useNow from '../hooks/useNow';
import Input from '../components/Input';

const TABS = [
  { key: 'live', label: 'Live Auctions' },
  { key: 'ended', label: 'Ended' },
  { key: 'all', label: 'All Items' },
];

export default function Home() {
  const { auctions, loading, error } = useAuctions();
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Re-evaluate live/ended status every 15 seconds
  const now = useNow(15000);

  const { liveList, endedList, allList, counts } = useMemo(() => {
    const currentTime = now.getTime();

    const live = [];
    const ended = [];

    auctions.forEach((item) => {
      const endsTime = item.endsAt?.toDate
        ? item.endsAt.toDate().getTime()
        : new Date(item.endsAt).getTime();

      if (endsTime > currentTime) {
        live.push(item);
      } else {
        ended.push(item);
      }
    });

    // Live sorted by soonest end
    live.sort((a, b) => {
      const aTime = a.endsAt?.toDate ? a.endsAt.toDate().getTime() : new Date(a.endsAt).getTime();
      const bTime = b.endsAt?.toDate ? b.endsAt.toDate().getTime() : new Date(b.endsAt).getTime();
      return aTime - bTime;
    });

    // Ended sorted by most recent end
    ended.sort((a, b) => {
      const aTime = a.endsAt?.toDate ? a.endsAt.toDate().getTime() : new Date(a.endsAt).getTime();
      const bTime = b.endsAt?.toDate ? b.endsAt.toDate().getTime() : new Date(b.endsAt).getTime();
      return bTime - aTime;
    });

    return {
      liveList: live,
      endedList: ended,
      allList: [...live, ...ended],
      counts: {
        live: live.length,
        ended: ended.length,
        all: auctions.length,
      },
    };
  }, [auctions, now]);

  const displayedList = useMemo(() => {
    let list = [];
    if (activeTab === 'live') list = liveList;
    else if (activeTab === 'ended') list = endedList;
    else list = allList;

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      return (
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.sellerName && item.sellerName.toLowerCase().includes(query))
      );
    });
  }, [activeTab, liveList, endedList, allList, searchQuery]);

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count: counts[t.key] || 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
            Realtime Bidding Platform
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
            Bid live. Win fast.
          </h1>
          <p className="text-indigo-100 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Real-time auctions, transparent bids, and instant results. Discover unique collectibles, electronics, and rare finds today.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            tabs={tabsWithCounts}
            active={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
          />

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search items or sellers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Auction Cards Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 mb-4" />
            <p className="text-slate-500 font-medium">Loading live auctions…</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 max-w-md mx-auto">
            <p className="font-semibold mb-1">Failed to load auctions</p>
            <p className="text-sm">{error.message || 'Please check your connection.'}</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 text-center shadow-sm">
            <div className="text-5xl mb-3">🏷️</div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              No auctions found
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {searchQuery
                ? `No items matching "${searchQuery}". Try different keywords.`
                : activeTab === 'live'
                ? 'There are currently no active live auctions. Be the first to list one!'
                : 'No auctions in this category yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedList.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
