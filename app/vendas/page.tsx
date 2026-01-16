"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

function badge(status?: string) {
  const s = status || "Em estoque";
  const base = "px-2 py-1 rounded-full text-xs font-bold border";
  if (s === "Vendido") return `${base} border-green-600 text-green-400`;
  return `${base} border-zinc-700 text-zinc-300`;
}

export default function VendasPage() {
  const router = useRouter();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);

    const unsub = onSnapshot(
      collection(db, "vendas"),
      (snap) => {
        setItens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setCarregando(false);
      },
      (e) => {
        console.error(e);
        setErro(e?.message || "Erro ao carregar vendas");
        setCarregando(false);
      }
    );

    return () => unsub();
  }, []);

  const ordenado = useMemo(() => {
    // vendido por último, mais recentes primeiro (se existir criadoEm)
    return [...itens].sort((a, b) => {
      const sa = a.status === "Vendido" ? 1 : 0;
      const sb = b.status === "Vendido" ? 1 : 0;
      if (sa !== sb) return sa - sb;
      const ta = a?.criadoEm?.toDate ? a.criadoEm.toDate().getTime() : 0;
      const tb = b?.criadoEm?.toDate ? b.criadoEm.toDate().getTime() : 0;
      return tb - ta;
    });
  }, [itens]);

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

          <Link
            href="/vendas/nova"
            className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold"
          >
            + Adicionar aparelho
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-4">Vendas</h1>

        {carregando && <p className="text-zinc-400">Carregando...</p>}

        {!carregando && erro && (
          <div className="bg-zinc-950 border border-red-700 rounded-2xl p-5">
            <p className="font-bold text-red-400 mb-2">Erro</p>
            <p className="text-zinc-300 text-sm break-words">{erro}</p>
          </div>
        )}

        {!carregando && !erro && ordenado.length === 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-400">Nenhum aparelho cadastrado ainda.</p>
            <Link
              href="/vendas/nova"
              className="inline-block mt-4 bg-white text-black px-5 py-3 rounded-2xl font-extrabold"
            >
              Cadastrar primeiro aparelho
            </Link>
          </div>
        )}

        {!carregando && !erro && ordenado.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ordenado.map((v) => {
              const investAparelho = typeof v.valorAparelho === "number" ? v.valorAparelho : 0;
              const investPecas = typeof v.valorPecas === "number" ? v.valorPecas : 0;
              const custo = investAparelho + investPecas;

              return (
                <div key={v.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-lg">{v.cliente || "-"}</p>
                      <p className="text-zinc-400 text-sm">
                        {(v.marca || "-") + " • " + (v.modelo || "-")}
                      </p>
                    </div>
                    <span className={badge(v.status)}>{v.status || "Em estoque"}</span>
                  </div>

                  <div className="mt-3 text-sm text-zinc-300 space-y-1">
                    <p><b>Custo:</b> {formatBRL(custo)}</p>
                    <p><b>Estimado:</b> {typeof v.valorEstimado === "number" ? formatBRL(v.valorEstimado) : "-"}</p>
                    <p><b>Vendido:</b> {typeof v.valorVendido === "number" ? formatBRL(v.valorVendido) : "-"}</p>
                  </div>

                  <Link
                    href={`/vendas/${v.id}`}
                    className="inline-block mt-4 bg-white text-black px-4 py-2 rounded-xl font-bold"
                  >
                    Abrir
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
