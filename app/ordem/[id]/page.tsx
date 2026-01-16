"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

  async function iniciarReparo() {
    await updateDoc(doc(db, "ordens", id), { status: "Em reparo", iniciadoEm: new Date() });
    await carregar();
    alert("Status atualizado para Em reparo!");
  }

  async function concluir() {
    await updateDoc(doc(db, "ordens", id), { status: "Concluído", concluidoEm: new Date() });
    await carregar();
    alert("Ordem concluída! Agora liberei as fotos (Depois).");
  }

  async function cancelar() {
    await updateDoc(doc(db, "ordens", id), { status: "Cancelado", canceladoEm: new Date() });
    await carregar();
    alert("Ordem cancelada!");
  }

  async function excluir() {
    const ok = confirm("Excluir essa OS? (não dá para desfazer)");
    if (!ok) return;
    await deleteDoc(doc(db, "ordens", id));
    alert("OS excluída.");
    router.replace("/dashboard");
  }

  async function addAntes(files: FileList | null) {
    if (!files || !ordem) return;
    const atuais = (ordem.fotosAntes || []).length + antesLocal.length;
    const livres = Math.max(0, 3 - atuais);
    if (livres <= 0) return alert("Limite de 3 fotos (Antes).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) {
      novas.push(await compressImage(f, 900, 0.75));
    }
    setAntesLocal((p) => [...p, ...novas]);
  }

  async function addDepois(files: FileList | null) {
    if (!files || !ordem) return;
    const atuais = (ordem.fotosDepois || []).length + depoisLocal.length;
    const livres = Math.max(0, 3 - atuais);
    if (livres <= 0) return alert("Limite de 3 fotos (Depois).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) {
      novas.push(await compressImage(f, 900, 0.75));
    }
    setDepoisLocal((p) => [...p, ...novas]);
  }

  function removerAntesLocal(idx: number) {
    setAntesLocal((p) => p.filter((_, i) => i !== idx));
  }

  function removerDepoisLocal(idx: number) {
    setDepoisLocal((p) => p.filter((_, i) => i !== idx));
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
      alert("Fotos salvas com sucesso!");
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
        marca: ordem.marca || "",
        modelo: ordem.modelo || "",
        reparos: ordem.reparos || [],
        estado: ordem.estado || [],
        valorTotal: typeof ordem.valorTotal === "number" ? ordem.valorTotal : null,
        fotosAntes: ordem.fotosAntes || [],
        fotosDepois: ordem.fotosDepois || [],
        criadoEm: serverTimestamp(),
      });

      const link = `${window.location.origin}/s/${ref.id}`;
      const msg = `Olá ${ordem.cliente || ""}! Segue o PDF da sua OS ${osCurta(id)}:\n\n${link}`;

      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
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

  if (!ordem) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">Ordem não encontrada.</p>
      </main>
    );
  }

  const concluida = (ordem.status || "") === "Concluído";
  const fotosAntes = ordem.fotosAntes || [];
  const fotosDepois = ordem.fotosDepois || [];

  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* MENU */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => router.back()} className="bg-zinc-700 px-4 py-2 rounded font-bold">Voltar</button>
        <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">Home</Link>
        <Link href="/dashboard" className="bg-zinc-700 px-4 py-2 rounded font-bold">Ativas</Link>
        <Link href="/logout" className="bg-red-500 text-black px-4 py-2 rounded font-bold">Sair</Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Detalhes da OS</h1>
      <p className="text-zinc-300 mb-4"><b>{osCurta(id)}</b></p>

      <div className="bg-zinc-900 p-4 rounded">
        <p><b>Cliente:</b> {ordem.cliente || "-"}</p>
        <p><b>Marca:</b> {ordem.marca || "-"}</p>
        <p><b>Modelo:</b> {ordem.modelo || "-"}</p>
        <p><b>Status:</b> {ordem.status || "Em análise"}</p>
        <p><b>Valor:</b> {typeof ordem.valorTotal === "number" ? formatBRL(ordem.valorTotal) : "-"}</p>

        {/* FOTOS ANTES */}
        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Antes) — como chegou (até 3)</p>

          <label className="inline-block bg-zinc-700 px-4 py-2 rounded font-bold cursor-pointer">
            Selecionar fotos (Antes)
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addAntes(e.target.files)} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {fotosAntes.map((src, i) => (
              <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded border border-zinc-700" />
            ))}
            {antesLocal.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Antes novo ${i + 1}`} className="rounded border border-zinc-700" />
                <button onClick={() => removerAntesLocal(i)} className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded font-bold">X</button>
              </div>
            ))}
          </div>
        </div>

        {/* FOTOS DEPOIS */}
        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Depois) — entrega (até 3)</p>

          {!concluida ? (
            <p className="text-zinc-300">Conclua a ordem para liberar as fotos (Depois).</p>
          ) : (
            <>
              <label className="inline-block bg-zinc-700 px-4 py-2 rounded font-bold cursor-pointer">
                Selecionar fotos (Depois)
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addDepois(e.target.files)} />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {fotosDepois.map((src, i) => (
                  <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded border border-zinc-700" />
                ))}
                {depoisLocal.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Depois novo ${i + 1}`} className="rounded border border-zinc-700" />
                    <button onClick={() => removerDepoisLocal(i)} className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded font-bold">X</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={salvarFotos}
          disabled={salvandoFotos}
          className="mt-6 bg-yellow-500 text-black px-6 py-2 rounded font-bold disabled:opacity-50"
        >
          {salvandoFotos ? "Salvando..." : "Salvar Fotos"}
        </button>

        {/* AÇÕES */}
        <div className="flex gap-2 mt-6 flex-wrap">
          <button onClick={iniciarReparo} className="bg-blue-500 text-black px-4 py-2 rounded font-bold">Iniciar Reparo</button>
          <button onClick={concluir} className="bg-green-500 text-black px-4 py-2 rounded font-bold">Concluir</button>
          <button onClick={cancelar} className="bg-yellow-500 text-black px-4 py-2 rounded font-bold">Cancelar</button>
          <button onClick={excluir} className="bg-red-500 text-black px-4 py-2 rounded font-bold">Excluir</button>

          <Link href={`/pdf/${id}`} className="bg-white text-black px-4 py-2 rounded font-bold">
            PDF (interno)
          </Link>

          <button onClick={enviarPdfWhatsApp} disabled={enviandoWhats} className="bg-green-600 text-black px-4 py-2 rounded font-bold disabled:opacity-50">
            {enviandoWhats ? "Gerando link..." : "Enviar PDF no WhatsApp"}
          </button>
        </div>
      </div>
    </main>
  );
}
