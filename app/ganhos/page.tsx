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

function getTimeFromDoc(docData: any) {
  const dt =
    docData?.criadoEm?.toDate?.() ||
    docData?.concluidoEm?.toDate?.() ||
    docData?.vendidoEm?.toDate?.() ||
    (docData?.criadoEm instanceof Date ? docData.criadoEm : null) ||
    null;

  return dt ? dt.getTime() : null;
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

    const inMonth = (o: any) => {
      const t = getTimeFromDoc(o);
      return typeof t === "number" && t >= inicio && t < fim;
    };

    // ========= OS (somar só Concluído) =========
    const concluidas = ordens.filter((o) => inMonth(o) && o.status === "Concluído");

    const faturamentoOS = concluidas.reduce(
      (acc, o) => acc + (typeof o.valorTotal === "number" ? o.valorTotal : 0),
      0
    );
    const custoOS = concluidas.reduce(
      (acc, o) => acc + (typeof o.valorPeca === "number" ? o.valorPeca : 0),
      0
    );
    const lucroOS = concluidas.reduce(
      (acc, o) => acc + (typeof o.lucro === "number" ? o.lucro : 0),
      0
    );

    // ========= VENDAS =========
    // ✅ custo já existe no momento que você cadastrou o aparelho
    // então vamos usar o criadoEm do item de venda como “momento do custo”
    const vendasNoMes = vendas.filter((v) => {
      const dt = v?.criadoEm?.toDate?.();
      const t = dt ? dt.getTime() : null;
      return typeof t === "number" && t >= inicio && t < fim;
    });

    const custoVenda = (v: any) => {
      const a = typeof v.valorAparelho === "number" ? v.valorAparelho : 0;
      const p = typeof v.valorPecas === "number" ? v.valorPecas : 0;
      return a + p;
    };

    // ✅ ESTOQUE (Disponível) => entra como “investido”
    const estoque = vendasNoMes.filter((v) => (v.status || "Em estoque") === "Em estoque");
    const investidoEstoque = estoque.reduce((acc, v) => acc + custoVenda(v), 0);

    // ✅ VENDIDAS => entra em faturamento/lucro e também tem custo associado
    const vendidas = vendas.filter((v) => inMonth(v) && v.status === "Vendido");
    const faturamentoVendas = vendidas.reduce(
      (acc, v) => acc + (typeof v.valorVendido === "number" ? v.valorVendido : 0),
      0
    );
    const custoVendasVendidas = vendidas.reduce((acc, v) => acc + custoVenda(v), 0);
    const lucroVendas = vendidas.reduce(
      (acc, v) => acc + (typeof v.lucro === "number" ? v.lucro : 0),
      0
    );

    // ========= TOTAIS =========
    // Custos do mês (o que virou serviço/venda)
    const custosOperacionais = custoOS + custoVendasVendidas;

    // Custos totais (inclui investido no estoque)
    const custosTotais = custosOperacionais + investidoEstoque;

    const faturamentoTotal = faturamentoOS + faturamentoVendas;
    const lucroTotal = lucroOS + lucroVendas;

    return {
      contagem: {
        osConcluidas: concluidas.length,
        vendasVendidas: vendidas.length,
        estoque: estoque.length,
      },
      faturamentoTotal,
      custosOperacionais,
      investidoEstoque,
      custosTotais,
      lucroTotal,
      detalhes: {
        faturamentoOS,
        faturamentoVendas,
        custoOS,
        custoVendasVendidas,
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
                Lucro só entra quando vender/concluir. Investimento em estoque aparece na hora.
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Faturamento</p>
                  <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.faturamentoTotal)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Custos (serviços/vendas)</p>
                  <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.custosOperacionais)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Investido em estoque</p>
                  <p className="text-2xl font-extrabold mt-1">{formatBRL(resumo.investidoEstoque)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">Lucro</p>
                  <p className="text-2xl font-extrabold mt-1 text-green-400">{formatBRL(resumo.lucroTotal)}</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-zinc-500 space-y-1">
                <p>
                  OS concluídas: <b>{resumo.contagem.osConcluidas}</b> | Vendas vendidas:{" "}
                  <b>{resumo.contagem.vendasVendidas}</b> | Em estoque: <b>{resumo.contagem.estoque}</b>
                </p>
                <p>
                  Total de custos (inclui estoque): <b>{formatBRL(resumo.custosTotais)}</b>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

