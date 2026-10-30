import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import supabase from '../lib/supabase';
import { updatePlayer } from './players';

/**
 * Creates a new sports auction room.
 */
export async function createSportsAuction(data, user, profile) {
  const minIncrement = Math.max(50, Number(data.minIncrement || 500));
  const defaultChips = Math.max(1000, Number(data.defaultChips || 100000));
  const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : new Date(Date.now() + 86400000);

  const newDoc = {
    title: data.title.trim(),
    sport: data.sport || 'Cricket',
    description: (data.description || '').trim(),
    imageUrl: (data.imageUrl || '').trim(),
    minIncrement,
    defaultChips,
    status: data.status || 'live', // live | upcoming | completed
    scheduledAt: Timestamp.fromDate(scheduledDate),
    endsAt: Timestamp.fromDate(new Date(Date.now() + 7 * 86400000)), // active for 7 days
    currentPlayer: null,
    currentPlayerId: null,
    currentBid: 0,
    highestBidderId: null,
    highestBidderTeamId: null,
    highestBidderTeamName: null,
    highestBidderOwnerName: null,
    bidCount: 0,
    bidderIds: [],
    soldPlayerIds: [],
    unsoldPlayerIds: [],
    adminId: user.uid,
    adminName: profile?.displayName || user.displayName || 'Tournament Admin',
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'auctions'), newDoc);
  return ref.id;
}

/**
 * Put a player up on the auction hammer.
 */
export async function bringPlayerToHammer(auctionId, player) {
  const auctionRef = doc(db, 'auctions', auctionId);
  const playerRef = doc(db, 'players', player.id);

  const basePrice = Math.max(100, Number(player.basePrice || 1000));

  await runTransaction(db, async (tx) => {
    tx.update(auctionRef, {
      currentPlayerId: player.id,
      currentPlayer: {
        id: player.id,
        name: player.name,
        sport: player.sport,
        role: player.role,
        style: player.style || '',
        basePrice,
        photoUrl: player.photoUrl || '',
        stats: player.stats || {},
        bio: player.bio || '',
      },
      currentBid: basePrice,
      highestBidderId: null,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      highestBidderOwnerName: null,
      bidCount: 0,
      updatedAt: serverTimestamp(),
    });

    tx.update(playerRef, {
      status: 'in_auction',
      auctionId,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Place a bid in chips on the current player.
 */
export async function placeSportsBid(auctionId, chipAmount, user, team) {
  if (!user || !user.uid) {
    throw new Error('You must be logged in as a registered Team Owner to place bids.');
  }

  if (!team || !team.id) {
    throw new Error('No registered Team found for this account. Please register your Team first.');
  }

  const numericChips = Number(chipAmount);
  if (isNaN(numericChips) || numericChips <= 0) {
    throw new Error('Please enter a valid chip amount.');
  }

  if (team.remainingChips < numericChips) {
    throw new Error(`Insufficient chips! Your remaining purse is ${team.remainingChips.toLocaleString()} Chips, but you bid ${numericChips.toLocaleString()} Chips.`);
  }

  const auctionRef = doc(db, 'auctions', auctionId);
  const newBidRef = doc(collection(db, 'auctions', auctionId, 'bids'));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(auctionRef);
    if (!snap.exists()) {
      throw new Error('Auction not found.');
    }

    const data = snap.data();
    if (!data.currentPlayer) {
      throw new Error('No player is currently on the auction block.');
    }

    if (data.status !== 'live') {
      throw new Error('This auction is not currently live for bidding.');
    }

    if (data.highestBidderTeamId === team.id) {
      throw new Error('Your team is already holding the highest bid!');
    }

    const currentBid = Number(data.currentBid || data.currentPlayer.basePrice || 0);
    const minIncrement = Number(data.minIncrement || 500);
    const requiredMin = data.bidCount === 0 ? currentBid : currentBid + minIncrement;

    if (numericChips < requiredMin) {
      throw new Error(`Minimum next bid is ${requiredMin.toLocaleString()} Chips (Increment: +${minIncrement.toLocaleString()}).`);
    }

    tx.update(auctionRef, {
      currentBid: numericChips,
      highestBidderId: user.uid,
      highestBidderTeamId: team.id,
      highestBidderTeamName: team.teamName,
      highestBidderOwnerName: team.ownerName,
      bidCount: (data.bidCount || 0) + 1,
      bidderIds: arrayUnion(user.uid),
      updatedAt: serverTimestamp(),
    });

    tx.set(newBidRef, {
      userId: user.uid,
      teamId: team.id,
      teamName: team.teamName,
      ownerName: team.ownerName,
      playerId: data.currentPlayer.id,
      playerName: data.currentPlayer.name,
      amount: numericChips,
      createdAt: serverTimestamp(),
    });
  });

  // Real-time broadcast if Supabase is active
  if (supabase) {
    supabase.from('live_bids').insert({
      auction_id: auctionId,
      user_name: `${team.teamName} (${team.ownerName})`,
      amount: numericChips,
    }).then(() => {}).catch(() => {});
  }
}

/**
 * Sell the current player to the winning team.
 * Automatically deducts chips from team, adds player to team squad,
 * marks player as 'sold', and clears the hammer.
 */
export async function sellPlayerToWinner(auctionId, player, team, winningChips) {
  const auctionRef = doc(db, 'auctions', auctionId);
  const playerRef = doc(db, 'players', player.id);
  const teamRef = doc(db, 'teams', team.id);

  const chips = Number(winningChips);

  await runTransaction(db, async (tx) => {
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists()) {
      throw new Error('Winning team record not found.');
    }

    const teamData = teamSnap.data();
    const remaining = Number(teamData.remainingChips || 0);
    if (remaining < chips) {
      throw new Error(`Team does not have enough chips (${remaining} left, needed ${chips}).`);
    }

    const squad = teamData.squad || [];
    const updatedSquad = [
      ...squad,
      {
        playerId: player.id,
        name: player.name,
        role: player.role,
        sport: player.sport,
        photoUrl: player.photoUrl || '',
        price: chips,
        boughtAt: new Date().toISOString(),
      },
    ];

    // Deduct chips from winning team
    tx.update(teamRef, {
      remainingChips: remaining - chips,
      spentChips: (teamData.spentChips || 0) + chips,
      squad: updatedSquad,
      updatedAt: serverTimestamp(),
    });

    // Mark player as sold
    tx.update(playerRef, {
      status: 'sold',
      soldPrice: chips,
      soldToTeamId: team.id,
      soldToTeamName: team.teamName,
      soldToOwnerName: team.ownerName,
      auctionId,
      updatedAt: serverTimestamp(),
    });

    // Update auction room
    tx.update(auctionRef, {
      currentPlayer: null,
      currentPlayerId: null,
      currentBid: 0,
      highestBidderId: null,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      highestBidderOwnerName: null,
      bidCount: 0,
      soldPlayerIds: arrayUnion(player.id),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Mark current player as unsold and clear hammer.
 */
export async function passPlayerUnsold(auctionId, player) {
  const auctionRef = doc(db, 'auctions', auctionId);
  const playerRef = doc(db, 'players', player.id);

  await runTransaction(db, async (tx) => {
    tx.update(playerRef, {
      status: 'unsold',
      updatedAt: serverTimestamp(),
    });

    tx.update(auctionRef, {
      currentPlayer: null,
      currentPlayerId: null,
      currentBid: 0,
      highestBidderId: null,
      highestBidderTeamId: null,
      highestBidderTeamName: null,
      highestBidderOwnerName: null,
      bidCount: 0,
      unsoldPlayerIds: arrayUnion(player.id),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * End a sports auction.
 */
export async function endSportsAuction(auctionId) {
  const auctionRef = doc(db, 'auctions', auctionId);
  await updateDoc(auctionRef, {
    status: 'completed',
    currentPlayer: null,
    currentPlayerId: null,
    updatedAt: serverTimestamp(),
  });
}
