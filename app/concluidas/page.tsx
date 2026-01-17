"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Ordem = {
  id: string;
  cliente?: string;
  telefone?: string;
  marca?: string;
  modelo?: string;
  reparos?: string[];
  estado?: string[];
  valorTotal?: number | null;
  status?: string;
  fotosAntes?: string[];
  fotosDepois?: string[];
};

function osCurta(id: string) {
  const tail = (id || "").slice(-6).toUpperCase();
  return tail ? `OS #${tail}` : "OS";
}

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

function normalizarTelefoneBR(telefone?: string) {
  const t = (telefone || "").replace(/\D/g, "");
  if (!t) return "";
  // se já vier com 55, mantém; se não, adiciona 55
  return t.startsWith("55") ? t : `55${t}`;
}

export default function ConcluidasPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const snap = await getDocs(collection(db, "ordens"));
    const lista: Ordem[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
    setOrdens(lista.filter((o) => o.status === "Concluído"));
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function enviarPdfWhatsApp(ordem: Ordem) {
    setEnviandoId(ordem.id);
    try {
      // cria copia publica (o cliente abre sem login)
      const ref = await addDoc(collection(db, "shares"), {
        lojaNome: "KING OF CELL",
        cliente: ordem.cliente || "",
        telefone: ordem.telefone || "",
        marca: ordem.marca || "",
        modelo: ordem.modelo || "",
        reparos: ordem.reparos || [],
        estado: ordem.estado || [],
        valorTotal: typeof ordem.valorTotal === "number" ? ordem.valorTotal : null,
        status: ordem.status || "",
        fotosAntes: ordem.fotosAntes || [],
        fotosDepois: ordem.fotosDepois || [],
        criadoEm: serverTimestamp(),
        origem: "concluidas",
        osId: ordem.id,
      });

      const linkPublico = `${window.location.origin}/s/${ref.id}`;

      const nome = ordem.cliente ? ` ${ordem.cliente}` : "";
      const msg = `Olá${nome}! Segue o PDF do seu serviço ${osCurta(ordem.id)}:\n\n${linkPublico}`;

      const tel = normalizarTelefoneBR(ordem.telefone);
      const waUrl = tel
        ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar link público do cliente. Verifique as Rules da coleção 'shares'.");
    } finally {
      setEnviandoId(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* TOPO LIMPO: só Voltar */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
          >
            Voltar
          </button>

          <span className="text-zinc-400 text-sm">Concluídas</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-4">Ordens Concluídas</h1>

        {carregando && <p className="text-zinc-400">Carregando...</p>}

        {!carregando && ordens.length === 0 && (
          <p className="text-zinc-400">Nenhuma ordem concluída.</p>
        )}

        <div className="space-y-3">
          {ordens.map((o) => (
            <div key={o.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-extrabold">
                    {o.marca ? `${o.marca} • ` : ""}{o.modelo || "-"}
                  </p>
                  <p className="text-zinc-400 text-sm">
                    <b>{osCurta(o.id)}</b> • Cliente: {o.cliente || "-"} • Tel: {o.telefone || "-"}
                  </p>
                  <p className="text-zinc-300 text-sm mt-1">
                    Valor:{" "}
                    <b className="text-green-400">
                      {typeof o.valorTotal === "number" ? formatBRL(o.valorTotal) : "-"}
                    </b>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/ordem/${o.id}`}
                    className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
                  >
                    Abrir
                  </Link>

                  <Link
                    href={`/pdf/${o.id}`}
                    className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl font-extrabold"
                  >
                    PDF (interno)
                  </Link>

                  <button
                    onClick={() => enviarPdfWhatsApp(o)}
                    disabled={enviandoId === o.id}
                    className="bg-green-600 hover:bg-green-500 text-black px-4 py-2 rounded-xl font-extrabold disabled:opacity-50"
                  >
                    {enviandoId === o.id ? "Gerando..." : "Enviar PDF no WhatsApp"}
                  </button>
                </div>
              </div>

              <p className="text-zinc-500 text-xs mt-3">
                O cliente abre um link público (sem login) com fotos e valor final.
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
