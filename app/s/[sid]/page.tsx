"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type ShareOS = {
  lojaNome?: string;
  cliente?: string;
  marca?: string;
  modelo?: string;
  reparos?: string[];
  estado?: string[];
  valorTotal?: number | null;
  fotosAntes?: string[];
  fotosDepois?: string[];
};

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}
function safeArr(v: any) {
  return Array.isArray(v) ? v : [];
}
function safeNum(v: any) {
  return typeof v === "number" && isFinite(v) ? v : null;
}
function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function SharePage({ params }: { params: { id: string } }) {
  const id = String(params?.id || "");

  const [data, setData] = useState<ShareOS | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErr("Link inválido (sem ID).");
      return;
    }

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const snap = await getDoc(doc(db, "shares", id));
        if (!snap.exists()) {
          setData(null);
          setErr("Comprovante não encontrado (link inválido ou foi apagado).");
        } else {
          const d: any = snap.data();
          setData({
            lojaNome: safeStr(d.lojaNome) || "KING OF CELL",
            cliente: safeStr(d.cliente),
            marca: safeStr(d.marca),
            modelo: safeStr(d.modelo),
            reparos: safeArr(d.reparos),
            estado: safeArr(d.estado),
            valorTotal: safeNum(d.valorTotal),
            fotosAntes: safeArr(d.fotosAntes),
            fotosDepois: safeArr(d.fotosDepois),
          });
        }
      } catch (e: any) {
        console.error(e);
        setErr("Erro ao carregar: " + (e?.message || String(e)));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fotosAntes = useMemo(() => safeArr(data?.fotosAntes), [data]);
  const fotosDepois = useMemo(() => safeArr(data?.fotosDepois), [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <p className="text-zinc-300">Carregando comprovante...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <p className="text-red-400 font-bold">Não foi possível abrir</p>
          <p className="text-zinc-300 mt-2 break-words">{err || "Erro desconhecido."}</p>
          <p className="text-zinc-500 text-xs mt-4 break-words">ID: {id || "-"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div id="printArea" className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-2xl font-extrabold">{data.lojaNome || "KING OF CELL"}</p>
            <p className="text-zinc-400 text-sm">Comprovante / Ordem de Serviço</p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-white text-black px-4 py-2 rounded-xl font-extrabold"
          >
            Baixar / Imprimir PDF
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-2">
          <p><b>Cliente:</b> {data.cliente || "-"}</p>
          <p><b>Aparelho:</b> {(data.marca || "-") + " • " + (data.modelo || "-")}</p>

          <p>
            <b>Valor Final:</b>{" "}
            <span className="text-green-400 font-extrabold">
              {typeof data.valorTotal === "number" ? formatBRL(data.valorTotal) : "-"}
            </span>
          </p>
        </div>

        <div className="mt-5">
          <p className="font-bold mb-2">Serviços</p>
          <ul className="list-disc pl-6 text-zinc-200">
            {safeArr(data.reparos).length
              ? safeArr(data.reparos).map((r: string, i: number) => <li key={i}>{r}</li>)
              : <li>-</li>}
          </ul>
        </div>

        <div className="mt-5">
          <p className="font-bold mb-2">Estado do aparelho</p>
          <ul className="list-disc pl-6 text-zinc-200">
            {safeArr(data.estado).length
              ? safeArr(data.estado).map((e: string, i: number) => <li key={i}>{e}</li>)
              : <li>-</li>}
          </ul>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Antes)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fotosAntes.length ? fotosAntes.map((src: string, i: number) => (
              <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded-xl border border-zinc-800" />
            )) : <p className="text-zinc-400">Nenhuma foto.</p>}
          </div>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Depois)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fotosDepois.length ? fotosDepois.map((src: string, i: number) => (
              <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded-xl border border-zinc-800" />
            )) : <p className="text-zinc-400">Nenhuma foto.</p>}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: #000 !important; }
          button { display: none !important; }
          #printArea {
            border: none !important;
            background: #000 !important;
            color: #fff !important;
            margin: 0 !important;
            width: 100% !important;
          }
          img { max-width: 100% !important; }
        }
      `}</style>
    </main>
  );
}
