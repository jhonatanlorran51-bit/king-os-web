"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

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

  const status = item?.status || "Em estoque";
  const isVendido = status === "Vendido";

  async function marcarComoVendido() {
    const v = toNum(valorVendido);
    if (v === null) return alert("Preencha o valor real vendido.");

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
      setMsg("Marcado como Vendido!");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  // ✅ Só existe quando já estava vendido e cliente desistiu => volta a "Em estoque" (Disponível)
  async function cancelarVenda() {
    const ok = confirm("Cancelar a venda? Vai voltar para DISPONÍVEL (Em estoque).");
    if (!ok) return;

    setSalvando(true);
    setMsg("");
    try {
      await updateDoc(doc(db, "vendas", id), {
        status: "Em estoque",
        valorVendido: null,
        vendidoEm: null,
        lucro: null,
        canceladoEm: new Date(), // só histórico interno
      });
      await carregar();
      setMsg("Venda cancelada. Aparelho voltou para DISPONÍVEL.");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Erro ao cancelar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirVenda() {
    const ok = confirm("EXCLUIR este aparelho? (não dá para desfazer)");
    if (!ok) return;

    setSalvando(true);
    setMsg("");
    try {
      await deleteDoc(doc(db, "vendas", id));
      alert("Excluído com sucesso!");
      router.replace("/vendas");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Erro ao excluir.");
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
            <p className="text-xl font-extrabold">
              {(item.marca || "-") + " • " + (item.modelo || "-")}
            </p>

            <div className="mt-4 text-sm text-zinc-300 space-y-1">
              <p>
                <b>Status:</b>{" "}
                {isVendido ? (
                  <span className="text-green-400 font-bold">Vendido</span>
                ) : (
                  <span className="text-blue-400 font-bold">Disponível</span>
                )}
              </p>
              <p><b>Pago no aparelho:</b> {typeof item.valorAparelho === "number" ? formatBRL(item.valorAparelho) : "-"}</p>
              <p><b>Pago nas peças:</b> {typeof item.valorPecas === "number" ? formatBRL(item.valorPecas) : "-"}</p>
              <p><b>Custo total:</b> {formatBRL(custo)}</p>
              <p><b>Estimado:</b> {typeof item.valorEstimado === "number" ? formatBRL(item.valorEstimado) : "-"}</p>
              <p><b>Vendido:</b> {typeof item.valorVendido === "number" ? formatBRL(item.valorVendido) : "-"}</p>
            </div>

            <hr className="border-zinc-800 my-5" />

            <p className="font-bold mb-2">Valor real vendido</p>
            <input
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
              placeholder="Valor real vendido"
              value={valorVendido}
              onChange={(e) => setValorVendido(e.target.value)}
              disabled={salvando}
            />

            {lucroVenda !== null && (
              <p className="mt-2 text-sm text-zinc-300">
                Lucro (se vender por esse valor):{" "}
                <b className={lucroVenda >= 0 ? "text-green-400" : "text-red-400"}>
                  {formatBRL(lucroVenda)}
                </b>
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={marcarComoVendido}
                disabled={salvando}
                className="bg-green-600 hover:bg-green-500 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Marcar como Vendido"}
              </button>

              {/* ✅ SOMENTE QUANDO JÁ ESTÁ VENDIDO */}
              {isVendido && (
                <button
                  onClick={cancelarVenda}
                  disabled={salvando}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
                >
                  Cancelar venda
                </button>
              )}

              {/* ✅ SEMPRE PODE EXCLUIR */}
              <button
                onClick={excluirVenda}
                disabled={salvando}
                className="bg-red-500 hover:bg-red-400 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
              >
                Excluir
              </button>
            </div>

            {!isVendido && (
              <p className="text-zinc-500 text-xs mt-4">
                Em <b>Disponível</b>, não existe “Cancelar venda” (porque ainda não foi vendido).
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}


