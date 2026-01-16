"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

function badgeStatus(s?: string) {
  const st = s || "—";
  const base = "px-2 py-1 rounded-full text-xs font-bold border";
  if (st === "Concluído") return `${base} border-green-500 text-green-300`;
  if (st === "Cancelado") return `${base} border-yellow-500 text-yellow-300`;
  return `${base} border-zinc-700 text-zinc-300`;
}

export default function HistoricoPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ordens"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const hist = lista.filter((o) => (o.status || "") === "Concluído" || (o.status || "") === "Cancelado");
      setOrdens(hist);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  async function excluir(id: string) {
    const ok = confirm("Excluir do histórico? (não dá para desfazer)");
    if (!ok) return;
    await deleteDoc(doc(db, "ordens", id));
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold">
            Voltar
          </button>
          <span className="text-zinc-400 text-sm">Histórico</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {carregando && <p className="text-zinc-400">Carregando...</p>}

        {!carregando && ordens.length === 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-400">Nenhuma OS concluída/cancelada ainda.</p>
            <Link href="/dashboard" className="inline-block mt-4 bg-zinc-800 px-5 py-3 rounded-2xl font-bold">
              Ver Ativas
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ordens.map((o) => (
            <div key={o.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-lg">{o.cliente || "-"}</p>
                  <p className="text-zinc-400 text-sm">
                    {o.marca || "-"} • {o.modelo || "-"}
                  </p>
                </div>
                <span className={badgeStatus(o.status)}>{o.status}</span>
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <Link href={`/ordem/${o.id}`} className="bg-white text-black px-4 py-2 rounded-xl font-bold">
                  Abrir
                </Link>
                <Link href={`/pdf/${o.id}`} className="bg-zinc-800 px-4 py-2 rounded-xl font-bold">
                  PDF
                </Link>
                <button onClick={() => excluir(o.id)} className="bg-red-500 text-black px-4 py-2 rounded-xl font-bold">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-zinc-500 text-xs mt-6">
          Excluir aqui remove do sistema (não tem como desfazer).
        </p>
      </div>
    </main>
  );
}
