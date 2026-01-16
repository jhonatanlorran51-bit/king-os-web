"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

type Ordem = {
  id: string;
  status?: string;
  lucro?: number;
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

export default function HomePage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
      else setCarregando(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    getDocs(collection(db, "ordens")).then((snap) => {
      setOrdens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, []);

  const hoje = inicioDoDia();
  const mes = inicioDoMes();

  const resumo = useMemo(() => {
    let hojeTotal = 0;
    let mesTotal = 0;

    for (const o of ordens) {
      if (o.status !== "Concluído") continue;
      const data = o.criadoEm?.toDate?.();
      const lucro = o.lucro || 0;

      if (data && data >= hoje) hojeTotal += lucro;
      if (data && data >= mes) mesTotal += lucro;
    }
    return { hojeTotal, mesTotal };
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
      <h1 className="text-3xl font-bold mb-6 text-center">King OS</h1>

      {/* LUCRO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Lucro hoje</p>
          <p className="text-2xl font-bold text-green-400">
            R$ {resumo.hojeTotal.toFixed(2)}
          </p>
        </div>

        <div className="bg-zinc-900 p-4 rounded">
          <p className="text-zinc-400">Lucro do mês</p>
          <p className="text-2xl font-bold text-green-400">
            R$ {resumo.mesTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* BOTÕES SÓ AQUI (SEM CABEÇALHO) */}
      <div className="flex flex-col items-center gap-3">
        <Link href="/ordens" className="w-72 text-center bg-yellow-500 text-black py-3 rounded font-bold">
          Nova Ordem
        </Link>

        <Link href="/dashboard" className="w-72 text-center bg-zinc-800 py-3 rounded font-bold">
          Ordens Ativas
        </Link>

        <Link href="/concluidas" className="w-72 text-center bg-zinc-700 py-3 rounded font-bold">
          Concluídas
        </Link>

        <Link href="/historico" className="w-72 text-center bg-zinc-700 py-3 rounded font-bold">
          Histórico
        </Link>

        <Link href="/custos" className="w-72 text-center bg-blue-500 text-black py-3 rounded font-bold">
          Custos
        </Link>

        <Link href="/logout" className="w-72 text-center bg-red-500 text-black py-3 rounded font-bold">
          Sair
        </Link>
      </div>
    </main>
  );
}
