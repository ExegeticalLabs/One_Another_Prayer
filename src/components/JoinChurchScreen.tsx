import React, { useState } from "react";
import { Users, Wind, KeySquare, LogOut } from "lucide-react";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut } from "firebase/auth";

export function JoinChurchScreen({ membership, user, setNotif, theme }: any) {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const q = query(collection(db, "churches"), where("inviteCode", "==", inviteCode.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setNotif("Invalid invite code.");
        setLoading(false);
        return;
      }
      
      const churchDoc = snap.docs[0];
      const churchData = churchDoc.data();
      
      if (!churchData.inviteCodeEnabled) {
        setNotif("This invite code is currently disabled by elders.");
        setLoading(false);
        return;
      }

      // Create membership
      // As per Phase 4A, invite creates active membership directly for MVP
      await setDoc(doc(db, "memberships", user.uid), {
        userId: user.uid,
        churchId: churchDoc.id,
        displayName: user.displayName || "Unknown",
        email: user.email || "",
        role: "member",
        status: "active",
        joinedAt: serverTimestamp()
      });
      
      setNotif("Welcome to your church community.");
    } catch (e) {
      console.error(e);
      setNotif("Error joining church. Ensure code is correct.");
      setLoading(false);
    }
  };

  return (
    <div className="app" data-theme={theme} style={{display:'flex', alignItems:'center', justifyItems:'center', flexDirection: 'column'}}>
        <style>{`
          .app{ height:100svh; max-width:520px; margin:0 auto; position:relative; overflow:hidden; font-family:var(--sans); transition: background 1.5s ease; background: var(--bg); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
          .app[data-theme="dark"]{
            --bg: linear-gradient(160deg, #0d1117 0%, #131a24 40%, #0d1117 100%);
            --text: rgba(255,255,255,0.92);
            --dim: rgba(255,255,255,0.60);
            --gold: #c8b48c;
            --mutedCard: rgba(255,255,255,0.10);
            --border: rgba(255,255,255,0.10);
          }
          .app[data-theme="light"]{
            --bg: linear-gradient(180deg, #f7fbff 0%, #eef7ff 40%, #f8fffd 100%);
            --text: rgba(10,30,45,0.92);
            --dim: rgba(10,30,45,0.65);
            --gold: #2f7bbd;
            --mutedCard: rgba(10,30,45,0.08);
            --border: rgba(20,40,60,0.08);
          }
        `}</style>
        
        {membership && membership.status === 'pending' ? (
           <div style={{ textAlign: 'center' }}>
              <Users size={64} color="var(--gold)" style={{marginBottom: 24}} />
              <h2 style={{fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 900, marginBottom: 12}}>Awaiting Approval</h2>
              <p style={{fontFamily: 'var(--serif)', fontSize: 17, marginBottom: 32, opacity: 0.8, lineHeight: 1.4}}>
                 Your request to join has been sent to the elders. You will be granted access shortly.
              </p>
           </div>
        ) : (
           <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
              <KeySquare size={48} color="var(--gold)" style={{marginBottom: 20}} />
              <h2 style={{fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 900, marginBottom: 12}}>Join Your Church</h2>
              <p style={{fontFamily: 'var(--serif)', fontSize: 16, marginBottom: 32, opacity: 0.8, lineHeight: 1.4}}>
                 PrayerFeed is an invite-only community for local churches. Enter your church's invite code to access the feed.
              </p>
              
              <input 
                type="text" 
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INVITE CODE"
                style={{ width: '100%', padding: 18, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--mutedCard)', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 900, letterSpacing: 2, textAlign: 'center', marginBottom: 16 }}
              />

              <button 
                onClick={handleJoin}
                disabled={loading || !inviteCode.trim()}
                style={{ width: '100%', padding: 18, background: 'var(--gold)', border: 'none', borderRadius: 16, color: '#fff', fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'transform 0.2s', opacity: (loading || !inviteCode.trim()) ? 0.6 : 1 }}
              >
                {loading ? 'Verifying...' : 'Join Community'}
              </button>
           </div>
        )}

        <button 
           onClick={() => signOut(auth)}
           style={{ background: 'none', border: 'none', color: 'var(--dim)', fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 12, marginTop: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <LogOut size={14} /> Sign out
        </button>
    </div>
  );
}
