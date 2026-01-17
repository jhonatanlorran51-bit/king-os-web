"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function VendaSharePage() {
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function run() {
      try {
        setLoading(true);
        setErro("");
        const snap = await getDoc(doc(db, "shares_vendas", id));
        if (!snap.exists()) {
          setErro("Comprovante não encontrado.");
          setData(null);
        } else {
          setData(snap.data());
        }
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao abrir comprovante. Verifique as Rules do Firestore (shares_vendas).");
      } finally {
        setLoading(false);
      }
    }
    if (id) run();
  }, [id]);

  const vendidoEmTexto = useMemo(() => {
    const d = data?.vendidoEm?.toDate?.() || null;
    if (!d) return "";
    return d.toLocaleString("pt-BR");
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <p className="text-zinc-400">Carregando comprovante...</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <p className="text-red-400 font-bold">Erro</p>
          <p className="text-zinc-300 mt-2">{erro}</p>
        </div>
      </main>
    );
  }

  const lojaNome = data?.lojaNome || "KING OF CELL";
  const marca = data?.marca || "-";
  const modelo = data?.modelo || "-";
  const valorEstimado =
    typeof data?.valorEstimado === "number" ? formatBRL(data.valorEstimado) : "-";
  const valorVendido =
    typeof data?.valorVendido === "number" ? formatBRL(data.valorVendido) : "-";

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Barra simples (não imprime) */}
      <div className="print:hidden sticky top-0 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-zinc-400 text-sm">Comprovante</p>
          <button
            onClick={() => window.print()}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl font-extrabold"
          >
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Conteúdo do “PDF” */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
          {/* Cabeçalho (aqui você pode colocar sua logo se quiser depois) */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-extrabold">{lojaNome}</p>
              <p className="text-zinc-400 text-sm">Comprovante de Venda</p>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-sm">Data</p>
              <p className="font-bold">{vendidoEmTexto || "-"}</p>
            </div>
          </div>

          <hr className="border-zinc-800 my-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-400">Aparelho</p>
              <p className="text-lg font-extrabold mt-1">
                {marca} • {modelo}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-400">Valores</p>
              <p className="mt-2">
                <b>Valor original:</b> {valorEstimado}
              </p>
              <p className="mt-1">
                <b>Valor vendido:</b>{" "}
                <span className="text-green-400 font-extrabold">{valorVendido}</span>
              </p>
            </div>
          </div>

          <p className="text-zinc-500 text-xs mt-6">
            Documento gerado automaticamente.
          </p>
        </div>
      </div>

      {/* Ajuste de impressão: mantém fundo preto e remove margens estranhas */}
      <style jsx global>{`
        @media print {
          html, body {
            background: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
