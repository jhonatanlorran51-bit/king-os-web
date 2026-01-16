"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function toNum(v: string) {
  const n = Number(v.replace(",", "."));
  return isFinite(n) ? n : null;
}

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export default function VendaDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [valorVendido, setValorVendido] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    setLoading(true);
    setMsg("");
    try {
      const snap = await getDoc(doc(db, "vendas", id));
      if (!snap.exists()) {
        setItem(null);
        setMsg("Venda não encontrada.");
      } else {
        const d = snap.data() as any;
        setItem({ id: snap.id, ...d });
        setValorVendido(typeof d.valorVendido === "number" ? String(d.valorVendido) : "");
      }
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Erro ao abrir venda.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) carregar();
  }, [id]);

  const custo = useMemo(() => {
    const a = typeof item?.valorAparelho === "number" ? item.valorAparelho : 0;
    const p = typeof item?.valorPecas === "number" ? item.valorPecas : 0;
    return a + p;
  }, [item]);

  const lucroVenda = useMemo(() => {
    const v = toNum(valorVendido);
    if (v === null) return null;
    return v - custo;
  }, [valorVendido, custo]);

  async function salvarVenda() {
    const v = toNum(valorVendido);
    if (v === null) {
      alert("Preencha o valor real vendido.");
      return;
    }

    setSalvando(true);
    setMsg("");
    try {
      await updateDoc(doc(db, "vendas", id), {
        valorVendido: v,
        status: "Vendido",
        vendidoEm: new Date(),
        lucro: v - custo,
      });
      await carregar();
      setMsg("Venda atualizada!");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold"
          >
            Voltar
          </button>
          <span className="text-zinc-400 text-sm">Detalhe da Venda</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading && <p className="text-zinc-400">Carregando...</p>}

        {!loading && msg && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
            <p className="text-zinc-300 text-sm break-words">{msg}</p>
          </div>
        )}

        {!loading && item && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <p className="text-xl font-extrabold">{item.cliente || "-"}</p>
            <p className="text-zinc-400">
              {(item.marca || "-") + " • " + (item.modelo || "-")}
            </p>

            <div className="mt-4 text-sm text-zinc-300 space-y-1">
              <p><b>Pago no aparelho:</b> {typeof item.valorAparelho === "number" ? formatBRL(item.valorAparelho) : "-"}</p>
              <p><b>Pago nas peças:</b> {typeof item.valorPecas === "number" ? formatBRL(item.valorPecas) : "-"}</p>
              <p><b>Custo total:</b> {formatBRL(custo)}</p>
              <p><b>Estimado:</b> {typeof item.valorEstimado === "number" ? formatBRL(item.valorEstimado) : "-"}</p>
              <p><b>Status:</b> {item.status || "Em estoque"}</p>
            </div>

            <hr className="border-zinc-800 my-5" />

            <p className="font-bold mb-2">Finalizar venda</p>

            <input
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
              placeholder="Valor real vendido"
              value={valorVendido}
              onChange={(e) => setValorVendido(e.target.value)}
            />

            {lucroVenda !== null && (
              <p className="mt-2 text-sm text-zinc-300">
                Lucro desta venda:{" "}
                <b className={lucroVenda >= 0 ? "text-green-400" : "text-red-400"}>
                  {formatBRL(lucroVenda)}
                </b>
              </p>
            )}

            <button
              onClick={salvarVenda}
              disabled={salvando}
              className="mt-4 bg-green-600 hover:bg-green-500 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Marcar como Vendido"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
