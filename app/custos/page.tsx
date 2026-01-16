"use client";

import Link from "next/link";
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

export default function CustosPage() {
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

  const lista = useMemo(() => {
    const [yy, mm] = mes.split("-").map((x) => Number(x));
    const inicio = new Date(yy, mm - 1, 1).getTime();
    const fim = new Date(yy, mm, 1).getTime();

    const doMes = ordens.filter((o) => {
      const dt = o?.criadoEm?.toDate ? o.criadoEm.toDate() : o?.criadoEm instanceof Date ? o.criadoEm : null;
      const t = dt ? dt.getTime() : null;
      return typeof t === "number" && t >= inicio && t < fim;
    });

    const concluidas = doMes.filter((o) => o.status === "Concluído");

    const total = concluidas.reduce((acc, o) => acc + (typeof o.valorPeca === "number" ? o.valorPeca : 0), 0);

    return { concluidas, total };
  }, [ordens, mes]);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold">
            Voltar
          </button>
          <span className="text-zinc-400 text-sm">Custos</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <p className="text-xl font-extrabold">Custos do mês (peças)</p>
              <p className="text-zinc-400 text-sm">Somente OS concluídas</p>
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
            <>
              <p className="text-zinc-300 mt-4">
                Total de custos: <b className="text-white">{formatBRL(lista.total)}</b>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {lista.concluidas.map((o) => (
                  <div key={o.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <p className="font-bold text-lg">{o.cliente || "-"}</p>
                    <p className="text-zinc-400 text-sm">{(o.marca || "-") + " • " + (o.modelo || "-")}</p>

                    <p className="mt-2">
                      Custo peça:{" "}
                      <b>{typeof o.valorPeca === "number" ? formatBRL(o.valorPeca) : "-"}</b>
                    </p>

                    <div className="mt-4">
                      <Link href={`/ordem/${o.id}`} className="inline-block bg-white text-black px-4 py-2 rounded-xl font-bold">
                        Abrir OS
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {lista.concluidas.length === 0 && (
                <p className="text-zinc-400 mt-5">Nenhuma OS concluída nesse mês.</p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

