"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type ShareDoc = {
  cliente?: string;
  telefone?: string;
  marca?: string;
  modelo?: string;
  reparos?: string[];
  estado?: string[];
  valorTotal?: number | null; // cliente vê
  status?: string;
  fotosAntes?: string[];
  fotosDepois?: string[];
};

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function SharePdfPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [data, setData] = useState<ShareDoc | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const snap = await getDoc(doc(db, "shares", id));
      setData(snap.exists() ? (snap.data() as any) : null);
      setCarregando(false);
    }
    if (id) carregar();
  }, [id]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-zinc-400">Carregando PDF...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">Link inválido ou expirado.</p>
      </main>
    );
  }

  const fotosAntes = data.fotosAntes || [];
  const fotosDepois = data.fotosDepois || [];

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* MENU (não imprime) */}
      <div className="print:hidden flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => window.print()}
          className="bg-yellow-500 text-black px-4 py-2 rounded font-bold"
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* CONTEÚDO */}
      <div className="border border-zinc-800 rounded p-4">
        <h1 className="text-2xl font-bold mb-2">KING OF CELL</h1>

        <div className="space-y-1">
          <p><b>Cliente:</b> {data.cliente || "-"}</p>
          <p><b>Marca:</b> {data.marca || "-"}</p>
          <p><b>Modelo:</b> {data.modelo || "-"}</p>
          <p><b>Status:</b> {data.status || "-"}</p>

          <p>
            <b>Valor final:</b>{" "}
            <span className="text-green-400 font-bold">
              {typeof data.valorTotal === "number" ? formatBRL(data.valorTotal) : "-"}
            </span>
          </p>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Reparos</p>
          <ul className="list-disc pl-6 text-zinc-200">
            {(data.reparos || []).map((r, i) => <li key={i}>{r}</li>)}
            {(data.reparos || []).length === 0 && <li>-</li>}
          </ul>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Estado do aparelho</p>
          <ul className="list-disc pl-6 text-zinc-200">
            {(data.estado || []).map((e, i) => <li key={i}>{e}</li>)}
            {(data.estado || []).length === 0 && <li>-</li>}
          </ul>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Antes)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fotosAntes.map((src, i) => (
              <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded border border-zinc-700" />
            ))}
            {fotosAntes.length === 0 && <p className="text-zinc-400">-</p>}
          </div>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Depois)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fotosDepois.map((src, i) => (
              <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded border border-zinc-700" />
            ))}
            {fotosDepois.length === 0 && <p className="text-zinc-400">-</p>}
          </div>
        </div>
      </div>

      {/* CSS de impressão: fundo preto */}
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
