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
  const { role, uid, email, loading } = useRole();

  useEffect(() => {
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

  // DEBUG + bloqueio real
  if (role !== "admin") {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => router.back()}
            className="bg-zinc-700 px-4 py-2 rounded font-bold"
          >
            Voltar
          </button>
          <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">
            Home
          </Link>
          <Link href="/logout" className="bg-red-500 text-black px-4 py-2 rounded font-bold">
            Sair
          </Link>
        </div>

        <p className="text-zinc-400 text-sm mb-4">
          Logado como: {email || "?"} | role: {role || "sem role"} | uid: {uid || "?"}
        </p>

        <p className="text-red-400 font-bold">
          Acesso restrito (somente Admin).
        </p>

        <p className="text-zinc-400 mt-3 text-sm">
          Se você é admin e apareceu “sem role”, normalmente é:
          <br />• faltou criar o documento users/{`{seuUID}`} com role="admin"
          <br />• ou as Rules do Firestore estão bloqueando leitura da coleção users.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => router.back()}
          className="bg-zinc-700 px-4 py-2 rounded font-bold"
        >
          Voltar
        </button>
        <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Home
        </Link>
        <Link href="/logout" className="bg-red-500 text-black px-4 py-2 rounded font-bold">
          Sair
        </Link>
      </div>

      {/* DEBUG (pode remover depois) */}
      <p className="text-zinc-400 text-sm mb-4">
        Logado como: {email || "?"} | role: {role || "sem role"} | uid: {uid || "?"}
      </p>

      <h1 className="text-2xl font-bold mb-6">Ordens Ativas</h1>

      {ordens.map((o) => (
        <div key={o.id} className="bg-zinc-900 p-4 rounded mb-3">
          <p><b>Cliente:</b> {o.cliente}</p>
          <p><b>Marca:</b> {o.marca || "-"}</p>
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
