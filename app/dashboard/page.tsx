"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { useRole } from "../../lib/useRole";

export default function DashboardPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<any[]>([]);
  const { role, loading } = useRole();

  useEffect(() => {
    // só carrega se for admin
    if (loading) return;
    if (role !== "admin") return;

    getDocs(collection(db, "ordens")).then((snap) => {
      setOrdens(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((o) => o.status !== "Concluído" && o.status !== "Cancelado")
      );
    });
  }, [loading, role]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-zinc-400">Carregando permissões...</p>
      </main>
    );
  }

  // técnico não entra aqui
  if (role !== "admin") {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => router.back()} className="bg-zinc-700 px-4 py-2 rounded font-bold">
            Voltar
          </button>
          <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">
            Home
          </Link>
        </div>

        <p className="text-red-400 font-bold">Acesso restrito (somente Admin).</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex gap-2 mb-6">
        <button onClick={() => router.back()} className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Voltar
        </button>
        <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">Home</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Ordens Ativas</h1>

      {ordens.map((o) => (
        <div key={o.id} className="bg-zinc-900 p-4 rounded mb-3">
          <p><b>Cliente:</b> {o.cliente}</p>
          <p><b>Modelo:</b> {o.modelo}</p>
          <p><b>Status:</b> {o.status}</p>

          <Link
            href={`/ordem/${o.id}`}
            className="inline-block mt-3 bg-white text-black px-4 py-2 rounded font-bold"
          >
            Abrir
          </Link>
        </div>
      ))}
    </main>
  );
}
