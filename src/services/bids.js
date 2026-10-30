import {
  runTransaction,
  doc,
  collection,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import supabase from '../lib/supabase';

/**
 * Place a bid on an auction using a Firestore transaction.
 * Updates auction statistics and adds a new bid in the subcollection.
 * Then notifies the Supabase realtime live feed if configured.
 */
export async function placeBid(auctionId, amount, user, profile) {
  if (!user || !user.uid) {
    throw new Error('You must be logged in to place a bid.');
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Please enter a valid bid amount.');
  }

  const auctionRef = doc(db, 'auctions', auctionId);
  const newBidRef = doc(collection(db, 'auctions', auctionId, 'bids'));

  const bidderName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous';

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef);
    if (!snap.exists()) {
      throw new Error('Auction not found.');
    }

    const data = snap.data();
    const now = new Date();
    const endsAt = data.endsAt?.toDate ? data.endsAt.toDate() : new Date(data.endsAt);

    if (endsAt <= now) {
      throw new Error('This auction has already ended.');
    }

    if (data.sellerId === user.uid) {
      throw new Error('You cannot bid on your own auction.');
    }

    const bidCount = data.bidCount || 0;
    const minBid = bidCount === 0
      ? data.startPrice
      : data.currentBid + data.minIncrement;

    if (numericAmount < minBid) {
      throw new Error(`Minimum valid bid is ${minBid}.`);
    }

    // Update auction document
    tx.update(auctionRef, {
      currentBid: numericAmount,
      highestBidderId: user.uid,
      highestBidderName: bidderName,
      bidCount: bidCount + 1,
      bidderIds: arrayUnion(user.uid),
    });

    // Add bid entry to bids subcollection
    tx.set(newBidRef, {
      userId: user.uid,
      userName: bidderName,
      amount: numericAmount,
      createdAt: serverTimestamp(),
    });
  });

  // Fire-and-forget: push to Supabase live feed for realtime viewers
  if (supabase) {
    supabase
      .from('live_bids')
      .insert({
        auction_id: auctionId,
        user_name: bidderName,
        amount: numericAmount,
      })
      .then(() => {})
      .catch((err) => {
        // Feed is informational, so failure here shouldn't fail the bid
        console.warn('Supabase live bid feed insert skipped or failed:', err);
      });
  }
}
