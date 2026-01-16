"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

function toNum(v: string) {
  const n = Number(v.replace(",", "."));
  return isFinite(n) ? n : null;
}

export default function NovaVendaPage() {
  const router = useRouter();

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");

  const [valorAparelho, setValorAparelho] = useState("");
  const [valorPecas, setValorPecas] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");

  const [salvando, setSalvando] = useState(false);

  const calc = useMemo(() => {
    const a = toNum(valorAparelho);
    const p = toNum(valorPecas);
    const e = toNum(valorEstimado);
    const custo = (a || 0) + (p || 0);
    return { a, p, e, custo };
  }, [valorAparelho, valorPecas, valorEstimado]);

  async function salvar() {
    if (!marca.trim() || !modelo.trim()) {
      alert("Preencha Marca e Modelo.");
      return;
    }
    if (calc.a === null || calc.p === null || calc.e === null) {
      alert("Preencha os valores corretamente.");
      return;
    }

    setSalvando(true);
    try {
      const ref = await addDoc(collection(db, "vendas"), {
        marca: marca.trim(),
        modelo: modelo.trim(),

        // custos (investimento)
        valorAparelho: calc.a, // pagou no aparelho
        valorPecas: calc.p,    // pagou nas peças
        valorEstimado: calc.e, // estimado de venda

        // depois você preenche
        valorVendido: null,
        status: "Em estoque",

        criadoEm: serverTimestamp(),
      });

      alert("Aparelho cadastrado!");
      router.replace(`/vendas/${ref.id}`);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar. Se aparecer permissão, confira as Rules do Firestore.");
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
          <span className="text-zinc-400 text-sm">Nova Venda</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h1 className="text-2xl font-extrabold mb-5">Adicionar aparelho</h1>

          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
                placeholder="Marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
                placeholder="Modelo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              />
            </div>

            <p className="text-zinc-400 text-sm mt-2">Investimento (vai ser descontado do vendido)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
                placeholder="Valor pago no aparelho"
                value={valorAparelho}
                onChange={(e) => setValorAparelho(e.target.value)}
              />
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
                placeholder="Valor pago nas peças"
                value={valorPecas}
                onChange={(e) => setValorPecas(e.target.value)}
              />
            </div>

            <input
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700"
              placeholder="Valor estimado de venda"
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
            />

            <div className="text-zinc-300 text-sm mt-2">
              <b>Custo total:</b> R$ {(calc.custo || 0).toFixed(2)}
            </div>

            <button
              onClick={salvar}
              disabled={salvando}
              className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
