"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function HomePage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
      else setCarregando(false);
    });

    const unsubOrdens = onSnapshot(collection(db, "ordens"), (snap) => {
      setOrdens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    const unsubVendas = onSnapshot(collection(db, "vendas"), (snap) => {
      setVendas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => {
      unsubAuth();
      unsubOrdens();
      unsubVendas();
    };
  }, [router]);

  const resumo = useMemo(() => {
    const custoOS = ordens
      .filter((o) => o.status === "Concluído")
      .reduce((s, o) => s + (typeof o.valorPeca === "number" ? o.valorPeca : 0), 0);

    const ganhoOS = ordens
      .filter((o) => o.status === "Concluído")
      .reduce((s, o) => s + (typeof o.valorTotal === "number" ? o.valorTotal : 0), 0);

    const lucroOS = ordens
      .filter((o) => o.status === "Concluído")
      .reduce((s, o) => s + (typeof o.lucro === "number" ? o.lucro : 0), 0);

    const custoVendas = vendas.reduce(
      (s, v) => s + (typeof v.custo === "number" ? v.custo : 0),
      0
    );

    const ganhoVendas = vendas.reduce(
      (s, v) => s + (typeof v.valorTotal === "number" ? v.valorTotal : 0),
      0
    );

    const lucroVendas = vendas.reduce(
      (s, v) =>
        s +
        (typeof v.lucro === "number"
          ? v.lucro
          : (typeof v.valorTotal === "number" ? v.valorTotal : 0) -
            (typeof v.custo === "number" ? v.custo : 0)),
      0
    );

    return {
      custo: custoOS + custoVendas,
      ganho: ganhoOS + ganhoVendas,
      lucro: lucroOS + lucroVendas,
    };
  }, [ordens, vendas]);

  if (carregando) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <h1 className="text-3xl font-extrabold tracking-wide mb-1">King OS</h1>
          <p className="text-zinc-400 mb-6">Escolha o que você quer fazer</p>

          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/custos"
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center"
              >
                <div className="text-xs text-zinc-400">Custo</div>
                <div className="text-red-400 font-extrabold">
                  R$ {resumo.custo.toFixed(2)}
                </div>
              </Link>

              <Link
                href="/ganhos"
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center"
              >
                <div className="text-xs text-zinc-400">Ganho</div>
                <div className="text-yellow-400 font-extrabold">
                  R$ {resumo.ganho.toFixed(2)}
                </div>
              </Link>

              <Link
                href="/ganhos"
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center"
              >
                <div className="text-xs text-zinc-400">Lucro</div>
                <div className="text-green-400 font-extrabold">
                  R$ {resumo.lucro.toFixed(2)}
                </div>
              </Link>
            </div>

            <Link
              href="/ordens"
              className="w-full text-center bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-2xl font-extrabold"
            >
              Nova Ordem
            </Link>

            <Link
              href="/dashboard"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Ordens Ativas
            </Link>

            <Link
              href="/concluidas"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Concluídas
            </Link>

            <Link
              href="/vendas"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Vendas
            </Link>

            <Link
              href="/estoque"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Estoque
            </Link>

            <Link
              href="/ganhos"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Ganhos
            </Link>

            <Link
              href="/historico"
              className="w-full text-center bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
            >
              Histórico
            </Link>

            <Link
              href="/logout"
              className="w-full text-center bg-red-500 hover:bg-red-400 text-black py-3 rounded-2xl font-extrabold"
            >
              Sair
            </Link>
          </div>

          <p className="text-zinc-500 text-xs mt-5">
            "Sair" aparece só aqui na Home.
          </p>
        </div>
      </div>
    </main>
  );
}
