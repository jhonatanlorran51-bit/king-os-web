"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
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

/* ================== IMAGENS ================== */
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

  const [antesLocal, setAntesLocal] = useState<string[]>([]);
  const [depoisLocal, setDepoisLocal] = useState<string[]>([]);
  const [salvandoFotos, setSalvandoFotos] = useState(false);
  const [enviandoWhats, setEnviandoWhats] = useState(false);

  async function carregar() {
    setCarregando(true);
    const snap = await getDoc(doc(db, "ordens", id));
    setOrdem(snap.exists() ? (snap.data() as any) : null);
    setCarregando(false);
  }

  useEffect(() => {
    if (id) carregar();
  }, [id]);

  const status = ordem?.status || "Em análise";
  const concluida = status === "Concluído";
  const emReparo = status === "Em reparo";

  const fotosAntes = ordem?.fotosAntes || [];
  const fotosDepois = ordem?.fotosDepois || [];

  const precisaFotosDepois = concluida && fotosDepois.length === 0;

  /* ===== AÇÕES ===== */
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

  // Excluir fica só no histórico (não aqui)
  async function excluirInterno() {
    const ok = confirm("Excluir essa OS? (não dá para desfazer)");
    if (!ok) return;
    await deleteDoc(doc(db, "ordens", id));
    router.replace("/historico");
  }

  /* ===== FOTOS ===== */
  async function addAntes(files: FileList | null) {
    if (!files || !ordem) return;
    const atuais = (ordem.fotosAntes || []).length + antesLocal.length;
    const livres = Math.max(0, 3 - atuais);
    if (livres <= 0) return alert("Limite de 3 fotos (Antes).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) novas.push(await compressImage(f));
    setAntesLocal((p) => [...p, ...novas]);
  }

  async function addDepois(files: FileList | null) {
    if (!files || !ordem) return;
    const atuais = (ordem.fotosDepois || []).length + depoisLocal.length;
    const livres = Math.max(0, 3 - atuais);
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
      alert("Erro ao salvar fotos. Veja o console (F12).");
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

  /* ===== UI ===== */
  if (carregando) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (!ordem) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">Ordem não encontrada.</p>
      </main>
    );
  }

  const canShowActions = useMemo(() => {
    // deixa a UI limpa: ações só mudam por status
    return true;
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* TOP (só voltar) */}
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
        {/* CARD PRINCIPAL */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold">{ordem.cliente || "-"}</p>
              <p className="text-zinc-400 text-sm">
                {(ordem.marca || "-") + " • " + (ordem.modelo || "-")}
              </p>
              {ordem.telefone ? <p className="text-zinc-500 text-xs mt-1">{ordem.telefone}</p> : null}
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full border border-zinc-700 text-zinc-300">
              {status}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-zinc-300">
              Valor final:{" "}
              <span className="text-green-400 font-extrabold">
                {typeof ordem.valorTotal === "number" ? formatBRL(ordem.valorTotal) : "-"}
              </span>
            </p>
          </div>

          {/* AÇÕES (aparecem só as necessárias) */}
          {canShowActions && (
            <div className="mt-5 flex flex-wrap gap-2">
              {/* Em análise -> iniciar reparo */}
              {status === "Em análise" && (
                <button
                  onClick={iniciarReparo}
                  className="px-4 py-2 rounded-xl font-bold bg-blue-500 text-black"
                >
                  Iniciar reparo
                </button>
              )}

              {/* Em reparo -> concluir */}
              {emReparo && (
                <button
                  onClick={concluir}
                  className="px-4 py-2 rounded-xl font-bold bg-green-500 text-black"
                >
                  Concluir
                </button>
              )}

              {/* Cancelar (não aparece quando já concluída) */}
              {!concluida && (
                <button
                  onClick={cancelar}
                  className="px-4 py-2 rounded-xl font-bold bg-yellow-500 text-black"
                >
                  Cancelar
                </button>
              )}

              {/* Quando concluída -> só WhatsApp + PDF */}
              {concluida && (
                <>
                  <button
                    onClick={enviarPdfWhatsApp}
                    disabled={enviandoWhats}
                    className="px-4 py-2 rounded-xl font-bold bg-green-600 text-black disabled:opacity-50"
                  >
                    {enviandoWhats ? "Gerando..." : "Enviar no WhatsApp"}
                  </button>

                  <Link
                    href={`/pdf/${id}`}
                    className="px-4 py-2 rounded-xl font-bold bg-white text-black"
                  >
                    PDF
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* SEÇÕES EM DETAILS (limpo) */}
        <div className="mt-4 space-y-4">
          <details className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4" open>
            <summary className="cursor-pointer font-bold">Reparos</summary>
            <ul className="list-disc pl-6 text-zinc-200 mt-3">
              {(ordem.reparos || []).map((r, i) => <li key={i}>{r}</li>)}
              {(ordem.reparos || []).length === 0 && <li>-</li>}
            </ul>
          </details>

          <details className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4" open>
            <summary className="cursor-pointer font-bold">Estado do aparelho</summary>
            <ul className="list-disc pl-6 text-zinc-200 mt-3">
              {(ordem.estado || []).map((e, i) => <li key={i}>{e}</li>)}
              {(ordem.estado || []).length === 0 && <li>-</li>}
            </ul>
          </details>

          {/* Fotos Antes */}
          <details className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4" open>
            <summary className="cursor-pointer font-bold">Fotos (Antes)</summary>

            <div className="mt-3">
              <label className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
                Selecionar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addAntes(e.target.files)}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {fotosAntes.map((src, i) => (
                  <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded-xl border border-zinc-800" />
                ))}
                {antesLocal.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Antes novo ${i + 1}`} className="rounded-xl border border-zinc-800" />
                    <button
                      onClick={() => removeAntesLocal(i)}
                      className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded-lg font-bold"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Fotos Depois - só aparece quando concluída, e ainda mais útil se estiver faltando */}
          {concluida && (
            <details className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4" open={precisaFotosDepois}>
              <summary className="cursor-pointer font-bold">Fotos (Depois)</summary>

              <div className="mt-3">
                <label className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
                  Selecionar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addDepois(e.target.files)}
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {fotosDepois.map((src, i) => (
                    <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded-xl border border-zinc-800" />
                  ))}
                  {depoisLocal.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt={`Depois novo ${i + 1}`} className="rounded-xl border border-zinc-800" />
                      <button
                        onClick={() => removeDepoisLocal(i)}
                        className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded-lg font-bold"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )}

          {/* Salvar Fotos só aparece se houver algo novo */}
          {(antesLocal.length > 0 || depoisLocal.length > 0) && (
            <button
              onClick={salvarFotos}
              disabled={salvandoFotos}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
            >
              {salvandoFotos ? "Salvando..." : "Salvar fotos"}
            </button>
          )}

          {/* Botão Excluir escondido (se você quiser só no histórico, deixa assim) */}
          {/* <button onClick={excluirInterno} className="w-full bg-red-500 text-black px-6 py-3 rounded-2xl font-extrabold">
            Excluir (apenas se necessário)
          </button> */}
        </div>
      </div>
    </main>
  );
}
