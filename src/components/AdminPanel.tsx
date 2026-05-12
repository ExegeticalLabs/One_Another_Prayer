import React, { useState, useEffect } from "react";
import { User, Shield, Trash2, Eye, EyeOff } from "lucide-react";
import { collection, onSnapshot, doc, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { CategoryPill } from "./CategoryPill";
import { formatTimeAgo } from "../lib/utils";

export function AdminPanel({ prayers, currentUserId }: { prayers: any[], currentUserId: string }) {
  const [activeTab, setActiveTab] = useState("prayers");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const u = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(u);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'users');
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this prayer? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'prayers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'prayers');
    }
  };

  const getUserName = (authorId: string) => {
    const u = users.find(x => x.id === authorId);
    return u ? u.displayName : 'Unknown Member';
  };

  const getEmail = (authorId: string) => {
    const u = users.find(x => x.id === authorId);
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
      </div>

      {activeTab === 'prayers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prayers.length === 0 ? (
            <div style={{ color: 'var(--faint)', textAlign: 'center', marginTop: 40, fontFamily: 'var(--sans)' }}>No prayers found.</div>
          ) : (
            prayers.map(p => (
              <div key={p.id} style={{ padding: 16, borderRadius: 16, background: 'var(--mutedCard)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <CategoryPill category={p.category} />
                  <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#e06060', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--text)', lineHeight: 1.4 }}>{p.text}</p>
                
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
                    <span style={{ fontSize: 16, color: 'var(--text)', fontWeight: 900 }}>{p.prayCount || 0}</span>
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
                  {u.displayName} {u.id === currentUserId && <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(You)</span>}
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
    </div>
  )
}
