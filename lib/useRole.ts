"use client";

import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

type Role = "admin" | "tecnico" | null;

export function useRole() {
  const [role, setRole] = useState<Role>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchRole(user: User | null) {
    if (!user) {
      setRole(null);
      setUid(null);
      setEmail(null);
      setLoading(false);
      return;
    }

    setUid(user.uid);
    setEmail(user.email || null);

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      setRole(snap.exists() ? (snap.data().role as any) : null);
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(auth, (user) => {
      fetchRole(user);
    });
    return () => unsub();
  }, []);

  return { role, uid, email, loading };
}
