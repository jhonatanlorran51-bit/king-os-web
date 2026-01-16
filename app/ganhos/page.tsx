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

function inMonth(docData: any, inicio: number, fim: number) {
  const dt =
    docData?.criadoEm?.toDate?.() ||
    docData?.concluidoEm?.toDate?.() ||
    docData?.vendidoEm?.toDate?.() ||
    (docData?.criadoEm instanceof Date ? docData.criadoEm : null) ||
    null;

  const t = dt ? dt.getTime() : null;
  return typeof t === "number" && t >= inicio && t < fim;
}

export default function GanhosPage() {
  const router = useRouter();

  const [ordens, setOrdens] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [mes, setMes] = useState(monthKey());

  useEffect(() => {
    setCarregando(true);

    const unsubOrdens = onSnapshot(collection(db, "ordens"), (snap) => {
      setOrdens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    const unsubVendas = onSnapshot(collection(db, "vendas"), (snap) => {
      setVendas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setCarregando(false);
    });

    return () => {
      unsubOrdens();
      unsubVendas();
    };
  }, []);

  const resumo = useMemo(() => {
    const [yy, mm] = mes.split("-").map((x) => Number(x));
    const inicio = new Date(yy, mm - 1, 1).getTime();
    const fim = new Date(yy, mm, 1).getTime();

    // ===== OS (somar só Concluído) =====
    const ordensMes = ordens.filter((o) => inMonth(o, inicio, fim));
    const concluidas = ordensMes.filter((o) => o.status === "Concluído");

    const faturamentoOS = concluidas.reduce(
      (acc, o) => acc + (typeof o.valorTotal === "number" ? o.valorTotal : 0),
      0
    );
    const custosOS = concluidas.reduce(
      (acc, o) => acc + (typeof o.valorPeca === "number" ? o.valorPeca : 0),
      0
    );
    const lucroOS = concluidas.reduce(
      (acc, o) => acc + (typeof o.lucro === "number" ? o.lucro : 0),
      0
    );

    // ===== VENDAS (somar só Vendido) =====
    const vendasMes = vendas.filter((v) => inMonth(v, inicio, fim));
    const vendidas = vendasMes.filter((v) => v.status === "Vendido"); // ✅ Cancelado NÃO entra

    const faturamentoVendas = vendidas.reduce(
      (acc, v) => acc + (typeof v.valorVendido === "number" ? v.valorVendido : 0),
      0
    );

    const custosVendas = vendidas.reduce((acc, v) => {
      const a = typeof v.valorAparelho === "number" ? v.valorAparelho : 0;
      const p = typeof v.valorPecas === "number" ? v.valorPecas : 0;
      return acc + a + p;
    }, 0);

    const lucroVendas = vendidas.reduce(
      (acc, v) => acc + (typeof v.lucro === "number" ? v.lucro : 0),
      0
    );

    return {
      totalOS: concluidas.length,
      totalVendas: vendidas.length,

      faturamento: faturamentoOS + faturamentoVendas,
      custos: custosOS + custosVendas,
      lucro: lucroOS + lucroVendas,

      detalhes: {
        faturamentoOS,
        faturamentoVendas,
        custosOS,
        custosVendas,
        lucroOS,
        lucroVendas,
      },
    };
  }, [ordens, vendas, mes]);

  return (
    <main className="min-h-screen bg-black text-white">
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
              <p className="text-zinc-400 text-sm">
                Só entra: OS <b>Concluídas</b> e Vendas <b>Vendidas</b>
              </p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Faturamento</p>
                  <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.faturamento)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Custos</p>
                  <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.custos)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Lucro</p>
                  <p className="text-2xl font-extrabold mt-1 text-green-400">{formatBRL(resumo.lucro)}</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-zinc-500 space-y-1">
                <p>
                  OS concluídas: <b>{resumo.totalOS}</b> | Vendas vendidas: <b>{resumo.totalVendas}</b>
                </p>
                <p>
                  Detalhe: Faturamento OS {formatBRL(resumo.detalhes.faturamentoOS)} + Vendas{" "}
                  {formatBRL(resumo.detalhes.faturamentoVendas)}
                </p>
                <p>
                  Detalhe: Custos OS {formatBRL(resumo.detalhes.custosOS)} + Vendas{" "}
                  {formatBRL(resumo.detalhes.custosVendas)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

