"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function GanhosPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mes, setMes] = useState(monthKey());

  useEffect(() => {
    setCarregando(true);
    const unsub = onSnapshot(collection(db, "ordens"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setOrdens(lista);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  const resumo = useMemo(() => {
    const [yy, mm] = mes.split("-").map((x) => Number(x));
    const inicio = new Date(yy, mm - 1, 1).getTime();
    const fim = new Date(yy, mm, 1).getTime();

    const doMes = ordens.filter((o) => {
      const dt = o?.criadoEm?.toDate ? o.criadoEm.toDate() : o?.criadoEm instanceof Date ? o.criadoEm : null;
      const t = dt ? dt.getTime() : null;
      return typeof t === "number" && t >= inicio && t < fim;
    });

    const concluidas = doMes.filter((o) => o.status === "Concluído");

    const faturamento = concluidas.reduce((acc, o) => acc + (typeof o.valorTotal === "number" ? o.valorTotal : 0), 0);
    const custos = concluidas.reduce((acc, o) => acc + (typeof o.valorPeca === "number" ? o.valorPeca : 0), 0);
    const lucro = concluidas.reduce((acc, o) => acc + (typeof o.lucro === "number" ? o.lucro : 0), 0);

    return {
      totalConcluidas: concluidas.length,
      faturamento,
      custos,
      lucro,
      concluidas,
    };
  }, [ordens, mes]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* topo: só voltar */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold"
          >
            Voltar
          </button>
          <span className="text-zinc-400 text-sm">Ganhos</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <p className="text-xl font-extrabold">Resumo do mês</p>
              <p className="text-zinc-400 text-sm">Concluídas contam no cálculo</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">Mês:</span>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {carregando ? (
            <p className="text-zinc-400 mt-4">Carregando...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Faturamento (mês)</p>
                <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.faturamento)}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Custos (peças)</p>
                <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.custos)}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <p className="text-zinc-400 text-sm">Lucro (mês)</p>
                <p className="text-2xl font-extrabold mt-1 text-green-400">{formatBRL(resumo.lucro)}</p>
              </div>
            </div>
          )}

          {!carregando && (
            <p className="text-zinc-500 text-xs mt-4">
              OS concluídas no mês: <b>{resumo.totalConcluidas}</b>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
