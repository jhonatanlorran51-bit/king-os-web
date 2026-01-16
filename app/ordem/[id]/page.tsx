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
  marca?: string;
  modelo?: string;
  telefone?: string;
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

async function compressImage(
  file: File,
  maxW = 900,
  quality = 0.75
): Promise<string> {
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

/* ================== COMPONENTE ================== */
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
    await updateDoc(doc(db, "ordens", id), {
      status: "Em reparo",
      iniciadoEm: new Date(),
    });
    await carregar();
    alert("Status atualizado para Em reparo!");
  }

  async function concluir() {
    await updateDoc(doc(db, "ordens", id), {
      status: "Concluído",
      concluidoEm: new Date(),
    });
    await carregar();
    alert("Ordem concluída!");
  }

  async function cancelar() {
    await updateDoc(doc(db, "ordens", id), {
      status: "Cancelado",
      canceladoEm: new Date(),
    });
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
    const livres = Math.max(
      0,
      3 - (ordem.fotosAntes?.length || 0) - antesLocal.length
    );
    if (livres <= 0) return alert("Limite de 3 fotos (Antes).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) {
      novas.push(await compressImage(f));
    }
    setAntesLocal((p) => [...p, ...novas]);
  }

  async function addDepois(files: FileList | null) {
    if (!files || !ordem) return;
    const livres = Math.max(
      0,
      3 - (ordem.fotosDepois?.length || 0) - depoisLocal.length
    );
    if (livres <= 0) return alert("Limite de 3 fotos (Depois).");

    const novas: string[] = [];
    for (const f of Array.from(files).slice(0, livres)) {
      novas.push(await compressImage(f));
    }
    setDepoisLocal((p) => [...p, ...novas]);
  }

  async function salvarFotos() {
    if (!ordem) return;
    setSalvandoFotos(true);
    await updateDoc(doc(db, "ordens", id), {
      fotosAntes: [...(ordem.fotosAntes || []), ...antesLocal].slice(0, 3),
      fotosDepois: [...(ordem.fotosDepois || []), ...depoisLocal].slice(0, 3),
    });
    setAntesLocal([]);
    setDepoisLocal([]);
    await carregar();
    setSalvandoFotos(false);
    alert("Fotos salvas!");
  }

  async function enviarPdfWhatsApp() {
    if (!ordem) return;
    setEnviandoWhats(true);

    const ref = await addDoc(collection(db, "shares"), {
      cliente: ordem.cliente || "",
      marca: ordem.marca || "",
      modelo: ordem.modelo || "",
      reparos: ordem.reparos || [],
      estado: ordem.estado || [],
      valorTotal: ordem.valorTotal || null,
      fotosAntes: ordem.fotosAntes || [],
      fotosDepois: ordem.fotosDepois || [],
      criadoEm: serverTimestamp(),
    });

    const link = `${window.location.origin}/s/${ref.id}`;
    const msg = `Olá ${
      ordem.cliente || ""
    }! Segue o PDF da sua OS ${osCurta(id)}:\n\n${link}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
    setEnviandoWhats(false);
  }

  if (carregando)
    return (
      <main className="min-h-screen bg-black text-white p-6">
        Carregando...
      </main>
    );

  if (!ordem)
    return (
      <main className="min-h-screen bg-black text-white p-6">
        Ordem não encontrada.
      </main>
    );

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => router.back()}
          className="bg-zinc-700 px-4 py-2 rounded font-bold"
        >
          Voltar
        </button>
        <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">
          Home
        </Link>
        <Link
          href="/dashboard"
          className="bg-zinc-700 px-4 py-2 rounded font-bold"
        >
          Ativas
        </Link>
        <Link href="/logout" className="bg-red-500 text-black px-4 py-2 rounded font-bold">
          Sair
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2">Detalhes da OS</h1>
      <p className="text-zinc-400 mb-4">{osCurta(id)}</p>

      <div className="bg-zinc-900 p-4 rounded">
        <p><b>Cliente:</b> {ordem.cliente}</p>
        <p><b>Marca:</b> {ordem.marca || "-"}</p>
        <p><b>Modelo:</b> {ordem.modelo}</p>
        <p><b>Status:</b> {ordem.status}</p>
        <p>
          <b>Valor:</b>{" "}
          {typeof ordem.valorTotal === "number"
            ? formatBRL(ordem.valorTotal)
            : "-"}
        </p>

        <div className="flex gap-2 mt-6 flex-wrap">
          <button onClick={iniciarReparo} className="bg-blue-500 text-black px-4 py-2 rounded font-bold">
            Iniciar Reparo
          </button>
          <button onClick={concluir} className="bg-green-500 text-black px-4 py-2 rounded font-bold">
            Concluir
          </button>
          <button onClick={cancelar} className="bg-yellow-500 text-black px-4 py-2 rounded font-bold">
            Cancelar
          </button>
          <button onClick={excluir} className="bg-red-500 text-black px-4 py-2 rounded font-bold">
            Excluir
          </button>
          <Link href={`/pdf/${id}`} className="bg-white text-black px-4 py-2 rounded font-bold">
            PDF
          </Link>
          <button onClick={enviarPdfWhatsApp} className="bg-green-600 text-black px-4 py-2 rounded font-bold">
            Enviar PDF no WhatsApp
          </button>
        </div>
      </div>
    </main>
  );
}
