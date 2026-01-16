"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function HomePage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
      else setCarregando(false);
    });
    return () => unsub();
  }, [router]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h1 className="text-3xl font-extrabold tracking-wide mb-1">King OS</h1>
          <p className="text-zinc-400 mb-6">Escolha o que você quer fazer</p>

          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/ordens"
              className="w-full text-center bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-2xl font-extrabold"
            >
              Nova Ordem
            </Link>

            <Link
              href="/dashboard"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Ordens Ativas
            </Link>

            <Link
              href="/concluidas"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Concluídas
            </Link>

            <Link
              href="/historico"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Histórico
            </Link>

            <Link
              href="/logout"
              className="w-full text-center bg-red-500 hover:bg-red-400 text-black py-3 rounded-2xl font-extrabold"
            >
              Sair
            </Link>
          </div>

          <p className="text-zinc-500 text-xs mt-5">
            “Sair” aparece só aqui na Home.
          </p>
        </div>
      </div>
    </main>
  );
}
