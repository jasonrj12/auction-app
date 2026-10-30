import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseReady } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubProfileRef = useRef(null);

  const refreshProfile = useCallback(async () => {
    if (!auth || !auth.currentUser || !db) return;
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        setProfile(snap.data());
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, []);

  useEffect(() => {
    if (!firebaseReady || !auth || !db) {
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous profile listener if any
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);

      // Attach a real-time listener to the user doc so changes (like admin promoting or blocking) reflect immediately
      unsubProfileRef.current = onSnapshot(userRef, async (snap) => {
        if (snap.exists()) {
          setProfile(snap.data());
          setLoading(false);
        } else {
          // If the profile document doesn't exist yet, wait briefly to guard against
          // a race condition with the registration form creating the profile
          setTimeout(async () => {
            try {
              const freshSnap = await getDoc(userRef);
              if (freshSnap.exists()) {
                setProfile(freshSnap.data());
              } else {
                // Initialize default profile
                const defaultProfile = {
                  displayName: currentUser.displayName || '',
                  email: currentUser.email || '',
                  phone: '',
                  dob: '',
                  photoData: '',
                  role: 'user',
                  disabled: false,
                  createdAt: serverTimestamp(),
                };
                await setDoc(userRef, defaultProfile);
                setProfile(defaultProfile);
              }
            } catch (err) {
              console.error('Error ensuring user profile document:', err);
            } finally {
              setLoading(false);
            }
          }, 600);
        }
      }, (err) => {
        console.error('User profile subscription error:', err);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
      }
    };
  }, []);

  const logout = useCallback(async () => {
    if (auth) {
      await signOut(auth);
    }
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isBlocked = profile?.disabled === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isBlocked,
        loading,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
