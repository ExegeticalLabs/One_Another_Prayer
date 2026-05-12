import React, { useState } from "react";
import { Users, Wind, KeySquare, LogOut } from "lucide-react";
import { collection, query, where, getDocs, setDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut } from "firebase/auth";

export function JoinChurchScreen({ membership, user, setNotif, theme }: any) {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      if (inviteCode.trim() === "TEST") {
        const churchId = "church_test_demo";
        const churchRef = doc(db, "churches", churchId);
        const churchSnap = await getDoc(churchRef);
        
        if (!churchSnap.exists()) {
          await setDoc(churchRef, {
             name: "Demo Church",
             inviteCode: "TEST",
             inviteCodeEnabled: true,
             createdAt: serverTimestamp()
          });

          // MUST create membership before seeding prayers, otherwise rules reject
          await setDoc(doc(db, "memberships", user.uid), {
             userId: user.uid,
             churchId: churchId,
             displayName: user.displayName || "Unknown",
             email: user.email || "",
             role: "admin",
             status: "active",
             joinedAt: serverTimestamp()
          });

          // Seed some prayers for Demo Church
          const testPrayers = [
              {
                text: "Praying for my mother's upcoming surgery next Tuesday.",
                category: "health",
                anon: false,
                answered: false,
                urgency: "STANDARD",
                status: "active",
                author: "Test User",
                stats: { prayCount: 2, prayTime: 45 }
              },
              {
                text: "Please pray for our family as we grieve the loss of my grandfather.",
                category: "grief",
                anon: true,
                answered: false,
                urgency: "ELEVATED",
                triageReason: "Grief and loss flag",
                status: "active",
                author: "A Church Member",
                stats: { prayCount: 5, prayTime: 120 }
              },
              {
                text: "Praise God! I finally found a new job after 6 months of searching.",
                category: "gratitude",
                anon: false,
                answered: true,
                urgency: "STANDARD",
                status: "answered",
                author: "Test User",
                stats: { prayCount: 12, prayTime: 300 }
              },
              {
                text: "Struggling with profound loneliness lately. Please pray for community.",
                category: "spiritual growth",
                anon: true,
                answered: false,
                urgency: "STANDARD",
                status: "active",
                author: "A Church Member",
                stats: { prayCount: 1, prayTime: 15 }
              },
              {
                text: "Pray for my marriage, we are going through a really tough time and need God's intervention.",
                category: "family",
                anon: true,
                answered: false,
                urgency: "ELEVATED",
                triageReason: "Marital distress flag",
                status: "active",
                author: "A Church Member",
                stats: { prayCount: 8, prayTime: 210 }
              },
              {
                text: "I am having dark thoughts and feel like I can't go on. Please someone help.",
                category: "ongoing burden",
                anon: true,
                answered: false,
                urgency: "URGENT",
                triageReason: "Severe distress / ideation",
                status: "active",
                author: "A Church Member",
                stats: { prayCount: 0, prayTime: 0 }
              },
              {
                text: "Praying for the youth ministry retreat this weekend. May lives be transformed.",
                category: "church body",
                anon: false,
                answered: false,
                urgency: "STANDARD",
                status: "active",
                author: "Youth Pastor",
                stats: { prayCount: 3, prayTime: 65 }
              },
              {
                text: "Feeling distant from God. Want to rekindle my faith.",
                category: "spiritual growth",
                anon: true,
                answered: false,
                urgency: "STANDARD",
                status: "active",
                author: "A Church Member",
                stats: { prayCount: 0, prayTime: 0 }
              },
              {
                text: "My boss is extremely hostile and it is affecting my health. Pray for a resolution.",
                category: "work",
                anon: false,
                answered: false,
                urgency: "STANDARD",
                status: "active",
                author: "John D.",
                stats: { prayCount: 4, prayTime: 100 }
              },
              {
                text: "A sensitive pastoral issue that an elder has hidden.",
                category: "ongoing burden",
                anon: true,
                answered: false,
                urgency: "ELEVATED",
                status: "hidden",
                author: "A Church Member",
                stats: { prayCount: 0, prayTime: 0 }
              },
              {
                text: "Archived prayer from months ago.",
                category: "health",
                anon: false,
                answered: false,
                urgency: "STANDARD",
                status: "archived",
                author: "Dave S.",
                stats: { prayCount: 20, prayTime: 500 }
              },
              {
                text: "My chronic back pain is really severe this week.",
                category: "health",
                anon: false,
                answered: false,
                urgency: "STANDARD",
                status: "active",
                author: "Sarah",
                stats: { prayCount: 2, prayTime: 30 }
              }
          ];

          for (const p of testPrayers) {
            const pRef = doc(collection(db, `churches/${churchId}/prayers`));

            await setDoc(pRef, {
              churchId,
              text: p.text,
              category: p.category,
              anon: p.anon,
              answered: p.answered,
              urgency: p.urgency,
              triageReason: p.triageReason || null,
              status: p.status,
              authorId: "fake_author_id_" + Math.random().toString(36).substring(7),
              author: p.author,
              createdAt: serverTimestamp()
            });

            const statsRef = doc(db, `churches/${churchId}/prayers/${pRef.id}/internal/stats`);
            await setDoc(statsRef, {
              churchId,
              prayCount: p.stats.prayCount,
              prayTime: p.stats.prayTime
            });
          }
        } else {
          // If the church already exists, we just create/update the membership for the user joining
          await setDoc(doc(db, "memberships", user.uid), {
             userId: user.uid,
             churchId: churchId,
             displayName: user.displayName || "Unknown",
             email: user.email || "",
             role: "admin",
             status: "active",
             joinedAt: serverTimestamp()
          });
        }
        
        setNotif("Welcome to your Demo Church! (Admin Access)");
        setLoading(false);
        return;
      }

      const q = query(collection(db, "churches"), where("inviteCode", "==", inviteCode.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setNotif("Invalid invite code. Ensure you've run the seed script and try 'GRACE'.");
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
                 PrayerFeed is an invite-only community for local churches. Enter your church's invite code to access the feed.<br/><br/>
                 <strong style={{color: 'var(--gold)'}}>Developer / Demo:</strong> Enter the code <strong>TEST</strong> to automatically create and join a demo church as an admin, or use <strong>GRACE</strong> if you ran the seed script.
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
