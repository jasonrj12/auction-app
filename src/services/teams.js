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
  arrayUnion,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const TEAMS_COLLECTION = 'teams';
export const DEFAULT_INITIAL_CHIPS = 100000;
export const DEFAULT_SQUAD_LIMIT = 15;

/**
 * Register a new team / bidder document in Firestore.
 */
export async function registerTeam(teamData, user = null) {
  const initialChips = Number(teamData.initialChips || DEFAULT_INITIAL_CHIPS);
  const squadLimit = Number(teamData.squadLimit || DEFAULT_SQUAD_LIMIT);

  const docData = {
    teamName: teamData.teamName.trim(),
    teamShortCode: (teamData.teamShortCode || '').trim().toUpperCase() || teamData.teamName.trim().slice(0, 3).toUpperCase(),
    teamLogo: teamData.teamLogo || teamData.photoData || '',
    ownerName: teamData.ownerName?.trim() || user?.displayName || 'Team Owner',
    ownerEmail: (teamData.ownerEmail || user?.email || '').trim().toLowerCase(),
    ownerPhone: (teamData.ownerPhone || '').trim(),
    ownerPhoto: teamData.ownerPhoto || '',
    totalChips: initialChips,
    remainingChips: initialChips,
    spentChips: 0,
    squad: [],
    squadLimit,
    userId: user?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (user?.uid) {
    const teamRef = doc(db, TEAMS_COLLECTION, user.uid);
    await setDoc(teamRef, docData, { merge: true });
    return user.uid;
  } else {
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), docData);
    return docRef.id;
  }
}

/**
 * Get all teams with real-time updates.
 */
export function subscribeAllTeams(callback, onError = null) {
  if (!db) return () => {};
  const q = query(collection(db, TEAMS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(teams);
    },
    (err) => {
      console.error('Error fetching teams:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Get a single team by ID.
 */
export async function getTeamById(teamId) {
  const snap = await getDoc(doc(db, TEAMS_COLLECTION, teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Get team associated with a user ID.
 */
export async function getTeamByUserId(userId) {
  if (!userId) return null;
  const directSnap = await getDoc(doc(db, TEAMS_COLLECTION, userId));
  if (directSnap.exists()) {
    return { id: directSnap.id, ...directSnap.data() };
  }
  const q = query(collection(db, TEAMS_COLLECTION));
  const snap = await getDocs(q);
  const found = snap.docs.find((d) => d.data().userId === userId);
  return found ? { id: found.id, ...found.data() } : null;
}

/**
 * Update team information.
 */
export async function updateTeam(teamId, data) {
  const teamRef = doc(db, TEAMS_COLLECTION, teamId);
  await updateDoc(teamRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reset or adjust a team's chips (Admin tool).
 */
export async function setTeamChips(teamId, newChips) {
  const numeric = Math.max(0, Number(newChips));
  const teamRef = doc(db, TEAMS_COLLECTION, teamId);
  await updateDoc(teamRef, {
    totalChips: numeric,
    remainingChips: numeric,
    spentChips: 0,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a team.
 */
export async function deleteTeam(teamId) {
  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
}
