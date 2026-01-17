"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Share = {
  lojaNome?: string;
  cliente?: string;
  telefone?: string;
  marca?: string;
  modelo?: string;
  reparos?: string[];
  estado?: string[];
  valorTotal?: number | null;
  fotosAntes?: string[];
  fotosDepois?: string[];
  osId?: string;
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

export default function SharePublicPage() {
  const params = useParams();
  const search = useSearchParams();

  // ✅ pega ID tanto por /s/[id] quanto por /s?id=...
  const idFromParams =
    (params as any)?.id ||
    (params as any)?.shareId ||
    (params as any)?.slug ||
    "";
  const idFromQuery = search?.get("id") || "";

  const id = String(idFromParams || idFromQuery || "").trim();

  const [share, setShare] = useState<Share | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function run() {
      setLoading(true);
      setMsg("");
      setShare(null);

      if (!id) {
        setLoading(false);
        setMsg(`Link inválido (sem ID).\n\nID: ${id || "-"}`);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "shares", id));
        if (!snap.exists()) {
          setMsg("Link inválido (documento não existe).");
          setShare(null);
        } else {
          const d: any = snap.data();
          setShare({
            lojaNome: safeStr(d.lojaNome),
            cliente: safeStr(d.cliente),
            telefone: safeStr(d.telefone),
            marca: safeStr(d.marca),
            modelo: safeStr(d.modelo),
            reparos: safeArr(d.reparos),
            estado: safeArr(d.estado),
            valorTotal: safeNum(d.valorTotal),
            fotosAntes: safeArr(d.fotosAntes),
            fotosDepois: safeArr(d.fotosDepois),
            osId: safeStr(d.osId),
          });
        }
      } catch (e: any) {
        console.error("ERRO /s/[id]:", e);
        setMsg("Erro ao abrir o link: " + (e?.message || String(e)));
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [id]);

  const fotosAntes = useMemo(() => safeArr(share?.fotosAntes), [share]);
  const fotosDepois = useMemo(() => safeArr(share?.fotosDepois), [share]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold">
          {share?.lojaNome || "KING OF CELL"}
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Comprovante / Orçamento
        </p>

        {loading && <p className="text-zinc-400 mt-6">Carregando...</p>}

        {!loading && msg && (
          <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
            <p className="text-yellow-300 font-bold">Não foi possível abrir</p>
            <pre className="text-zinc-300 text-sm whitespace-pre-wrap mt-2">
              {msg}
            </pre>
          </div>
        )}

        {!loading && share && (
          <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xl font-extrabold">{share.cliente || "-"}</p>
            <p className="text-zinc-400">
              {(share.marca || "-") + " • " + (share.modelo || "-")}
            </p>

            <p className="mt-4">
              <b>Valor final:</b>{" "}
              <span className="text-green-400 font-extrabold">
                {typeof share.valorTotal === "number"
                  ? formatBRL(share.valorTotal)
                  : "-"}
              </span>
            </p>

            <hr className="border-zinc-800 my-5" />

            <p className="font-bold mb-2">Serviços</p>
            <ul className="list-disc pl-6 text-zinc-200">
              {(share.reparos || []).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
              {(share.reparos || []).length === 0 && <li>-</li>}
            </ul>

            <p className="font-bold mt-5 mb-2">Estado do aparelho</p>
            <ul className="list-disc pl-6 text-zinc-200">
              {(share.estado || []).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {(share.estado || []).length === 0 && <li>-</li>}
            </ul>

            <p className="font-bold mt-6 mb-2">Fotos (Antes)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {fotosAntes.map((src: string, i: number) => (
                <img
                  key={i}
                  src={src}
                  alt={`Antes ${i + 1}`}
                  className="rounded-xl border border-zinc-800"
                />
              ))}
              {fotosAntes.length === 0 && (
                <p className="text-zinc-400">Sem fotos.</p>
              )}
            </div>

            <p className="font-bold mt-6 mb-2">Fotos (Depois)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fotosDepois.map((src: string, i: number) => (
                <img
                  key={i}
                  src={src}
                  alt={`Depois ${i + 1}`}
                  className="rounded-xl border border-zinc-800"
                />
              ))}
              {fotosDepois.length === 0 && (
                <p className="text-zinc-400">Sem fotos.</p>
              )}
            </div>

            <button
              className="mt-7 w-full bg-white text-black px-6 py-3 rounded-2xl font-extrabold"
              onClick={() => window.print()}
            >
              Imprimir / Salvar PDF
            </button>

            <p className="text-zinc-500 text-xs mt-3">
              Dica: no celular, use “Compartilhar / Imprimir” e selecione “Salvar
              como PDF”.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
