import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const PLAYERS_COLLECTION = 'players';

/**
 * Register a new player document in Firestore.
 */
export async function registerPlayer(playerData, user = null) {
  const basePrice = Math.max(100, Number(playerData.basePrice || 1000));
  const docData = {
    name: playerData.name.trim(),
    email: (playerData.email || '').trim().toLowerCase(),
    phone: (playerData.phone || '').trim(),
    dob: playerData.dob || '',
    age: playerData.age ? Number(playerData.age) : null,
    sport: playerData.sport || 'Cricket',
    role: playerData.role || 'All-Rounder',
    style: playerData.style || 'Right Hand / Right Arm',
    bio: (playerData.bio || '').trim(),
    photoUrl: playerData.photoUrl || playerData.photoData || '',
    basePrice,
    status: 'available', // available | in_auction | sold | unsold
    soldPrice: null,
    soldToTeamId: null,
    soldToTeamName: null,
    soldToOwnerName: null,
    stats: {
      matches: Number(playerData.matches || 0),
      runsOrGoals: Number(playerData.runsOrGoals || 0),
      wicketsOrAssists: Number(playerData.wicketsOrAssists || 0),
      highestScore: playerData.highestScore || '-',
      average: playerData.average || '-',
      strikeRate: playerData.strikeRate || '-',
    },
    userId: user?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user?.uid) {
    // Tie player document ID to user ID if registered directly
    const playerRef = doc(db, PLAYERS_COLLECTION, user.uid);
    await setDoc(playerRef, docData, { merge: true });
    return user.uid;
  } else {
    const docRef = await addDoc(collection(db, PLAYERS_COLLECTION), docData);
    return docRef.id;
  }
}

/**
 * Get all players with real-time updates.
 */
export function subscribeAllPlayers(callback, onError = null) {
  if (!db) return () => {};
  const q = query(collection(db, PLAYERS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(players);
    },
    (err) => {
      console.error('Error fetching players:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Get a single player by ID.
 */
export async function getPlayerById(playerId) {
  const snap = await getDoc(doc(db, PLAYERS_COLLECTION, playerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Update player details.
 */
export async function updatePlayer(playerId, data) {
  const playerRef = doc(db, PLAYERS_COLLECTION, playerId);
  await updateDoc(playerRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a player from the directory.
 */
export async function deletePlayer(playerId) {
  await deleteDoc(doc(db, PLAYERS_COLLECTION, playerId));
}
