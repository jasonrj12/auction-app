import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseReady } from '../lib/firebase';

/**
 * Realtime Firestore listener for a single auction document by ID.
 * Cleans up subscription on unmount.
 */
export default function useAuction(id) {
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseReady || !db || !id) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'auctions', id),
      (snap) => {
        if (snap.exists()) {
          setAuction({ id: snap.id, ...snap.data() });
          setNotFound(false);
        } else {
          setAuction(null);
          setNotFound(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching auction ${id}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  return { auction, loading, notFound, error };
}
