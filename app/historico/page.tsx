"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface Ordem {
  id: string;
  cliente?: string;
  modelo?: string;
  status?: string;
  valorTotal?: number | null;
}

export default function HistoricoPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const snap = await getDocs(collection(db, "ordens"));
    const lista = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((o) => o.status === "Concluído" || o.status === "Cancelado");
    setOrdens(lista);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function excluir(id: string) {
    const ok = confirm("Excluir do histórico? (não dá para desfazer)");
    if (!ok) return;
    await deleteDoc(doc(db, "ordens", id));
    await carregar();
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* MENU */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => router.back()} className="bg-zinc-800 px-4 py-2 rounded font-bold">
          Voltar
        </button>
        <Link href="/" className="bg-zinc-800 px-4 py-2 rounded font-bold">
          Home
        </Link>
        <Link href="/ordens" className="bg-zinc-800 px-4 py-2 rounded font-bold">
          Nova Ordem
        </Link>
        <Link href="/dashboard" className="bg-zinc-800 px-4 py-2 rounded font-bold">
          Ativas
        </Link>
        <Link href="/logout" className="bg-red-500 text-black px-4 py-2 rounded font-bold">
          Sair
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Histórico</h1>

      {carregando && <p className="text-zinc-400">Carregando...</p>}
      {!carregando && ordens.length === 0 && (
        <p className="text-zinc-400">Nenhuma OS concluída/cancelada ainda.</p>
      )}

      {ordens.map((o) => (
        <div key={o.id} className="bg-zinc-900 p-4 rounded mb-3">
          <p><b>Cliente:</b> {o.cliente || "-"}</p>
          <p><b>Modelo:</b> {o.modelo || "-"}</p>
          <p><b>Status:</b> {o.status || "-"}</p>
          <p><b>Valor:</b> {typeof o.valorTotal === "number" ? `R$ ${o.valorTotal.toFixed(2)}` : "-"}</p>

          <button onClick={() => excluir(o.id)} className="mt-3 bg-red-500 text-black px-4 py-2 rounded font-bold">
            Excluir
          </button>
        </div>
      ))}
    </main>
  );
}
