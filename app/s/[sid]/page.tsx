"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type ShareDoc = {
  lojaNome?: string;
  cliente?: string;
  modelo?: string;
  reparos?: string[];
  estado?: string[];
  valorTotal?: number | null;
  status?: string;
  fotosAntes?: string[];
  fotosDepois?: string[];
  criadoEm?: any;
};

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function SharePdfPage() {
  const params = useParams();
  const sid = String(params?.sid || "");

  const [data, setData] = useState<ShareDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      setLoading(true);
      const snap = await getDoc(doc(db, "shares", sid));
      setData(snap.exists() ? (snap.data() as any) : null);
      setLoading(false);
    }
    if (sid) run();
  }, [sid]);

  const fotosAntes = useMemo(() => data?.fotosAntes || [], [data]);
  const fotosDepois = useMemo(() => data?.fotosDepois || [], [data]);

  function baixarPDF() {
    // impressão -> salvar como PDF
    window.print();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <p>Carregando...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <p className="text-red-400">Link inválido ou expirado.</p>
      </main>
    );
  }

  return (
    <>
      {/* Ajustes pra impressão sair igual (preto + sem cortar) */}
      <style jsx global>{`
        @media print {
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #000 !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
          .no-print { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #333 !important; }
        }
      `}</style>

      <main className="min-h-screen bg-black text-white p-6">
        {/* Barra de ações (não imprime) */}
        <div className="no-print flex flex-wrap gap-2 mb-6">
          <button
            onClick={baixarPDF}
            className="bg-yellow-500 text-black px-4 py-2 rounded font-bold"
          >
            Baixar PDF
          </button>
        </div>

        <div className="card bg-zinc-950 border border-zinc-800 rounded p-6">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{data.lojaNome || "KING OF CELL"}</h1>
              <p className="text-zinc-300">Ordem de Serviço</p>
            </div>
            {/* Se você tiver um logo em public/logo.png, ele aparece */}
            <img
              src="/logo.png"
              alt="Logo"
              className="w-24 h-24 object-contain"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          </div>

          <hr className="border-zinc-800 my-4" />

          {/* Dados */}
          <p><b>Cliente:</b> {data.cliente || "-"}</p>
          <p><b>Marca:</b> {ordem.marca || "-"}</p>
          <p><b>Modelo:</b> {ordem.modelo || "-"}</p>
          <p><b>Status:</b> {data.status || "-"}</p>

          <p className="mt-2">
            <b>Valor final:</b>{" "}
            <span className="text-green-400 font-bold">
              {typeof data.valorTotal === "number" ? formatBRL(data.valorTotal) : "-"}
            </span>
          </p>

          {/* Reparos */}
          <div className="mt-4">
            <p className="font-bold mb-2">Reparos</p>
            <ul className="list-disc pl-6 text-zinc-200">
              {(data.reparos || []).map((r, i) => <li key={i}>{r}</li>)}
              {(data.reparos || []).length === 0 && <li>-</li>}
            </ul>
          </div>

          {/* Estado */}
          <div className="mt-4">
            <p className="font-bold mb-2">Estado do aparelho</p>
            <ul className="list-disc pl-6 text-zinc-200">
              {(data.estado || []).map((e, i) => <li key={i}>{e}</li>)}
              {(data.estado || []).length === 0 && <li>-</li>}
            </ul>
          </div>

          {/* Fotos */}
          <div className="mt-6">
            <p className="font-bold mb-2">Fotos (Antes)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fotosAntes.map((src, i) => (
                <img key={i} src={src} className="rounded border border-zinc-800" alt={`Antes ${i+1}`} />
              ))}
              {fotosAntes.length === 0 && <p className="text-zinc-400">-</p>}
            </div>
          </div>

          <div className="mt-6">
            <p className="font-bold mb-2">Fotos (Depois)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fotosDepois.map((src, i) => (
                <img key={i} src={src} className="rounded border border-zinc-800" alt={`Depois ${i+1}`} />
              ))}
              {fotosDepois.length === 0 && <p className="text-zinc-400">-</p>}
            </div>
          </div>

          <p className="text-zinc-400 mt-6 text-sm">
            Documento gerado por {data.lojaNome || "KING OF CELL"}.
          </p>
        </div>
      </main>
    </>
  );
}
