import React, { useState, useEffect } from "react";
import { User, Shield, Trash2, Eye, EyeOff, AlertTriangle, MessageCircle, Send } from "lucide-react";
import { collection, onSnapshot, doc, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { CategoryPill } from "./CategoryPill";
import { formatTimeAgo } from "../lib/utils";

const URGENCY_STYLES: Record<string, any> = {
  URGENT: { background: '#e06060', color: '#fff' },
  ELEVATED: { background: '#f59e0b', color: '#fff' },
  STANDARD: { background: 'var(--border)', color: 'var(--dim)' }
};

export function AdminPanel({ prayers, currentUserId, currentUserName, churchId, prayerStats }: { prayers: any[], currentUserId: string, currentUserName?: string, churchId: string, prayerStats: Record<string, any> }) {
  const [activeTab, setActiveTab] = useState("prayers");
  const [users, setUsers] = useState<any[]>([]);
  const [dmTarget, setDmTarget] = useState<any>(null);
  const [dmText, setDmText] = useState("");

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const { query, where } = await import('firebase/firestore');
        const q = query(collection(db, 'memberships'), where('churchId', '==', churchId));
        const snap = await getDocs(q);
        const m = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(m);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'memberships');
      }
    };
    if (churchId) fetchMemberships();
  }, [churchId]);

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    const btn = e.currentTarget;
    if (btn.innerText === "Delete") {
      btn.innerText = "Sure?";
      setTimeout(() => { if (btn) btn.innerText = "Delete"; }, 3000);
      return;
    }
    btn.innerText = "Deleting...";
    try {
      await deleteDoc(doc(db, `churches/${churchId}/prayers`, id));
    } catch (e) {
      console.error(e);
      btn.innerText = "Error";
      setTimeout(() => { if (btn) btn.innerText = "Delete"; }, 3000);
      handleFirestoreError(e, OperationType.DELETE, `churches/${churchId}/prayers`);
    }
  };

  const toggleHide = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, `churches/${churchId}/prayers`, id), {
        status: currentStatus === 'hidden' ? 'approved' : 'hidden'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `churches/${churchId}/prayers`);
    }
  };

  const sendDM = async () => {
    if (!dmText.trim() || !dmTarget) return;
    try {
      await addDoc(collection(db, `churches/${churchId}/messages`), {
        churchId,
        fromId: currentUserId,
        fromName: currentUserName || "An Elder",
        toId: dmTarget.authorId,
        prayerId: dmTarget.id,
        text: dmText.trim(),
        createdAt: serverTimestamp(),
        read: false
      });
      setDmTarget(null);
      setDmText("");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `churches/${churchId}/messages`);
    }
  };

  const getUserName = (authorId: string) => {
    const u = users.find(x => x.userId === authorId);
    return u ? u.displayName : 'Unknown Member';
  };

  const getEmail = (authorId: string) => {
    const u = users.find(x => x.userId === authorId);
    return u ? u.email : '';
  };

  return (
    <div style={{ padding: '0 20px', paddingBottom: 40, width: '100%', maxWidth: 500, margin: '0 auto', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginTop: 24, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Shield size={24} color="var(--gold)" />
        <h2 style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--sans)', color: 'var(--text)', margin: 0 }}>Elder Dashboard</h2>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button 
          onClick={() => setActiveTab('prayers')}
          style={{ flex: 1, padding: 12, borderRadius: 12, background: activeTab === 'prayers' ? 'var(--gold)' : 'var(--mutedCard)', border: 'none', color: activeTab === 'prayers' ? '#fff' : 'var(--faint)', fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 13 }}
        >
          Prayers
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ flex: 1, padding: 12, borderRadius: 12, background: activeTab === 'users' ? 'var(--gold)' : 'var(--mutedCard)', border: 'none', color: activeTab === 'users' ? '#fff' : 'var(--faint)', fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 13 }}
        >
          Members
        </button>
        <button 
          onClick={async (e) => {
            const btn = e.currentTarget;
            if (btn.innerText === "Seed Specs") {
              btn.innerText = "Sure?";
              setTimeout(() => { if (btn) btn.innerText = "Seed Specs"; }, 3000);
              return;
            }
            btn.innerText = "Seeding...";
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
            const { setDoc } = await import('firebase/firestore');
            
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
            btn.innerText = "Done";
            setTimeout(() => { if (btn) btn.innerText = "Seed Specs"; }, 3000);
          }}
          style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--mutedCard)', border: 'none', color: 'var(--gold)', fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          Seed Specs
        </button>
      </div>

      {activeTab === 'prayers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prayers.length === 0 ? (
            <div style={{ color: 'var(--faint)', textAlign: 'center', marginTop: 40, fontFamily: 'var(--sans)' }}>No prayers found.</div>
          ) : (
            prayers.map(p => (
              <div key={p.id} style={{ padding: 16, borderRadius: 16, background: 'var(--mutedCard)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <CategoryPill category={p.category} />
                    {p.urgency && (
                      <span style={{ 
                        ...URGENCY_STYLES[p.urgency], 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        fontSize: 10, 
                        fontWeight: 900, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        textTransform: 'uppercase'
                      }}>
                        {p.urgency === 'URGENT' && <AlertTriangle size={10} />}
                        {p.urgency}
                      </span>
                    )}
                    {p.status === 'hidden' && (
                      <span style={{ background: '#333', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>Hidden</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setDmTarget(p)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 4 }}>
                      <MessageCircle size={16} />
                    </button>
                    <button onClick={() => toggleHide(p.id, p.status || 'approved')} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: 4 }}>
                       {p.status === 'hidden' ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={(e) => handleDelete(e, p.id)} style={{ background: 'none', border: 'none', color: '#e06060', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--text)', lineHeight: 1.4 }}>{p.text}</p>
                
                {p.triageReason && (
                   <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic', paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
                     "AI: {p.triageReason}"
                   </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, padding: 12, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--sans)', color: 'var(--dim)', fontWeight: 700 }}>POSTED BY</span>
                    {p.anon && <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase' }}><EyeOff size={11} /> Posted Anon</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontFamily: 'var(--sans)', color: 'var(--text)', fontWeight: 600 }}>{getUserName(p.authorId)}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--sans)', color: 'var(--faint)' }}>{formatTimeAgo(p.createdAt?.toMillis ? p.createdAt.toMillis() : Date.now())}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--faint)' }}>{getEmail(p.authorId)}</div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div style={{ flex: 1, padding: '8px 12px', background: 'var(--card)', borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 800, letterSpacing: 0.5 }}>PRAYED FOR BY</span>
                    <span style={{ fontSize: 16, color: 'var(--text)', fontWeight: 900 }}>{(prayerStats[p.id] || {}).prayCount || 0}</span>
                  </div>
                  <div style={{ flex: 1, padding: '8px 12px', background: 'var(--card)', borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 800, letterSpacing: 0.5 }}>STATUS</span>
                    <span style={{ fontSize: 14, color: p.answered ? 'var(--gold)' : 'var(--text)', fontWeight: 900 }}>{p.answered ? "Answered" : "Active"}</span>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--mutedCard)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                {u.displayName ? u.displayName[0] : 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontFamily: 'var(--sans)', fontWeight: 700, color: 'var(--text)' }}>
                  {u.displayName} {u.userId === currentUserId && <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(You)</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>{u.email}</div>
              </div>
              <div>
                {u.role === 'admin' ? (
                  <span style={{ background: 'var(--goldSoft)', color: 'var(--gold)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Admin</span>
                ) : (
                  <span style={{ background: 'var(--border)', color: 'var(--dim)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Member</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {dmTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}>
             <h3 style={{ margin: '0 0 16px 0', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 18 }}>Direct Message</h3>
             <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>Sending message to {getUserName(dmTarget.authorId)}.</p>
             <textarea 
               value={dmText}
               onChange={e => setDmText(e.target.value)}
               placeholder="Write a pastoral note..."
               style={{ width: '100%', height: 120, background: 'var(--mutedCard)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, color: 'var(--text)', fontFamily: 'var(--sans)', resize: 'none', marginBottom: 16 }}
             />
             <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setDmTarget(null)} style={{ flex: 1, padding: 12, border: 'none', background: 'var(--mutedCard)', color: 'var(--text)', borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}>Cancel</button>
                <button onClick={sendDM} style={{ flex: 1, padding: 12, border: 'none', background: 'var(--gold)', color: '#fff', borderRadius: 12, cursor: 'pointer', fontWeight: 800 }}>Send message</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
