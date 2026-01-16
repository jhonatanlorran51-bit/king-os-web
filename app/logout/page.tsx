"use client";

import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut(auth).then(() => {
      router.replace("/login");
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      Saindo...
    </main>
  );
}
