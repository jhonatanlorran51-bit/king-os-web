"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Ordem = {
  cliente?: string;
  modelo?: string;
  reparos?: string[];
  estado?: string[];
  valorTotal?: number | null;   // <-- cliente vê
  // valorPeca?: number;        // <-- NÃO mostrar
  // valorReparo?: number;      // <-- NÃO mostrar
  status?: string;

  dataOS?: any;      // Date/Timestamp
  criadoEm?: any;    // Date/Timestamp

  fotosAntes?: string[];  // Base64
  fotosDepois?: string[]; // Base64
};

function osCurta(id: string) {
  const tail = (id || "").slice(-6).toUpperCase();
  return tail ? `OS #${tail}` : "OS";
}

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

function formatData(ts: any) {
  try {
    const d: Date =
      ts?.toDate?.() ||
      (ts instanceof Date ? ts : null) ||
      null;

    if (!d) return "-";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

export default function PdfPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [ordem, setOrdem] = useState<Ordem | null>(null);

  useEffect(() => {
    async function carregar() {
      const ref = doc(db, "ordens", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setOrdem(snap.data() as any);
    }
    if (id) carregar();
  }, [id]);

  const dataExibicao = useMemo(() => {
    if (!ordem) return "-";
    // prioridade: dataOS > criadoEm
    return formatData(ordem.dataOS) !== "-" ? formatData(ordem.dataOS) : formatData(ordem.criadoEm);
  }, [ordem]);

  if (!ordem) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p>Carregando PDF...</p>
      </main>
    );
  }

  const fotosAntes = (ordem.fotosAntes || []).slice(0, 3);
  const fotosDepois = (ordem.fotosDepois || []).slice(0, 3);

  return (
    <main
      className="bg-black text-white p-8 mx-auto"
      style={{ maxWidth: "100%", width: "100%" }}
    >
      {/* CABEÇALHO */}
      <div className="flex items-center gap-4 border-b border-zinc-600 pb-4 mb-6">
        <Image
          src="/logo.png"
          alt="Logo"
          width={100}
          height={100}
          style={{ objectFit: "contain" }}
        />
        <div>
          <h1 className="text-2xl font-bold">King Of Cell</h1>
          <p className="text-sm text-zinc-300">{osCurta(id)}</p>
          <p className="text-sm text-zinc-300">Data: {dataExibicao}</p>
        </div>
      </div>

      {/* DADOS */}
      <div className="space-y-1">
        <p><b>Cliente:</b> {ordem.cliente || "-"}</p>
       <p><b>Marca:</b> {ordem.marca || "-"}</p>
       <p><b>Modelo:</b> {ordem.modelo || "-"}</p>
        <p><b>Status:</b> {ordem.status || "-"}</p>
      </div>

      <hr className="my-4 border-zinc-600" />

      <h2 className="font-bold mb-2">Reparos</h2>
      <ul className="list-disc pl-6 mb-4 text-zinc-200">
        {(ordem.reparos || []).map((r, i) => (
          <li key={i}>{r}</li>
        ))}
        {(ordem.reparos || []).length === 0 && <li>-</li>}
      </ul>

      <h2 className="font-bold mb-2">Estado do aparelho</h2>
      <ul className="list-disc pl-6 mb-4 text-zinc-200">
        {(ordem.estado || []).map((e, i) => (
          <li key={i}>{e}</li>
        ))}
        {(ordem.estado || []).length === 0 && <li>-</li>}
      </ul>

      <hr className="my-4 border-zinc-600" />

      {/* VALOR — CLIENTE VÊ SÓ ISSO */}
      <p className="text-xl font-bold text-green-400">
        Valor total:{" "}
        {typeof ordem.valorTotal === "number" ? formatBRL(ordem.valorTotal) : "-"}
      </p>

      {/* FOTOS ANTES */}
      <div className="mt-6">
        <h2 className="font-bold mb-2">Fotos (Antes)</h2>

        {fotosAntes.length === 0 ? (
          <p className="text-zinc-300">Sem fotos (Antes).</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 pdf-no-break">
            {fotosAntes.map((src, i) => (
              <div key={i} className="border border-zinc-600 rounded p-2">
                <img
                  src={src}
                  alt={`Antes ${i + 1}`}
                  className="w-full h-28 object-cover rounded"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOTOS DEPOIS */}
      <div className="mt-6">
        <h2 className="font-bold mb-2">Fotos (Depois)</h2>

        {fotosDepois.length === 0 ? (
          <p className="text-zinc-300">Sem fotos (Depois).</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 pdf-no-break">
            {fotosDepois.map((src, i) => (
              <div key={i} className="border border-zinc-600 rounded p-2">
                <img
                  src={src}
                  alt={`Depois ${i + 1}`}
                  className="w-full h-28 object-cover rounded"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTÃO (não aparece na impressão) */}
      <div className="mt-8 print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-green-500 text-black px-6 py-3 rounded font-bold"
        >
          Salvar / Imprimir PDF
        </button>
      </div>

      {/* CSS DE IMPRESSÃO (mantém preto no PDF) */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #000 !important;
          }

          @page {
            size: A4;
            margin: 15mm;
          }

          main {
            background: #000 !important;
            color: #fff !important;
            width: 100% !important;
            box-sizing: border-box;
          }

          .pdf-no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          img {
            max-width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}
