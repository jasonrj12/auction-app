import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, firebaseReady } from '../lib/firebase';

/**
 * Realtime Firestore listener for all auctions, ordered by createdAt desc.
 * Cleans up subscription on unmount.
 */
export default function useAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseReady || !db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'auctions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAuctions(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching auctions:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { auctions, loading, error };
}
