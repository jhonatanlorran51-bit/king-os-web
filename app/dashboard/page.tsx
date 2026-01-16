"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

function badgeStatus(s?: string) {
  const st = s || "Em análise";
  const base = "px-2 py-1 rounded-full text-xs font-bold border";
  if (st === "Em reparo") return `${base} border-blue-500 text-blue-300`;
  return `${base} border-zinc-700 text-zinc-300`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ordens"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const ativas = lista.filter(
        (o) => (o.status || "Em análise") !== "Concluído" && (o.status || "Em análise") !== "Cancelado"
      );
      setOrdens(ativas);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* só voltar */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold">
            Voltar
          </button>
          <span className="text-zinc-400 text-sm">Ordens Ativas</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {carregando && <p className="text-zinc-400">Carregando...</p>}

        {!carregando && ordens.length === 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-400">Nenhuma ordem ativa.</p>
            <Link href="/ordens" className="inline-block mt-4 bg-yellow-500 text-black px-5 py-3 rounded-2xl font-extrabold">
              Criar nova OS
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
                <span className={badgeStatus(o.status)}>{o.status || "Em análise"}</span>
              </div>

              <Link
                href={`/ordem/${o.id}`}
                className="inline-block mt-4 bg-white text-black px-4 py-2 rounded-xl font-bold"
              >
                Abrir
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
