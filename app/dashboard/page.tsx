"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

function badgeStatus(s?: string) {
  const st = s || "Em análise";
  const base = "px-2 py-1 rounded-full text-xs font-bold border";
  if (st === "Em reparo") return `${base} border-blue-500 text-blue-300`;
  if (st === "Concluído") return `${base} border-green-500 text-green-300`;
  if (st === "Cancelado") return `${base} border-yellow-500 text-yellow-300`;
  return `${base} border-zinc-600 text-zinc-300`;
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

  const total = useMemo(() => ordens.length, [ordens]);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-extrabold tracking-wide">KING OS</div>
          <nav className="flex gap-2 text-sm">
            <button onClick={() => router.back()} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">
              Voltar
            </button>
            <Link href="/" className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">Home</Link>
            <Link href="/ordens" className="px-3 py-2 rounded bg-yellow-500 text-black font-bold">Nova</Link>
            <Link href="/logout" className="px-3 py-2 rounded bg-red-500 text-black font-bold">Sair</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Ordens Ativas</h1>
            <p className="text-zinc-400 text-sm">Atualiza ao vivo • Total: {total}</p>
          </div>
        </div>

        {carregando && <p className="text-zinc-400">Carregando...</p>}

        {!carregando && ordens.length === 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-400">Nenhuma ordem ativa.</p>
            <Link href="/ordens" className="inline-block mt-4 bg-yellow-500 text-black px-5 py-3 rounded-2xl font-extrabold">
              Criar primeira OS
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

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={`/ordem/${o.id}`}
                  className="bg-white text-black px-4 py-2 rounded-xl font-bold"
                >
                  Abrir
                </Link>

                <Link
                  href={`/pdf/${o.id}`}
                  className="text-zinc-300 hover:text-white text-sm underline"
                >
                  PDF
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
