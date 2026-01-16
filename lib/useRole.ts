"use client";

import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export function useRole() {
  const [role, setRole] = useState<"admin" | "tecnico" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setRole(snap.exists() ? (snap.data().role as any) : null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { role, loading };
}
