"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

type Role = "admin" | "tecnico" | null;

export function useRole() {
  const [role, setRole] = useState<Role>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

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
        if (snap.exists()) {
          const data = snap.data() as any;
          setRole((data.role as Role) || null);
        } else {
          setRole(null);
        }
      } catch (e) {
        console.error("Erro ao ler users/{uid}:", e);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { role, uid, email, loading };
}
