import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Creates a new auction in its initial state.
 * Returns the created auction ID.
 */
export async function createAuction(data, user, profile) {
  const sellerName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous';
  const startPrice = Math.max(1, Number(data.startPrice));
  const minIncrement = Math.max(1, Number(data.minIncrement || 100));
  const endsAtDate = new Date(data.endsAt);

  const newDoc = {
    title: data.title.trim(),
    description: (data.description || '').trim(),
    imageUrl: (data.imageUrl || '').trim(),
    startPrice,
    minIncrement,
    currentBid: startPrice,
    bidCount: 0,
    highestBidderId: null,
    highestBidderName: null,
    bidderIds: [],
    sellerId: user.uid,
    sellerName,
    endsAt: Timestamp.fromDate(endsAtDate),
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'auctions'), newDoc);
  return ref.id;
}

/**
 * End an auction immediately (sets endsAt to current timestamp).
 */
export async function endAuction(auctionId) {
  const auctionRef = doc(db, 'auctions', auctionId);
  await updateDoc(auctionRef, {
    endsAt: Timestamp.fromDate(new Date()),
  });
}

/**
 * Delete an auction and all its bids from the subcollection.
 */
export async function deleteAuction(auctionId) {
  // First delete all documents in the bids subcollection
  const bidsSnap = await getDocs(collection(db, 'auctions', auctionId, 'bids'));
  if (!bidsSnap.empty) {
    const batch = writeBatch(db);
    bidsSnap.forEach((bidDoc) => {
      batch.delete(bidDoc.ref);
    });
    await batch.commit();
  }

  // Then delete the auction itself
  await deleteDoc(doc(db, 'auctions', auctionId));
}
