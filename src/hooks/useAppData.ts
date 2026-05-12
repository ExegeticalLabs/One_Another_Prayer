import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export function useAppData() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [prayers, setPrayers] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [prayerStats, setPrayerStats] = useState<Record<string, any>>({});
  
  const [membership, setMembership] = useState<any>(undefined);
  const [church, setChurch] = useState<any>(undefined);

  // Church logs fetched from Firebase
  const [churchLogs, setChurchLogs] = useState<any[]>([]);
  // Personal logs kept locally
  const [personalLogs, setPersonalLogs] = useState<any[]>([]);
  
  // Bookmarks kept locally
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // Auth Listener + Auto Login
  useEffect(() => {
    let setupStarted = false;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        if (setupStarted) return;
        setupStarted = true;
        // Auto-login anonymously for a seamless "just works" experience
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Auto-login failed. Anonymous auth might be disabled in Firebase console:", e);
          setAuthReady(true);
        }
        return;
      }

      setUser(u);
      
      try {
        const uDocRef = doc(db, 'users', u.uid);
        const uDocSnap = await getDoc(uDocRef);
        
        if (!uDocSnap.exists()) {
          const newProfile = {
            email: u.email || 'guest@example.com',
            displayName: u.displayName || (u.isAnonymous ? 'Guest User' : 'Community Member'),
            role: 'member',
            createdAt: serverTimestamp()
          };
          await setDoc(uDocRef, newProfile);
          setUserProfile(newProfile);
        } else {
          setUserProfile(uDocSnap.data());
        }
      } catch(e) {
        console.error("Error fetching user profile:", e);
      }
      
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Membership & Church listener + Auto Setup
  useEffect(() => {
    if (!user) return;
    
    let unsubChurch = () => {};
    
    // Listen to membership
    const unsubMem = onSnapshot(doc(db, 'memberships', user.uid), async (snap) => {
      if (snap.exists()) {
        const memData = snap.data();
        if (snap.metadata.hasPendingWrites && !memData.joinedAt) return;
        setMembership(memData);
        
        // Listen to church
        unsubChurch = onSnapshot(doc(db, 'churches', memData.churchId), (cSnap) => {
           if (cSnap.exists()) {
             setChurch({ id: cSnap.id, ...cSnap.data() });
           } else {
             setChurch(null);
           }
        }, (err) => console.error(err));
      } else {
        // AUTO-SETUP: If no membership, automatically create a default church and join as Admin
        // This removes the "Join Church" hurdle for experimentation.
        try {
          const defaultChurchId = "main_community";
          const churchRef = doc(db, "churches", defaultChurchId);
          const churchSnap = await getDoc(churchRef);

          if (!churchSnap.exists()) {
            await setDoc(churchRef, {
              name: "One Another Community",
              inviteCode: "EXPERIMENT",
              inviteCodeEnabled: true,
              createdAt: serverTimestamp()
            });
          }

          // Create membership as Admin/Elder so user has full controls
          const myMembership = {
            userId: user.uid,
            churchId: defaultChurchId,
            displayName: userProfile?.displayName || user.displayName || "Experimenter",
            email: userProfile?.email || user.email || "guest@experiment.com",
            role: "admin",
            status: "active",
            joinedAt: serverTimestamp()
          };
          
          await setDoc(doc(db, "memberships", user.uid), myMembership);
          setMembership(myMembership);
        } catch (e) {
          console.error("Auto-setup failed:", e);
          setMembership(null);
          setChurch(null);
        }
      }
    }, (error) => {
      console.error("Membership error:", error);
    });
    
    return () => {
      unsubMem();
      unsubChurch();
    };
  }, [user]);

  // Set up local storage sources
  useEffect(() => {
    if (!user) return;
    try {
      const jStored = localStorage.getItem(`pf_journal_${user.uid}`);
      if (jStored) setJournal(JSON.parse(jStored));
      
      const lStored = localStorage.getItem(`pf_logs_${user.uid}`);
      if (lStored) setPersonalLogs(JSON.parse(lStored));
      
      const bStored = localStorage.getItem(`pf_bookmarks_${user.uid}`);
      if (bStored) setBookmarks(JSON.parse(bStored));
    } catch(e) {
      console.error("Local storage error:", e);
    }
  }, [user]);

  // Firestore Listeners
  useEffect(() => {
    const canFetch = user && church && membership?.status === 'active';

    if (!canFetch) {
      setPrayers([]);
      setChurchLogs([]);
      setMessages([]);
      return;
    }
    
    const unsubPrayers = onSnapshot(
      query(collection(db, `churches/${church.id}/prayers`), orderBy('createdAt', 'desc')),
      (snap) => {
        const p = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrayers(p);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `churches/${church.id}/prayers`)
    );

    const unsubLogs = onSnapshot(
      query(collection(db, `users/${user.uid}/logs`), orderBy('createdAt', 'desc')),
      (snap) => {
        const l = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChurchLogs(l);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/logs`)
    );

    const unsubMessages = onSnapshot(
      query(collection(db, `churches/${church.id}/messages`), where('toId', '==', user.uid)),
      (snap) => {
        const m = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now()) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now()));
        setMessages(m);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `churches/${church.id}/messages`)
    );

    // Listen to private stats
    const unsubsStats: (() => void)[] = [];
    
    prayers.forEach(p => {
      const isElder = membership?.role === 'elder' || membership?.role === 'admin';
      if (p.authorId === user.uid || isElder) {
        const unsub = onSnapshot(
          doc(db, `churches/${church.id}/prayers/${p.id}/internal/stats`),
          (snap) => {
            if (snap.exists()) {
              setPrayerStats(prev => ({ ...prev, [p.id]: snap.data() }));
            }
          },
          (error) => {
            // Silently fail if not authorized (expected for other members)
          }
        );
        unsubsStats.push(unsub);
      }
    });

    return () => {
      unsubPrayers();
      unsubLogs();
      unsubMessages();
      unsubsStats.forEach(u => u());
    };
  }, [user, church, membership, prayers.length]); // Use prayers.length to trigger re-checks for new authored items

  const addJournalEntry = (entry: { category: string, text: string }) => {
    if (!user) return;
    const newEntry = {
      id: crypto.randomUUID(),
      userId: user.uid,
      category: entry.category,
      text: entry.text,
      createdAt: Date.now()
    };
    const updated = [newEntry, ...journal];
    setJournal(updated);
    localStorage.setItem(`pf_journal_${user.uid}`, JSON.stringify(updated));
  };

  const addPersonalLog = (log: { prayerId: string, durationSec: number }) => {
    if (!user) return;
    const newEntry = {
      id: crypto.randomUUID(),
      userId: user.uid,
      prayerId: log.prayerId,
      type: 'personal',
      durationSec: log.durationSec,
      createdAt: Date.now()
    };
    const updated = [newEntry, ...personalLogs];
    setPersonalLogs(updated);
    localStorage.setItem(`pf_logs_${user.uid}`, JSON.stringify(updated));
  };

  const toggleLocalBookmark = (prayerId: string) => {
    if (!user) return;
    const isBookmarked = bookmarks.includes(prayerId);
    const updated = isBookmarked 
      ? bookmarks.filter(id => id !== prayerId)
      : [...bookmarks, prayerId];
    setBookmarks(updated);
    localStorage.setItem(`pf_bookmarks_${user.uid}`, JSON.stringify(updated));
    return !isBookmarked;
  };

  const wipeAllLocalData = () => {
    if (!user) return;
    localStorage.removeItem(`pf_journal_${user.uid}`);
    localStorage.removeItem(`pf_logs_${user.uid}`);
    localStorage.removeItem(`pf_bookmarks_${user.uid}`);
    setJournal([]);
    setPersonalLogs([]);
    setBookmarks([]);
  };

  const prayerLogs = [...churchLogs, ...personalLogs];

  return { 
    user, userProfile, authReady, church, membership, prayers, journal, prayerLogs, bookmarks, messages, prayerStats,
    addJournalEntry, addPersonalLog, toggleLocalBookmark, wipeAllLocalData
  };
}
