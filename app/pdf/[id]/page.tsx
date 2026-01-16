"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Ordem = {
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

function osCurta(id: string) {
  const tail = (id || "").slice(-6).toUpperCase();
  return tail ? `OS #${tail}` : "OS";
}
function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function PdfInternoPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      const snap = await getDoc(doc(db, "ordens", id));
      setOrdem(snap.exists() ? (snap.data() as any) : null);
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

  if (!ordem) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">Ordem não encontrada.</p>
      </main>
    );
  }

  const fotosAntes = ordem.fotosAntes || [];
  const fotosDepois = ordem.fotosDepois || [];

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* MENU (não imprime) */}
      <div className="print:hidden flex flex-wrap gap-2 mb-6">
        <button onClick={() => router.back()} className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Voltar
        </button>
        <Link href={`/ordem/${id}`} className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Detalhes da OS
        </Link>
        <button onClick={() => window.print()} className="bg-yellow-500 text-black px-4 py-2 rounded font-bold">
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* CONTEÚDO DO PDF */}
      <div className="bg-black text-white">
        <div className="border border-zinc-800 rounded p-4">
          <h1 className="text-2xl font-bold mb-2">KING OF CELL</h1>
          <p className="text-zinc-300 mb-4">{osCurta(id)}</p>

          <div className="space-y-1">
            <p><b>Cliente:</b> {ordem.cliente || "-"}</p>
            <p><b>Telefone:</b> {ordem.telefone || "-"}</p>
            <p><b>Marca:</b> {ordem.marca || "-"}</p>
            <p><b>Modelo:</b> {ordem.modelo || "-"}</p>
            <p><b>Status:</b> {ordem.status || "-"}</p>
            <p>
              <b>Valor final:</b>{" "}
              <span className="text-green-400 font-bold">
                {typeof ordem.valorTotal === "number" ? formatBRL(ordem.valorTotal) : "-"}
              </span>
            </p>
          </div>

          <div className="mt-6">
            <p className="font-bold mb-2">Reparos</p>
            <ul className="list-disc pl-6 text-zinc-200">
              {(ordem.reparos || []).map((r, i) => <li key={i}>{r}</li>)}
              {(ordem.reparos || []).length === 0 && <li>-</li>}
            </ul>
          </div>

          <div className="mt-6">
            <p className="font-bold mb-2">Estado do aparelho</p>
            <ul className="list-disc pl-6 text-zinc-200">
              {(ordem.estado || []).map((e, i) => <li key={i}>{e}</li>)}
              {(ordem.estado || []).length === 0 && <li>-</li>}
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
