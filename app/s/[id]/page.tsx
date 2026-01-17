"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function safeNum(v: any) {
  return typeof v === "number" && isFinite(v) ? v : null;
}
function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function ShareOSPage() {
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [data, setData] = useState<ShareOS | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErro("");
      setData(null);

      try {
        if (!id) {
          setErro("Link inválido (sem ID).");
          return;
        }

        const snap = await getDoc(doc(db, "shares", id));
        if (!snap.exists()) {
          setErro("Comprovante não encontrado (ID inválido ou expirado).");
          return;
        }

        const d: any = snap.data();
        const obj: ShareOS = {
          lojaNome: safeStr(d.lojaNome) || "KING OF CELL",
          cliente: safeStr(d.cliente),
          marca: safeStr(d.marca),
          modelo: safeStr(d.modelo),
          reparos: safeArr(d.reparos),
          estado: safeArr(d.estado),
          valorTotal: safeNum(d.valorTotal),
          fotosAntes: safeArr(d.fotosAntes),
          fotosDepois: safeArr(d.fotosDepois),
        };
        setData(obj);
      } catch (e: any) {
        console.error("ERRO /s/[id]:", e);
        setErro(e?.message || "Erro ao abrir o comprovante.");
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [id]);

  const lojaNome = useMemo(() => safeStr(data?.lojaNome) || "KING OF CELL", [data]);
  const cliente = useMemo(() => safeStr(data?.cliente) || "-", [data]);
  const marca = useMemo(() => safeStr(data?.marca) || "-", [data]);
  const modelo = useMemo(() => safeStr(data?.modelo) || "-", [data]);
  const valorTotal = useMemo(() => safeNum(data?.valorTotal), [data]);
  const reparos = useMemo(() => safeArr(data?.reparos), [data]);
  const estado = useMemo(() => safeArr(data?.estado), [data]);
  const fotosAntes = useMemo(() => safeArr(data?.fotosAntes), [data]);
  const fotosDepois = useMemo(() => safeArr(data?.fotosDepois), [data]);

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-2xl font-extrabold">{lojaNome}</p>
            <p className="text-zinc-400 text-sm">Comprovante / Ordem de Serviço</p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-white text-black px-4 py-2 rounded-xl font-extrabold"
          >
            Imprimir / Salvar PDF
          </button>
        </div>

        {loading && <p className="text-zinc-400">Carregando...</p>}

        {!loading && erro && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
            <p className="text-red-400 font-bold">Não foi possível abrir</p>
            <p className="text-zinc-300 mt-2 break-words">{erro}</p>
            <p className="text-zinc-500 text-xs mt-4 break-words">ID: {id || "-"}</p>
          </div>
        )}

        {!loading && !erro && data && (
          <>
            <div className="border-t border-zinc-800 pt-4 space-y-2">
              <p><b>Cliente:</b> {cliente}</p>
              <p><b>Aparelho:</b> {marca} • {modelo}</p>
              <p>
                <b>Valor Final:</b>{" "}
                <span className="text-green-400 font-extrabold">
                  {typeof valorTotal === "number" ? formatBRL(valorTotal) : "-"}
                </span>
              </p>
            </div>

            <div className="mt-5">
              <p className="font-bold mb-2">Serviços</p>
              <ul className="list-disc pl-6 text-zinc-200">
                {reparos.length ? reparos.map((r, i) => <li key={i}>{r}</li>) : <li>-</li>}
              </ul>
            </div>

            <div className="mt-5">
              <p className="font-bold mb-2">Estado do aparelho</p>
              <ul className="list-disc pl-6 text-zinc-200">
                {estado.length ? estado.map((e, i) => <li key={i}>{e}</li>) : <li>-</li>}
              </ul>
            </div>

            <div className="mt-6">
              <p className="font-bold mb-2">Fotos (Antes)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {fotosAntes.length
                  ? fotosAntes.map((src, i) => (
                      <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded-xl border border-zinc-800" />
                    ))
                  : <p className="text-zinc-400">Nenhuma foto.</p>}
              </div>
            </div>

            <div className="mt-6">
              <p className="font-bold mb-2">Fotos (Depois)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {fotosDepois.length
                  ? fotosDepois.map((src, i) => (
                      <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded-xl border border-zinc-800" />
                    ))
                  : <p className="text-zinc-400">Nenhuma foto.</p>}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { background: #000 !important; }
          button { display: none !important; }
        }
      `}</style>
    </main>
  );
}
