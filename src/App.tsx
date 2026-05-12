import React, { useCallback, useMemo, useRef, useState } from "react";
import { 
  Plus, X, Moon, Sun, Home, Briefcase, 
  Users, Book, Wind, ChevronDown, Sparkles, ArrowRight, Bookmark, LogIn, LogOut, Bell
} from "lucide-react";

import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';

import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { useAppData } from './hooks/useAppData';
import { fmtMin, formatTimeAgo, secondsToMinutes, startOfDay, useLS } from './lib/utils';
import { CAT, PROMPTS } from './lib/constants';

import { ClockIcon } from './components/ClockIcon';
import { HoldButton } from './components/HoldButton';
import { Screen } from './components/Screen';
import { CategoryPill } from './components/CategoryPill';
import { FitnessRing } from './components/FitnessRing';
import { Modal } from './components/Modal';
import { AdminPanel } from './components/AdminPanel';
import { triagePrayer } from './services/aiService';

export default function App() {
  const [theme, setTheme] = useLS("pf_theme", "dark");
  const [tab, setTab] = useState("feed");
  
  const { user, userProfile, authReady, church, membership, prayers, journal, prayerLogs, bookmarks, messages, prayerStats, addJournalEntry, addPersonalLog, toggleLocalBookmark, wipeAllLocalData } = useAppData();

  const [goals] = useLS<any>("pf_goals_v9", { church: { mins: 10, count: 5, needs: 3 }, personal: { mins: 5, count: 3 } });

  const [notif, setNotif] = useState<any>(null);
  const notifTimer = useRef<any>(null);

  const [compose, setCompose] = useState<any>(null); 
  const [composeText, setComposeText] = useState("");
  const [composeCat, setComposeCat] = useState("Other");
  const [composeAnon, setComposeAnon] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [isFork, setIsFork] = useState(false);
  
  const [markAnsweredPrompt, setMarkAnsweredPrompt] = useState<any>(null);
  const [answerNote, setAnswerNote] = useState("");
  const [showInbox, setShowInbox] = useState(false);
  const unreadCount = useMemo(() => messages.filter(m => !m.read).length, [messages]);

  const [dash, setDash] = useState(false);
  const [dashPeriod, setDashPeriod] = useState("day");
  const [dashTab, setDashTab] = useState("church");

  const triggerNotif = useCallback((msg: any) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif(msg);
    notifTimer.current = setTimeout(() => setNotif(null), 2200);
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      triggerNotif("Sign in failed. Check if app is in a new tab.");
    }
  };

  const handlePrayerComplete = async (id: any, elapsed: any) => {
    if (!user) return;
    const type = tab === "journal" ? "personal" : "church";
    try {
      if (type === "personal") {
        addPersonalLog({ prayerId: id, durationSec: elapsed });
        triggerNotif(`Recorded · ${elapsed}s`);
      } else {
        await addDoc(collection(db, `users/${user.uid}/logs`), {
          userId: user.uid,
          prayerId: id,
          type,
          durationSec: elapsed,
          createdAt: serverTimestamp()
        });
        
        // Atomically increment the global stats for the prayer in the private sub-collection
        const statsRef = doc(db, `churches/${church.id}/prayers/${id}/internal/stats`);
        try {
          await updateDoc(statsRef, {
            prayCount: increment(1),
            prayTime: increment(elapsed)
          });
        } catch (err) {
          // If doc doesn't exist (older prayers or first prayer), initialize it
          // Rules allow create if active member and prayCount <= 1
          await setDoc(statsRef, {
            churchId: church.id,
            prayCount: 1,
            prayTime: elapsed
          });
        }
        triggerNotif(`Recorded · ${elapsed}s`);
      }
    } catch(e) {
      if (type !== 'personal') {
        handleFirestoreError(e, OperationType.WRITE, 'prayer stats');
      } else {
        console.error(e);
      }
    }
  };

  const toggleBookmark = async (id: any) => {
    if (!user) return;
    try {
      const isBookmarked = toggleLocalBookmark(id);
      if (isBookmarked) {
        triggerNotif("Prayer bookmarked");
      } else {
        triggerNotif("Bookmark removed");
      }
    } catch(e) {
      console.error("Error toggling bookmark:", e);
    }
  };

  const submitCompose = async () => {
    if (!composeText.trim() || !user) return;
    try {
      // 1. Save to Journal (always, unless it's a re-share fork of an existing journal entry)
      if (!isFork) {
        addJournalEntry({ category: composeCat, text: composeText.trim() });
      }

      // 2. Conditionally share with Church Feed
      if (shareToFeed) {
        triggerNotif("Sharing with community...");
        const triage = await triagePrayer(composeText.trim());
        
        const prayerRef = await addDoc(collection(db, `churches/${church.id}/prayers`), {
          churchId: church.id,
          author: composeAnon ? "A Church Member" : user.displayName || "You",
          authorId: user.uid,
          category: triage.suggestedCategory || composeCat,
          text: composeText.trim(),
          createdAt: serverTimestamp(),
          anon: composeAnon,
          answered: false,
          urgency: triage.urgency,
          triageReason: triage.reason
        });
        
        // Initialize private stats
        await setDoc(doc(db, `churches/${church.id}/prayers/${prayerRef.id}/internal/stats`), {
          churchId: church.id,
          prayCount: 0,
          prayTime: 0
        });

        triggerNotif(isFork ? "Shared with Church" : "Saved & Shared with Church");
      } else {
        triggerNotif("Saved to Private Journal");
      }
      
      setCompose(null);
      setComposeText("");
      setIsFork(false);
      setShareToFeed(false);
    } catch (e) {
      if (shareToFeed) {
        handleFirestoreError(e, OperationType.CREATE, 'prayers');
      } else {
        console.error(e);
      }
    }
  };

  const openCompose = (mode: any, category: any, prefill = "", fork = false) => {
    setCompose(mode);
    setComposeText(prefill);
    setComposeCat(category || "Other");
    setComposeAnon(false);
    setShareToFeed(mode === "feed"); // Default share to true if explicitly sharing (like the "Share" button on a journal entry)
    setIsFork(fork);
  };

  const markPrayerAnswered = async () => {
    if (!markAnsweredPrompt || !user) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `churches/${church.id}/prayers`, markAnsweredPrompt.id), {
        answered: true,
        answerNote: answerNote.trim() || ""
      });
      triggerNotif("Prayer marked as answered!");
      setMarkAnsweredPrompt(null);
      setAnswerNote("");
    } catch(e) {
       handleFirestoreError(e, OperationType.WRITE, 'prayers');
    }
  };

  const getPrivateStats = (prayer: any) => {
    const stats = prayerStats[prayer.id] || { prayCount: 0, prayTime: 0 };
    const totalSec = stats.prayTime || 0;
    const count = stats.prayCount || 0;
    return { time: fmtMin(secondsToMinutes(totalSec)), count };
  };

  const markMessageRead = async (id: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, `churches/${church.id}/messages`, id), { read: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `churches/${church.id}/messages`);
    }
  };

  const feed = useMemo(() => {
    const active = prayers.filter((p) => {
      if (p.answered || p.status === 'hidden') return false;
      const t = p.createdAt?.toMillis ? p.createdAt.toMillis() : (p.createdAt || Date.now());
      return (Date.now() - t) < 7 * 86400000;
    });

    // Balanced Rotation Logic:
    // We prioritize items the user has NOT prayed for today.
    // Within those, we use a balanced mix of urgency and freshness.
    
    const userPrayedIds = new Set(
      prayerLogs
        .filter(l => (Date.now() - (l.createdAt?.toMillis || 0)) < 24 * 3600000)
        .map(l => l.prayerId)
    );

    return active.sort((a, b) => {
      // Primary: Personal attention (things I haven't prayed for today)
      const aPrayed = userPrayedIds.has(a.id);
      const bPrayed = userPrayedIds.has(b.id);
      if (aPrayed !== bPrayed) return aPrayed ? 1 : -1;

      // Secondary: Weighted urgency and age score
      const uMap: Record<string, number> = { 'URGENT': 2, 'ELEVATED': 1, 'STANDARD': 0 };
      const aScore = (uMap[a.urgency] ?? 0) * 1000000 + (a.createdAt?.toMillis || 0);
      const bScore = (uMap[b.urgency] ?? 0) * 1000000 + (b.createdAt?.toMillis || 0);
      
      return bScore - aScore;
    });
  }, [prayers, prayerLogs]);
  
  const wall = useMemo(() => prayers.filter((p) => {
    if (p.status === 'hidden') return false;
    if (p.answered) return true;
    const t = p.createdAt?.toMillis ? p.createdAt.toMillis() : (p.createdAt || Date.now());
    return (Date.now() - t) >= 7 * 86400000;
  }), [prayers]);
  const bookmarksList = useMemo(() => {
    const allItems = [...prayers, ...journal];
    return allItems.filter(item => bookmarks.includes(item.id));
  }, [prayers, journal, bookmarks]);

  const aggregates = useMemo(() => {
    const now = Date.now();
    const DAY_MS = 86400000;
    
    let cutOff: number = 0;
    let multiplier = 1;

    if (dashPeriod === 'day') { cutOff = startOfDay(now); multiplier = 1; }
    else if (dashPeriod === 'week') { cutOff = startOfDay(now - 7 * DAY_MS); multiplier = 7; }
    else { cutOff = startOfDay(now - 365 * DAY_MS); multiplier = 365; }

    const filteredLogs = prayerLogs.filter(l => {
      const t = l.createdAt?.toMillis ? l.createdAt.toMillis() : Date.now();
      return t >= cutOff;
    });
    
    const churchLogs = filteredLogs.filter(l => l.type === 'church');
    const personalLogs = filteredLogs.filter(l => l.type === 'personal');
    const churchUnique = new Set(churchLogs.map(l => l.prayerId)).size;

    return {
      church: {
        prayers: churchLogs.length,
        time: secondsToMinutes(churchLogs.reduce((a, c) => a + (c.durationSec || 0), 0)),
        needs: churchUnique
      },
      personal: {
        prayers: personalLogs.length,
        time: secondsToMinutes(personalLogs.reduce((a, c) => a + (c.durationSec || 0), 0)),
      },
      multiplier 
    };
  }, [prayerLogs, dashPeriod]);

  const currentPrompt = useMemo(() => {
    if (compose !== "journal") return null;
    return PROMPTS.find(p => p.q === composeCat);
  }, [compose, composeCat]);

  if (!authReady) {
    return <div className="app" data-theme={theme} style={{display:'flex', alignItems:'center', justifyContent:'center', color: 'var(--text)', background: theme === 'dark' ? '#0d1117' : '#f7fbff'}}>
      <div style={{ textAlign: 'center' }}>
        <Wind className="animate-pulse" size={48} color="var(--gold)" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6 }}>Initializing...</div>
      </div>
    </div>;
  }

  if (user === null) {
    return (
      <div className="app" data-theme={theme} style={{display:'flex', alignItems:'center', justifyContent:'center', color: 'var(--text)', background: theme === 'dark' ? '#0d1117' : '#f7fbff', flexDirection: 'column', padding: 20, textAlign: 'center', height: '100svh'}}>
        <Wind size={48} color="var(--gold)" style={{marginBottom: 24}} />
        <h1 style={{fontSize: 24, fontWeight: 900, marginBottom: 8}}>One Another</h1>
        <p style={{fontSize: 16, marginBottom: 32, opacity: 0.8, maxWidth: 300}}>Experiment session could not start automatically. Would you like to sign in?</p>
        <button 
          onClick={handleLogin}
          style={{ padding: '14px 28px', background: 'var(--gold)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display:'flex', alignItems:'center', gap: 8 }}
        >
          <LogIn size={18} /> Sign in to start
        </button>
        <div style={{ marginTop: 24, fontSize: 12, opacity: 0.5, maxWidth: 240 }}>
           Tip: If sign-in pops up and closes, try opening the app in a new tab using the ↗️ icon.
        </div>
      </div>
    );
  }

  if (membership === undefined) {
    return <div className="app" data-theme={theme} style={{display:'flex', alignItems:'center', justifyContent:'center', color: 'var(--text)', background: theme === 'dark' ? '#0d1117' : '#f7fbff'}}>
      <div style={{ textAlign: 'center' }}>
        <Wind className="animate-pulse" size={48} color="var(--gold)" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 }}>Preparing Community...</div>
      </div>
    </div>;
  }

  return (
    <div className="app" data-theme={theme}>
      <style>{`
        :root{
          --serif: 'Cormorant Garamond', serif;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --goldLighter: rgba(247, 232, 195, 0.4);
        }
        .app{ height:100svh; max-width:520px; margin:0 auto; position:relative; overflow:hidden; font-family:var(--sans); background: var(--bg); transition: background 1.5s ease; }
        .app[data-theme="dark"]{
          --bg: linear-gradient(160deg, #0d1117 0%, #131a24 40%, #0d1117 100%);
          --card: rgba(255,255,255,0.06);
          --mutedCard: rgba(255,255,255,0.10);
          --border: rgba(255,255,255,0.10);
          --text: rgba(255,255,255,0.92);
          --dim: rgba(255,255,255,0.60);
          --faint: rgba(255,255,255,0.30);
          --gold: #c8b48c;
          --goldSoft: rgba(200,180,140,0.15);
          --shadow: rgba(0,0,0,0.55);
          --overlay: rgba(0,0,0,0.85);
          --headerFade: linear-gradient(180deg, rgba(13,17,23,1) 0%, rgba(13,17,23,0.85) 60%, rgba(13,17,23,0) 100%);
        }
        .app[data-theme="light"]{
          --bg: linear-gradient(180deg, #f7fbff 0%, #eef7ff 40%, #f8fffd 100%);
          --card: rgba(255,255,255,0.92);
          --mutedCard: rgba(10,30,45,0.08);
          --border: rgba(20,40,60,0.08);
          --text: rgba(10,30,45,0.92);
          --dim: rgba(10,30,45,0.65);
          --faint: rgba(10,30,45,0.35);
          --gold: #2f7bbd;
          --goldSoft: rgba(47,123,189,0.12);
          --shadow: rgba(10,30,45,0.18);
          --overlay: rgba(10,30,45,0.22);
          --headerFade: linear-gradient(180deg, rgba(248,252,255,1) 0%, rgba(248,252,255,0.85) 60%, rgba(248,252,255,0) 100%);
        }
        *{ box-sizing:border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar{ display:none; }

        .header{ position:absolute; top:0; left:0; right:0; z-index:100; padding:20px 20px 10px; background:var(--headerFade); }
        .titleRow{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .brandWrap{ flex: 1; min-width: 0; }
        .h1{ margin:0; font-family:var(--sans); font-size:20px; font-weight:900; color:var(--text); letter-spacing:-0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub{ font-family:var(--serif); color:var(--gold); font-size:11px; font-weight: 600; font-style: italic; letter-spacing: 0.5px;}
        .hdrBtns{ display:flex; gap:6px; align-items:center; flex-shrink: 0; }
        
        .ghostBtn{ background:var(--card); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:6px 12px; cursor:pointer; font-family:var(--sans); font-weight: 700; font-size: 10px; box-shadow:0 4px 12px var(--shadow); backdrop-filter: blur(12px); display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
        
        .tabs{ display:flex; margin-top:14px; gap: 4px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
        .tab{ flex:1; background:none; border:none; cursor:pointer; padding:10px 0; font-family:var(--sans); font-weight:800; letter-spacing:0.5px; color:var(--faint); border-bottom:2px solid transparent; text-transform: uppercase; font-size: 10px; white-space: nowrap; }
        .tab.active{ color:var(--text); border-bottom-color:var(--gold); }

        .notif{ position:absolute; top:120px; left:50%; transform:translateX(-50%); z-index:120; padding:10px 18px; border-radius:12px; background: var(--gold); color: #fff; font-family:var(--sans); font-weight:800; font-size: 11px; text-transform: uppercase; box-shadow:0 20px 40px var(--shadow); max-width:90%; white-space:nowrap; pointer-events: none; }

        .content{ position:absolute; inset:0; padding-top:124px; padding-bottom: calc(40px + env(safe-area-inset-bottom)); }
        
        .snap{ height: 100%; overflow-y: scroll; scroll-snap-type: y mandatory; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; user-select: none; }
        .admin-scroll { height: 100%; overflow-y: auto; }
        
        .screen{ height: 100%; width: 100%; scroll-snap-align: start; scroll-snap-stop: always; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px 20px; position: relative; overflow: hidden; background: var(--bg); transition: background 0.3s ease; }
        
        .topRow{ position:absolute; top:15px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:center; }
        .day{ font-size:10px; font-weight:900; letter-spacing:1.5px; color:var(--faint); font-family:var(--sans); text-transform: uppercase; }

        .pill{ display:inline-flex; align-items:center; justify-content: center; gap:8px; padding:6px 14px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px; backdrop-filter: blur(10px); box-shadow: 0 4px 12px var(--shadow); }
        .dot{ width:6px; height:6px; border-radius:50%; }
        .pillText{ font-size:10px; font-weight:900; letter-spacing:1px; text-transform:uppercase; font-family:var(--sans); }

        .textWrap{ width:100%; max-width:440px; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow-y:auto; padding: 10px 4px; text-align: center; }
        .prayText{ margin:0; font-family:var(--serif); font-size:24px; line-height:1.5; color:var(--text); font-weight: 300; }
        .meta{ margin-top:8px; text-align:center; font-family:var(--sans); font-size:11px; color:var(--faint); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

        .authorRow{ display:flex; align-items:center; gap:12px; margin-top:12px; margin-bottom:12px; }
        .avatar{ width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-family:var(--sans); color: #fff; font-size: 14px; box-shadow: 0 6px 12px var(--shadow); }
        .authorText{ font-family:var(--sans); color:var(--dim); font-size:13px; font-weight: 700; }

        .privateStats { display: flex; gap: 14px; margin-top: 10px; padding: 8px 16px; background: var(--mutedCard); border-radius: 99px; border: 1px solid var(--border); animation: fadeIn 1s ease; }
        .pStatItem { font-family: var(--sans); font-size: 11px; font-weight: 800; color: var(--gold); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 4px; }

        .actions{ width:100%; display:flex; flex-direction: column; justify-content:flex-end; align-items:center; z-index: 10; padding-bottom: 20px; }
        .bridgeLink { background: none; border: none; margin-top: 14px; color: var(--faint); font-family: var(--sans); font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .bookmarkBtn { background: none; border: none; color: var(--dim); padding: 10px; margin-top: 8px; cursor: pointer; transition: color 0.2s; }
        .bookmarkBtn.active { color: var(--gold); fill: var(--gold); }

        .scrollHint{ position:absolute; bottom:10px; left:50%; transform:translateX(-50%); color:var(--gold); animation:bob 2s ease-in-out infinite; pointer-events:none; }

        .holdWrap{ position:relative; height:140px; width: 140px; display:flex; align-items:center; justify-content:center; flex-direction:column; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        .ripple { position: absolute; top: 50%; left: 50%; border-radius: 50%; border: 1px solid var(--gold); transform: translate(-50%, -50%) scale(1); opacity: 0; pointer-events: none; }
        .ripple.active.r1 { animation: rippleEffect 2s linear infinite; width: 100px; height: 100px; }
        .ripple.active.r2 { animation: rippleEffect 2s linear 0.6s infinite; width: 100px; height: 100px; }
        .ripple.active.r3 { animation: rippleEffect 2s linear 1.2s infinite; width: 100px; height: 100px; }

        .holdBtn{ width:88px; height:88px; border-radius:50%; border:1px solid var(--border); background: var(--card); cursor:pointer; box-shadow:0 12px 32px var(--shadow); color:var(--text); font-family:var(--sans); font-weight: 900; text-transform: uppercase; font-size:12px; letter-spacing: 1px; touch-action: none; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); z-index: 2; position: relative; display: flex; align-items: center; justify-content: center; }
        .holdBtn.active{ background: var(--gold); border-color: rgba(255,255,255,0.2); color: #fff; transform: scale(1.5); box-shadow: 0 0 50px var(--goldSoft); }
        .holdTime{ font-size:26px; font-weight:300; pointer-events: none; letter-spacing: -1px; line-height: 1; }
        .prayingText{ position: absolute; bottom: 0; font-family:var(--serif); font-style:italic; color:var(--gold); font-size:13px; animation:fadeIn 1000ms ease; }

        .fab{ position:absolute; bottom: calc(20px + env(safe-area-inset-bottom)); right:20px; width:56px; height:56px; border-radius:20px; background: var(--gold); color: #fff; display: flex; align-items: center; justify-content: center; cursor:pointer; z-index:100; box-shadow:0 12px 30px var(--shadow); border: none; }

        .modal{ position:fixed; inset:0; z-index:200; background:var(--overlay); backdrop-filter: blur(12px); display:flex; align-items:flex-end; justify-content:center; padding:14px; }
        .sheet{ width:100%; max-width:500px; background: var(--bg); border:1px solid var(--border); border-radius:32px; box-shadow:0 30px 100px var(--shadow); overflow:hidden; display: flex; flex-direction: column; max-height: 90vh; }
        .sheetHead{ padding:24px 24px 14px; display:flex; justify-content:space-between; align-items:center; cursor: grab; }
        .sheetHead:active { cursor: grabbing; }
        .sheetTitle{ margin:0; font-family:var(--sans); font-size:20px; color:var(--text); font-weight:900; letter-spacing: -0.5px; }
        .sheetBody{ padding: 0 24px 24px; overflow-y: auto; }
        
        .dashGrid{ display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-top:14px; }
        .stat{ padding:16px; border-radius:20px; border:1px solid var(--border); background: var(--card); box-shadow:0 10px 24px var(--shadow); }
        .statLabel{ font-family:var(--sans); font-size:9px; letter-spacing:1px; font-weight:900; color:var(--faint); text-transform:uppercase; }
        .statVal{ margin-top:8px; font-family:var(--sans); font-size:24px; font-weight:900; color:var(--text); letter-spacing: -1px; }

        .promptList { margin-bottom: 20px; padding: 14px; background: var(--mutedCard); border-radius: 18px; border: 1px solid var(--border); }
        .promptItem { color: var(--dim); font-family: var(--serif); font-size: 15px; margin-bottom: 8px; line-height: 1.4; display: flex; gap: 10px; }
        .promptBullet { color: var(--gold); font-weight: 900; }
        .ta{ width:100%; min-height:140px; resize:none; border-radius:20px; border:1px solid var(--border); background: var(--mutedCard); color:var(--text); font-family:var(--serif); font-size:19px; padding:18px; outline:none; line-height: 1.5; }
        .primary{ width:100%; border:none; border-radius:20px; padding:18px; cursor:pointer; font-family:var(--sans); font-weight:900; letter-spacing:1px; text-transform: uppercase; background: var(--gold); color: #fff; box-shadow: 0 12px 24px var(--goldSoft); transition: transform 0.2s; }
        .promptGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 100%; max-width: 440px; margin: 0 auto; }
        .promptCard { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; cursor: pointer; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 8px 24px var(--shadow); }
        .pIcon { color: var(--gold); margin-bottom: 8px; }
        .pText { font-family: var(--sans); font-weight: 900; font-size: 14px; color: var(--text); text-transform: uppercase; }
        .pDesc { font-family: var(--serif); font-size: 13px; color: var(--dim); margin-top: 4px; }
        
        .dashToggle { display: flex; background: var(--mutedCard); border-radius: 12px; padding: 4px; margin-bottom: 20px; }
        .dashToggleBtn { flex: 1; border: none; background: transparent; padding: 8px; border-radius: 8px; color: var(--faint); font-family: var(--sans); font-weight: 800; font-size: 11px; cursor: pointer; transition: all 0.2s; }
        .dashToggleBtn.active { background: var(--card); color: var(--text); box-shadow: 0 4px 10px var(--shadow); }
        .heroRingSection { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0; animation: fadeIn 0.5s ease; }
        .ringWrap { position: relative; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; flex-direction: column; }

        .forkNote { margin-bottom: 12px; font-size: 13px; color: var(--faint); font-style: italic; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
        .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--dim); font-size: 11px; text-transform: uppercase; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .chip.on { background: var(--gold); color: white; border-color: var(--gold); }
        .check { display: flex; align-items: center; gap: 8px; margin: 12px 0 20px; font-size: 13px; color: var(--dim); cursor: pointer; }

        @keyframes focusBreath { 0%, 100% { transform: scale(1.5); } 50% { transform: scale(1.4); } }
        @keyframes fadeIn{ from{ opacity:0; transform:translateY(12px);} to{opacity:1; transform:translateY(0);} }
        @keyframes bob{ 0%,100% { transform:translateX(-50%) translateY(0);} 50% { transform:translateX(-50%) translateY(8px);} }
        @keyframes rippleEffect { 0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(3); opacity: 0; } }
      `}</style>
      <header className="header">
        <div className="titleRow">
          <div className="brandWrap">
            <h1 className="h1">{church?.name || "One Another"}</h1>
            <div className="sub">{membership?.role === 'elder' || membership?.role === 'admin' ? "Leadership Access" : "Member Community"}</div>
          </div>
          <div className="hdrBtns">
            <button className="ghostBtn" onClick={() => setShowInbox(true)} style={{ position: 'relative' }}>
              <Bell size={14} /> 
              {unreadCount > 0 && <div style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, background: '#e06060', borderRadius: '50%' }} />}
            </button>
            <button className="ghostBtn" onClick={() => setDash(true)}>
              <ClockIcon size={14} /> My Prayer Life
            </button>
            <button 
              className="ghostBtn" 
              onClick={async (e) => {
                const btn = e.currentTarget;
                if (btn.innerText === "Leave") {
                  btn.innerText = "Sure?";
                  setTimeout(() => { if (btn) btn.innerText = "Leave"; }, 3000);
                  return;
                }
                btn.innerText = "Leaving...";
                try {
                  await deleteDoc(doc(db, "memberships", user.uid));
                  triggerNotif("Left the church.");
                } catch (err: any) {
                  console.error(err);
                  btn.innerText = "Error";
                  setTimeout(() => { if (btn) btn.innerText = "Leave"; }, 3000);
                }
              }} 
              style={{ color: '#e06060' }}
            >
              Leave
            </button>
            <button className="ghostBtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button className="ghostBtn" onClick={() => signOut(auth)}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
        <nav className="tabs">
          <button className={`tab ${tab === "feed" ? "active" : ""}`} onClick={() => setTab("feed")}>Prayers</button>
          <button className={`tab ${tab === "journal" ? "active" : ""}`} onClick={() => setTab("journal")}>Journal</button>
          <button className={`tab ${tab === "wall" ? "active" : ""}`} onClick={() => setTab("wall")}>Answered</button>
          <button className={`tab ${tab === "bookmarks" ? "active" : ""}`} onClick={() => setTab("bookmarks")}>Bookmarks</button>
          {(membership?.role === "admin" || membership?.role === "elder") && (
            <button className={`tab ${tab === "admin" ? "active" : ""}`} onClick={() => setTab("admin")} style={{ color: tab === "admin" ? 'var(--gold)' : undefined }}>Elder</button>
          )}
        </nav>
      </header>

      {notif && <div className="notif">{notif}</div>}

      <main className="content">
        <div className={tab === "admin" ? "admin-scroll" : "snap"}>
          {tab === "admin" ? (
             <AdminPanel prayers={prayers} currentUserId={user.uid} currentUserName={user.displayName || "Admin"} churchId={church.id} prayerStats={prayerStats} />
          ) : tab === "feed" ? (
            feed.length ? (
              feed.map((p, i) => (
                <Screen key={p.id}>
                  <div className="topRow">
                    <div className="day">NEED {i + 1} OF {feed.length}</div>
                  </div>
                  
                  <div className="textWrap">
                    <CategoryPill category={p.category} />
                    <p className="prayText">{p.text}</p>
                    <div className="authorRow">
                      <div className="avatar" style={{ background: `linear-gradient(135deg, ${CAT[p.category] || CAT.Other}cc, ${CAT[p.category] || CAT.Other})` }}>
                        {p.anon ? "?" : (p.author || "U")[0]}
                      </div>
                      <div className="authorText">{p.author} · {formatTimeAgo(p.createdAt?.toMillis ? p.createdAt.toMillis() : Date.now())}</div>
                    </div>

                    {p.authorId === user?.uid && (
                      <div className="privateStats" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div className="pStatItem"><ClockIcon size={12} /> {getPrivateStats(p).time} Total</div>
                          <div className="pStatItem"><Users size={12} /> {getPrivateStats(p).count} Prayed</div>
                        </div>
                        <button 
                          className="ghostBtn" 
                          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 11, alignSelf: 'flex-start', color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase' }}
                          onClick={() => setMarkAnsweredPrompt(p)}
                        >
                          Mark Answered
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="actions">
                    <HoldButton onComplete={(elapsed: any) => handlePrayerComplete(p.id, elapsed)} />
                    <button className={`bookmarkBtn ${bookmarks.includes(p.id) ? 'active' : ''}`} onClick={() => toggleBookmark(p.id)}>
                       <Bookmark size={20} fill={bookmarks.includes(p.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  {i < feed.length - 1 && <div className="scrollHint"><ChevronDown size={18} /></div>}
                </Screen>
              ))
            ) : (
              <Screen>
                <Wind size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                <div className="prayText" style={{ fontSize: 20 }}>A quiet moment in the feed.</div>
              </Screen>
            )
          ) : tab === "journal" ? (
            <>
              {journal.map((e) => (
                <Screen key={e.id}>
                  <div className="topRow"><div className="day">JOURNAL</div></div>
                  <div className="textWrap">
                    <CategoryPill category={e.category} />
                    <p className="prayText" style={{ fontStyle: 'italic' }}>{e.text}</p>
                    <div className="meta">{formatTimeAgo(e.createdAt?.toMillis ? e.createdAt.toMillis() : Date.now())}</div>
                  </div>
                  <div className="actions">
                    <HoldButton onComplete={(elapsed: any) => handlePrayerComplete(e.id, elapsed)} />
                    <button className="bridgeLink" onClick={() => openCompose("feed", e.category, e.text, true)}>
                      Share with church <ArrowRight size={14} />
                    </button>
                    <button className={`bookmarkBtn ${bookmarks.includes(e.id) ? 'active' : ''}`} onClick={() => toggleBookmark(e.id)}>
                       <Bookmark size={20} fill={bookmarks.includes(e.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </Screen>
              ))}
              <Screen>
                <div className="day" style={{ marginBottom: 24 }}>REFLECT</div>
                <div className="promptGrid">
                  {PROMPTS.map((p, i) => (
                    <div key={i} className="promptCard" onClick={() => openCompose("journal", p.q)}>
                      <div className="pIcon">{p.icon}</div>
                      <div className="pText">{p.q}</div>
                      <div className="pDesc">{p.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 40, fontSize: 11, color: 'var(--faint)', textAlign: 'center', maxWidth: 280, fontStyle: 'italic' }}>
                   Journal entries are stored locally on this device/browser and are not sent to the server.
                </div>
              </Screen>
            </>
          ) : tab === "bookmarks" ? (
              bookmarksList.length > 0 ? (
                  bookmarksList.map((item, i) => (
                      <Screen key={item.id}>
                          <div className="topRow">
                              <div className="day">BOOKMARK {i + 1} OF {bookmarksList.length}</div>
                          </div>
                          
                          <div className="textWrap">
                              <CategoryPill category={item.category} />
                              <p className="prayText">{item.text}</p>
                           </div>

                          <div className="actions">
                              <HoldButton onComplete={(elapsed: any) => handlePrayerComplete(item.id, elapsed)} />
                              <button className={`bookmarkBtn active`} onClick={() => toggleBookmark(item.id)}>
                                  <Bookmark size={20} fill="currentColor" />
                              </button>
                          </div>
                          {i < bookmarksList.length - 1 && <div className="scrollHint"><ChevronDown size={18} /></div>}
                      </Screen>
                  ))
              ) : (
                  <Screen>
                      <Bookmark size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                      <div className="prayText" style={{ fontSize: 20 }}>No bookmarks yet.</div>
                      <div className="meta">Save prayers to find them here.</div>
                  </Screen>
              )
          ) : (
            wall.length > 0 ? (
              wall.map((p, i) => (
                <Screen key={p.id}>
                  <div className="topRow">
                    <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: p.answered ? 'var(--gold)' : 'var(--faint)' }}>
                      {p.answered ? <><Sparkles size={12} /> ANSWERED</> : <><Wind size={12} /> CONTINUED INTERCESSION</>}
                    </div>
                  </div>
                  <div className="textWrap">
                    <CategoryPill category={p.category} />
                    <p className="prayText">{p.text}</p>
                    {p.answerNote && <div className="meta" style={{ marginTop: 12, padding: 12, background: 'var(--mutedCard)', borderRadius: 8, color: 'var(--text)', fontStyle: 'italic' }}>"{p.answerNote}"</div>}
                    <div className="authorRow">
                      <div className="avatar" style={{ background: `linear-gradient(135deg, ${CAT[p.category] || CAT.Other}cc, ${CAT[p.category] || CAT.Other})` }}>
                        {p.anon ? "?" : (p.author || "U")[0]}
                      </div>
                      <div className="authorText">{p.author} · {p.answered ? "Answered" : "Active"}</div>
                    </div>

                    {p.authorId === user?.uid && !p.answered && (
                      <div className="privateStats" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <div className="pStatItem"><ClockIcon size={12} /> {getPrivateStats(p).time} Total</div>
                          <div className="pStatItem"><Users size={12} /> {getPrivateStats(p).count} Prayed</div>
                        </div>
                        <button 
                          className="ghostBtn" 
                          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 11, alignSelf: 'flex-start', color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase' }}
                          onClick={() => setMarkAnsweredPrompt(p)}
                        >
                          Mark Answered
                        </button>
                      </div>
                    )}
                  </div>
                  {!p.answered && (
                    <div className="actions">
                      <HoldButton onComplete={(elapsed: any) => handlePrayerComplete(p.id, elapsed)} />
                      <button className={`bookmarkBtn ${bookmarks.includes(p.id) ? 'active' : ''}`} onClick={() => toggleBookmark(p.id)}>
                        <Bookmark size={20} fill={bookmarks.includes(p.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  )}
                </Screen>
              ))
            ) : (
              <Screen>
                <Sparkles size={48} color="var(--gold)" style={{ marginBottom: 16 }} />
                <div className="prayText" style={{ fontSize: 20 }}>No answers recorded yet.</div>
              </Screen>
            )
          )}
        </div>
      </main>

      <button className="fab" onClick={() => openCompose("journal", "Other")}><Plus size={28} /></button>

      {/* Compose Modal */}
      {compose && (
        <Modal onClose={() => { setCompose(null); setIsFork(false); }}>
          <div className="sheetHead">
            <h3 className="sheetTitle">
              {isFork ? "Share with Your Church" : "New Prayer Note"}
            </h3>
            <button className="ghostBtn" onClick={() => { setCompose(null); setIsFork(false); }}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            {isFork && (
              <div className="forkNote">
                Edit this before sharing. Your original journal entry stays private.
              </div>
            )}

            {compose === "journal" && currentPrompt && (
              <div className="promptList">
                {currentPrompt.bullets.map((bullet, idx) => (
                  <div key={idx} className="promptItem">
                    <span className="promptBullet">•</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            <textarea 
              className="ta" 
              value={composeText} 
              onChange={(e) => setComposeText(e.target.value)} 
              placeholder={compose === "journal" ? "Reflect here..." : "What do you need prayer for?"} 
              autoFocus 
            />
            
            {(!currentPrompt || isFork) && (
              <div className="row">
                {Object.keys(CAT).filter(c => c !== "Other").map(c => (
                  <button key={c} className={`chip ${composeCat === c ? 'on' : ''}`} onClick={() => setComposeCat(c)}>{c}</button>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: 20, padding: 16, background: shareToFeed ? 'var(--goldSoft)' : 'var(--mutedCard)', borderRadius: 20, border: '1px solid var(--border)', transition: 'all 0.3s ease' }}>
              <label className="check" style={{ marginBottom: shareToFeed ? 12 : 0, transition: 'all 0.2s' }}>
                <input type="checkbox" checked={shareToFeed} onChange={() => setShareToFeed(!shareToFeed)} style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14 }}>Share with Church Community</span>
                  <span style={{ fontSize: 11, color: 'var(--dim)' }}>Let others in the feed pray over this need.</span>
                </div>
              </label>

              {shareToFeed && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12, animation: 'fadeIn 0.3s ease' }}>
                  <label className="check" style={{ marginBottom: 0 }}>
                    <input type="checkbox" checked={composeAnon} onChange={() => setComposeAnon(!composeAnon)} style={{ accentColor: 'var(--gold)' }} />
                    <span style={{ fontSize: 13, color: 'var(--dim)' }}>Post anonymously</span>
                  </label>
                </div>
              )}
            </div>
            
            <button className="primary" style={{ marginTop: 24 }} disabled={!composeText.trim()} onClick={submitCompose}>
              {isFork ? "Share Request" : (shareToFeed ? "Save & Share" : "Save to Journal")}
            </button>
          </div>
        </Modal>
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <Modal onClose={() => setShowInbox(false)}>
          <div className="sheetHead">
            <h3 className="sheetTitle">Pastoral Inbox</h3>
            <button className="ghostBtn" onClick={() => setShowInbox(false)}><X size={18}/></button>
          </div>
          <div className="sheetBody" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
            {messages.length === 0 ? (
               <div style={{ color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>No messages.</div>
            ) : (
               messages.map(m => (
                 <div key={m.id} style={{ 
                   background: m.read ? 'var(--card)' : 'var(--mutedCard)', 
                   border: m.read ? '1px solid var(--border)' : '1px solid var(--gold)',
                   padding: 16, 
                   borderRadius: 16, 
                   marginBottom: 12 
                 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                     <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>From {m.fromName}</div>
                     <div style={{ fontSize: 11, color: 'var(--faint)' }}>{formatTimeAgo(m.createdAt?.toMillis ? m.createdAt.toMillis() : Date.now())}</div>
                   </div>
                   <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--text)', lineHeight: 1.4 }}>{m.text}</p>
                   {!m.read && (
                     <button onClick={() => markMessageRead(m.id)} className="ghostBtn" style={{ marginTop: 12 }}>
                       Mark Read
                     </button>
                   )}
                 </div>
               ))
            )}
          </div>
        </Modal>
      )}

      {/* Answered Modal */}
      {markAnsweredPrompt && (
        <Modal onClose={() => { setMarkAnsweredPrompt(null); setAnswerNote(""); }}>
          <div className="sheetHead">
            <h3 className="sheetTitle">Prayer Answered</h3>
            <button className="ghostBtn" onClick={() => { setMarkAnsweredPrompt(null); setAnswerNote(""); }}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            <div className="forkNote" style={{ marginBottom: 16 }}>
               Praise God! You can optionally share a note about how this prayer was answered. It will be moved to the Answered Wall.
            </div>

            <textarea 
              className="ta" 
              value={answerNote} 
              onChange={e => setAnswerNote(e.target.value)}
              placeholder="Optional: How was it answered?"
              autoFocus
              style={{ minHeight: 120 }}
            />
            
            <button className="primary" onClick={markPrayerAnswered}>
              Move to Answered Wall
            </button>
          </div>
        </Modal>
      )}

      {/* Dashboard with Hero Rings */}
      {dash && (
        <Modal center onClose={() => setDash(false)}>
          <div className="sheetHead">
            <div><h3 className="sheetTitle">My Prayer Life</h3><div style={{ fontSize: 10, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Only you can see this</div></div>
            <button className="ghostBtn" onClick={() => setDash(false)}><X size={18}/></button>
          </div>
          <div className="sheetBody">
            <div className="dashToggle">
              {['day', 'week', 'year'].map(p => (
                <button key={p} className={`dashToggleBtn ${dashPeriod === p ? 'active' : ''}`} onClick={() => setDashPeriod(p)}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="dashToggle" style={{ marginTop: 0 }}>
               <button className={`dashToggleBtn ${dashTab === 'church' ? 'active' : ''}`} onClick={() => setDashTab('church')}>CHURCH</button>
               <button className={`dashToggleBtn ${dashTab === 'personal' ? 'active' : ''}`} onClick={() => setDashTab('personal')}>PERSONAL</button>
            </div>

            <div className="heroRingSection">
              {dashTab === 'church' ? (
                 <div className="ringWrap">
                    <svg width="200" height="200">
                      <FitnessRing size={200} stroke={16} index={0} percentage={(aggregates.church.prayers / (goals.church.count * aggregates.multiplier)) * 100} color="#e06060" />
                      <FitnessRing size={200} stroke={16} index={1} percentage={(aggregates.church.time / (goals.church.mins * aggregates.multiplier)) * 100} color="#5b8db8" />
                      <FitnessRing size={200} stroke={16} index={2} percentage={(aggregates.church.needs / (goals.church.needs * aggregates.multiplier)) * 100} color="#2ea97a" />
                    </svg>
                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                       <div className="statVal" style={{fontSize: 32}}>{fmtMin(aggregates.church.time)}</div>
                       <div className="statLabel">Time in Prayer</div>
                    </div>
                 </div>
              ) : (
                 <div className="ringWrap">
                    <svg width="200" height="200">
                      <FitnessRing size={200} stroke={16} index={0} percentage={(aggregates.personal.prayers / (goals.personal.count * aggregates.multiplier)) * 100} color="#c9a227" />
                      <FitnessRing size={200} stroke={16} index={1} percentage={(aggregates.personal.time / (goals.personal.mins * aggregates.multiplier)) * 100} color="#8b6caf" />
                    </svg>
                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                       <div className="statVal" style={{fontSize: 32}}>{fmtMin(aggregates.personal.time)}</div>
                       <div className="statLabel">Time in Journal</div>
                    </div>
                 </div>
              )}
            </div>

            <div className="dashGrid" style={{ marginTop: 20 }}>
               {dashTab === 'church' ? (
                 <>
                   <div className="stat"><div className="statLabel">Prayers</div><div className="statVal">{aggregates.church.prayers}</div></div>
                   <div className="stat"><div className="statLabel">Needs Covered</div><div className="statVal">{aggregates.church.needs}</div></div>
                 </>
               ) : (
                 <>
                   <div className="stat"><div className="statLabel">Entries</div><div className="statVal">{aggregates.personal.prayers}</div></div>
                   <div className="stat"><div className="statLabel">Time</div><div className="statVal">{fmtMin(aggregates.personal.time)}</div></div>
                 </>
               )}
            </div>

            <button 
              className="ghostBtn" 
              style={{ marginTop: 24, width: '100%', justifyContent: 'center', padding: 12, color: '#e06060', background: 'transparent', borderColor: 'rgba(224, 96, 96, 0.2)' }}
              onClick={(e) => {
                const btn = e.currentTarget;
                if (btn.innerText === "Reset My Life Data") {
                  btn.innerText = "Are you sure? (Clears Journal/Logs)";
                  setTimeout(() => { if (btn) btn.innerText = "Reset My Life Data"; }, 3000);
                  return;
                }
                wipeAllLocalData();
                triggerNotif("Personal life data cleared.");
                btn.innerText = "Reset My Life Data";
              }}
            >
              Reset My Life Data
            </button>

            <button className="primary" style={{ marginTop: 12 }} onClick={() => setDash(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
