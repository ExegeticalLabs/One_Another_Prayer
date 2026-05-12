import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export function useAppData() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [prayers, setPrayers] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [prayerLogs, setPrayerLogs] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!user) {
      setPrayers([]);
      setJournal([]);
      setPrayerLogs([]);
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

    const unsubJournal = onSnapshot(
      query(collection(db, `users/${user.uid}/journal`), orderBy('createdAt', 'desc')),
      (snap) => {
        const j = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJournal(j);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/journal`)
    );

    const unsubLogs = onSnapshot(
      query(collection(db, `users/${user.uid}/logs`), orderBy('createdAt', 'desc')),
      (snap) => {
        const l = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPrayerLogs(l);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/logs`)
    );

    const unsubBookmarks = onSnapshot(
      query(collection(db, `users/${user.uid}/bookmarks`), orderBy('createdAt', 'desc')),
      (snap) => {
        const b = snap.docs.map(doc => doc.data().prayerId);
        setBookmarks(b);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/bookmarks`)
    );

    return () => {
      unsubPrayers();
      unsubJournal();
      unsubLogs();
      unsubBookmarks();
    };
  }, [user]);

  return { user, authReady, prayers, journal, prayerLogs, bookmarks };
}
