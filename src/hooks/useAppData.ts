import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export function useAppData() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [prayers, setPrayers] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  // Church logs fetched from Firebase
  const [churchLogs, setChurchLogs] = useState<any[]>([]);
  // Personal logs kept locally
  const [personalLogs, setPersonalLogs] = useState<any[]>([]);
  
  // Bookmarks kept locally
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const uDocRef = doc(db, 'users', u.uid);
          const uDocSnap = await getDoc(uDocRef);
          
          if (!uDocSnap.exists()) {
            const newProfile = {
              email: u.email || '',
              displayName: u.displayName || 'Unknown',
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
      } else {
        setUserProfile(null);
      }
      
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

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
    if (!user) {
      setPrayers([]);
      setChurchLogs([]);
      setBookmarks([]);
      return;
    }
    
    const unsubPrayers = onSnapshot(
      query(collection(db, 'prayers'), orderBy('createdAt', 'desc')),
      (snap) => {
        const p = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrayers(p);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'prayers')
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
      query(collection(db, `messages`), where('toId', '==', user.uid)),
      (snap) => {
        const m = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now()) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now()));
        setMessages(m);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `messages`)
    );

    return () => {
      unsubPrayers();
      unsubLogs();
      unsubMessages();
    };
  }, [user]);

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

  const prayerLogs = [...churchLogs, ...personalLogs];

  return { 
    user, userProfile, authReady, prayers, journal, prayerLogs, bookmarks, messages,
    addJournalEntry, addPersonalLog, toggleLocalBookmark
  };
}
