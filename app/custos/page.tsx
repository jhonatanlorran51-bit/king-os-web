"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useRouter } from "next/navigation";

type Ordem = {
  id: string;
  status?: string;
  valorPeca?: number;   // custo
  valorTotal?: number;  // faturamento ao cliente
  lucro?: number;       // lucro real
  criadoEm?: any;
};

function inicioDoDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function inicioDoMes() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CustosPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "ordens")).then((snap) => {
      setOrdens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setCarregando(false);
    });
  }, []);

  const hoje = inicioDoDia();
  const mes = inicioDoMes();

  const resumo = useMemo(() => {
    let custoHoje = 0;
    let custoMes = 0;

    let faturamentoHoje = 0;
    let faturamentoMes = 0;

    let lucroHoje = 0;
    let lucroMes = 0;

    for (const o of ordens) {
      if (o.status !== "Concluído") continue;
      const data = o.criadoEm?.toDate?.();
      if (!data) continue;

      const custo = o.valorPeca || 0;
      const faturamento = o.valorTotal || 0;
      const lucro = o.lucro ?? (faturamento - custo);

      if (data >= hoje) {
        custoHoje += custo;
        faturamentoHoje += faturamento;
        lucroHoje += lucro;
      }
      if (data >= mes) {
        custoMes += custo;
        faturamentoMes += faturamento;
        lucroMes += lucro;
      }
    }

    return {
      custoHoje,
      custoMes,
      faturamentoHoje,
      faturamentoMes,
      lucroHoje,
      lucroMes,
    };
  }, [ordens]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* MENU */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => router.back()} className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Voltar
        </button>
        <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Custos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Custo hoje (peças)</p>
          <p className="text-2xl font-bold text-red-400">
            R$ {resumo.custoHoje.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Custo do mês (peças)</p>
          <p className="text-2xl font-bold text-red-400">
            R$ {resumo.custoMes.toFixed(2)}
          </p>
        </div>
      </div>

      {/* EXTRA: comparativo (te ajuda MUITO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Faturamento hoje</p>
          <p className="text-xl font-bold text-green-300">
            R$ {resumo.faturamentoHoje.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Lucro hoje</p>
          <p className="text-xl font-bold text-green-400">
            R$ {resumo.lucroHoje.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Lucro do mês</p>
          <p className="text-xl font-bold text-green-400">
            R$ {resumo.lucroMes.toFixed(2)}
          </p>
        </div>
      </div>
    </main>
  );
}
