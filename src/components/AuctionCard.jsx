import { useNavigate } from 'react-router-dom';
import Card from './Card';
import Badge from './Badge';
import Countdown from './Countdown';
import { fmt } from '../lib/format';

export default function AuctionCard({ auction }) {
  const navigate = useNavigate();

  const endsAtDate = auction.endsAt?.toDate
    ? auction.endsAt.toDate()
    : new Date(auction.endsAt);
  const isLive = endsAtDate.getTime() > Date.now();

  const titleInitial = auction.title ? auction.title.trim()[0].toUpperCase() : 'A';

  return (
    <Card
      onClick={() => navigate(`/auction/${auction.id}`)}
      className="overflow-hidden flex flex-col h-full group"
    >
      {/* Image container */}
      <div className="relative h-48 bg-slate-100 overflow-hidden flex items-center justify-center">
        {auction.imageUrl ? (
          <img
            src={auction.imageUrl}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}

        {/* Fallback letter placeholder */}
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-200 text-indigo-300 font-extrabold text-6xl select-none ${
            auction.imageUrl ? 'hidden' : 'flex'
          }`}
        >
          {titleInitial}
        </div>

        {/* Live / Ended Badge */}
        <div className="absolute top-3 left-3 z-10">
          <Badge live={isLive} />
        </div>

        {/* Bid count pill */}
        <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {auction.bidCount || 0} {auction.bidCount === 1 ? 'bid' : 'bids'}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base truncate mb-1" title={auction.title}>
            {auction.title}
          </h3>
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
            {auction.description || 'No description provided.'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {auction.bidCount === 0 ? 'Starting bid' : 'Current bid'}
            </p>
            <p className="text-lg font-extrabold text-indigo-600">
              {fmt(auction.currentBid || auction.startPrice)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">
              {isLive ? 'Time left' : 'Status'}
            </p>
            <div className="text-sm">
              {isLive ? (
                <Countdown endsAt={auction.endsAt} />
              ) : (
                <span className="text-slate-500 font-medium">Ended</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
