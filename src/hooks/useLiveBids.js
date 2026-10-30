import { useEffect, useState, useRef } from 'react';
import supabase from '../lib/supabase';

/**
 * Subscribes to Supabase realtime channel for live bids and watching presence count.
 * Exposes { feed, viewers }.
 * Cleans up channel subscription on unmount.
 */
export default function useLiveBids(auctionId, user) {
  const [feed, setFeed] = useState([]);
  const [viewers, setViewers] = useState(0);
  const guestIdRef = useRef(null);

  if (!guestIdRef.current) {
    guestIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `guest-${Math.random().toString(36).substring(2, 9)}`;
  }

  useEffect(() => {
    if (!supabase || !auctionId) {
      return;
    }

    const presenceKey = user?.uid || guestIdRef.current;

    const channel = supabase.channel(`auction-${auctionId}`, {
      config: {
        presence: { key: presenceKey },
      },
    });

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_bids',
          filter: `auction_id=eq.${auctionId}`,
        },
        (payload) => {
          if (payload.new) {
            setFeed((prev) => [payload.new, ...prev].slice(0, 10));
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setViewers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            auction_id: auctionId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId, user?.uid]);

  return { feed, viewers };
}
