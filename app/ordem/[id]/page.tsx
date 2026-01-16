"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

type Ordem = {
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

/* ===== imagens ===== */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxW = 900, quality = 0.75): Promise<string> {
  const base64 = await fileToBase64(file);
  const img = document.createElement("img");
  img.src = base64;

  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Imagem inválida"));
  });

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");

  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function OrdemDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [antesLocal, setAntesLocal] = useState<string[]>([]);
  const [depoisLocal, setDepoisLocal] = useState<string[]>([]);
  const [salvandoFotos, setSalvandoFotos] = useState(false);
  const [enviandoWhats, setEnviandoWhats] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);

    try {
      const snap = await getDoc(doc(db, "ordens", id));
      if (!snap.exists()) {
        setOrdem(null);
        setErro("Ordem não encontrada (documento não existe).");
      } else {
        setOrdem(snap.data() as any);
      }
    } catch (e: any) {
      console.error("ERRO getDoc(ordens/id):", e);
      setErro(e?.message || "Erro ao carregar esta OS. Veja console (F12).");
      setOrdem(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (id) carregar();
  }, [id]);

  const status = ordem?.status || "Em análise";
  const concluida = status === "Concluído";
  const emReparo = status === "Em reparo";

  async function iniciarReparo() {
    await updateDoc(doc(db, "ordens", id), { status: "Em reparo", iniciadoEm: new Date() });
    await carregar();
  }

  async function concluir() {
    await updateDoc(doc(db, "ordens", id), { status: "Concluído", concluidoEm: new Date() });
    await carregar();
  }

  async function cancelar() {
    await updateDoc(doc(db, "ordens", id), { status: "Cancelado", canceladoEm: new Date() });
    router.replace("/dashboard");
  }

  async function addAntes(files: FileList | null) {
    if (!files) return;
    const limite = 3;
    const livres = Math.max(0, limite - (ordem?.fotosAntes?.length || 0) - antesLocal.length);
    if (livres <= 0) return alert("Limite de 3 fotos (Antes).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) novas.push(await compressImage(f));
    setAntesLocal((p) => [...p, ...novas]);
  }

  async function addDepois(files: FileList | null) {
    if (!files) return;
    const limite = 3;
    const livres = Math.max(0, limite - (ordem?.fotosDepois?.length || 0) - depoisLocal.length);
    if (livres <= 0) return alert("Limite de 3 fotos (Depois).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) novas.push(await compressImage(f));
    setDepoisLocal((p) => [...p, ...novas]);
  }

  function removeAntesLocal(i: number) {
    setAntesLocal((p) => p.filter((_, idx) => idx !== i));
  }
  function removeDepoisLocal(i: number) {
    setDepoisLocal((p) => p.filter((_, idx) => idx !== i));
  }

  async function salvarFotos() {
    if (!ordem) return;
    setSalvandoFotos(true);
    try {
      await updateDoc(doc(db, "ordens", id), {
        fotosAntes: [...(ordem.fotosAntes || []), ...antesLocal].slice(0, 3),
        fotosDepois: [...(ordem.fotosDepois || []), ...depoisLocal].slice(0, 3),
      });
      setAntesLocal([]);
      setDepoisLocal([]);
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar fotos. Veja console (F12).");
    } finally {
      setSalvandoFotos(false);
    }
  }

  async function enviarPdfWhatsApp() {
    if (!ordem) return;
    setEnviandoWhats(true);
    try {
      const ref = await addDoc(collection(db, "shares"), {
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
      });

      const link = `${window.location.origin}/s/${ref.id}`;
      const msg = `Olá ${ordem.cliente || ""}! Segue sua OS:\n\n${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar link público (shares).");
    } finally {
      setEnviandoWhats(false);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (erro) {
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
            <span className="text-zinc-400 text-sm">{osCurta(id)}</span>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="bg-zinc-950 border border-red-700 rounded-2xl p-5">
            <p className="font-bold text-red-400 mb-2">Erro ao abrir esta OS</p>
            <p className="text-zinc-300 text-sm break-words">{erro}</p>
            <p className="text-zinc-500 text-xs mt-3">
              Isso geralmente é permissão (Firestore Rules) ou documento inexistente.
            </p>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={carregar}
                className="bg-zinc-800 px-4 py-2 rounded-xl font-bold"
              >
                Tentar de novo
              </button>
              <Link
                href="/dashboard"
                className="bg-white text-black px-4 py-2 rounded-xl font-bold"
              >
                Voltar para Ativas
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Se chegou aqui, ordem existe
  const fotosAntes = ordem.fotosAntes || [];
  const fotosDepois = ordem.fotosDepois || [];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* topo: só voltar */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold"
          >
            Voltar
          </button>
          <span className="text-zinc-400 text-sm">{osCurta(id)}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold">{ordem.cliente || "-"}</p>
              <p className="text-zinc-400 text-sm">
                {(ordem.marca || "-") + " • " + (ordem.modelo || "-")}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full border border-zinc-700 text-zinc-300">
              {status}
            </span>
          </div>

          <div className="mt-3">
            <p className="text-zinc-300">
              Valor final:{" "}
              <span className="text-green-400 font-extrabold">
                {typeof ordem.valorTotal === "number" ? formatBRL(ordem.valorTotal) : "-"}
              </span>
            </p>
          </div>

          {/* ações limpas por status */}
          <div className="mt-4 flex flex-wrap gap-2">
            {status === "Em análise" && (
              <button onClick={iniciarReparo} className="bg-blue-500 text-black px-4 py-2 rounded-xl font-bold">
                Iniciar reparo
              </button>
            )}
            {emReparo && (
              <button onClick={concluir} className="bg-green-500 text-black px-4 py-2 rounded-xl font-bold">
                Concluir
              </button>
            )}
            {!concluida && (
              <button onClick={cancelar} className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-bold">
                Cancelar
              </button>
            )}
            {concluida && (
              <>
                <button
                  onClick={enviarPdfWhatsApp}
                  disabled={enviandoWhats}
                  className="bg-green-600 text-black px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                >
                  {enviandoWhats ? "Gerando..." : "Enviar no WhatsApp"}
                </button>
                <Link href={`/pdf/${id}`} className="bg-white text-black px-4 py-2 rounded-xl font-bold">
                  PDF
                </Link>
              </>
            )}
          </div>
        </div>

        <details className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4" open>
          <summary className="cursor-pointer font-bold">Fotos (Antes)</summary>
          <div className="mt-3">
            <label className="inline-flex bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
              Selecionar
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addAntes(e.target.files)} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {fotosAntes.map((src, i) => (
                <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded-xl border border-zinc-800" />
              ))}
              {antesLocal.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`Antes novo ${i + 1}`} className="rounded-xl border border-zinc-800" />
                  <button onClick={() => removeAntesLocal(i)} className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded-lg font-bold">
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>
        </details>

        {concluida && (
          <details className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4" open={fotosDepois.length === 0}>
            <summary className="cursor-pointer font-bold">Fotos (Depois)</summary>
            <div className="mt-3">
              <label className="inline-flex bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
                Selecionar
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addDepois(e.target.files)} />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {fotosDepois.map((src, i) => (
                  <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded-xl border border-zinc-800" />
                ))}
                {depoisLocal.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Depois novo ${i + 1}`} className="rounded-xl border border-zinc-800" />
                    <button onClick={() => removeDepoisLocal(i)} className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded-lg font-bold">
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {(antesLocal.length > 0 || depoisLocal.length > 0) && (
          <button
            onClick={salvarFotos}
            disabled={salvandoFotos}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
          >
            {salvandoFotos ? "Salvando..." : "Salvar fotos"}
          </button>
        )}
      </div>
    </main>
  );
}
