"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

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

function safeStr(v: any) {
  return typeof v === "string" ? v : "";
}

function safeArr(v: any) {
  return Array.isArray(v) ? v : [];
}

function safeNum(v: any) {
  return typeof v === "number" && isFinite(v) ? v : null;
}

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

function normalizarTelefoneBR(telefone?: string) {
  const t = (telefone || "").replace(/\D/g, "");
  if (!t) return "";
  return t.startsWith("55") ? t : `55${t}`;
}

/* ================== IMAGEM (compressão) ================== */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxW = 720, quality = 0.55): Promise<string> {
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
  const id = String((params as any)?.id || "");

  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [antesLocal, setAntesLocal] = useState<string[]>([]);
  const [depoisLocal, setDepoisLocal] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  async function carregar() {
    setLoading(true);
    setMsg("");
    try {
      const ref = doc(db, "ordens", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setOrdem(null);
        setMsg("OS não encontrada (documento não existe).");
      } else {
        const d: any = snap.data();
        const o: Ordem = {
          cliente: safeStr(d.cliente),
          telefone: safeStr(d.telefone),
          marca: safeStr(d.marca),
          modelo: safeStr(d.modelo),
          reparos: safeArr(d.reparos),
          estado: safeArr(d.estado),
          valorTotal: safeNum(d.valorTotal),
          status: safeStr(d.status) || "Em análise",
          fotosAntes: safeArr(d.fotosAntes),
          fotosDepois: safeArr(d.fotosDepois),
        };
        setOrdem(o);
      }
    } catch (e: any) {
      console.error("ERRO /ordem/[id] getDoc:", e);
      setOrdem(null);
      setMsg("Erro ao abrir esta OS: " + (e?.message || String(e) || "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setMsg("ID da OS inválido.");
      return;
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = ordem?.status || "Em análise";
  const concluida = status === "Concluído";
  const emReparo = status === "Em reparo";

  const fotosAntes = useMemo(() => safeArr(ordem?.fotosAntes), [ordem]);
  const fotosDepois = useMemo(() => safeArr(ordem?.fotosDepois), [ordem]);

  async function setStatus(novo: string) {
    try {
      await updateDoc(doc(db, "ordens", id), { status: novo, atualizadoEm: new Date() });
      await carregar();
    } catch (e: any) {
      console.error("ERRO updateDoc status:", e);
      setMsg("Erro ao atualizar status: " + (e?.message || String(e)));
    }
  }

  async function addLocalAntes(files: FileList | null) {
    try {
      if (!files) return;
      const livres = Math.max(0, 3 - fotosAntes.length - antesLocal.length);
      if (livres <= 0) return setMsg("Limite de 3 fotos (Antes).");

      const toTake = Array.from(files).slice(0, livres);
      const novas: string[] = [];
      for (const f of toTake) novas.push(await compressImage(f, 720, 0.55));
      setAntesLocal((p) => [...p, ...novas]);
    } catch (e: any) {
      console.error(e);
      setMsg("Erro ao selecionar fotos (Antes): " + (e?.message || String(e)));
    }
  }

  async function addLocalDepois(files: FileList | null) {
    try {
      if (!files) return;
      const livres = Math.max(0, 2 - fotosDepois.length - depoisLocal.length);
      if (livres <= 0) return setMsg("Limite de 2 fotos (Depois).");

      const toTake = Array.from(files).slice(0, livres);
      const novas: string[] = [];
      for (const f of toTake) novas.push(await compressImage(f, 720, 0.55));
      setDepoisLocal((p) => [...p, ...novas]);
    } catch (e: any) {
      console.error(e);
      setMsg("Erro ao selecionar fotos (Depois): " + (e?.message || String(e)));
    }
  }

  async function salvarFotos() {
    if (!ordem) return;
    setSaving(true);
    setMsg("");
    try {
      await updateDoc(doc(db, "ordens", id), {
        fotosAntes: [...fotosAntes, ...antesLocal].slice(0, 3),
        fotosDepois: [...fotosDepois, ...depoisLocal].slice(0, 2),
      });
      setAntesLocal([]);
      setDepoisLocal([]);
      await carregar();
      setMsg("Fotos salvas com sucesso.");
    } catch (e: any) {
      console.error("ERRO salvarFotos:", e);
      setMsg("Erro ao salvar fotos: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  // ✅ FIX POPUP BLOCK: abre janela ANTES do await
  async function enviarWhats() {
    if (!ordem) return;

    setSending(true);
    setMsg("");

    // abre uma aba/janela agora (gesto do clique), para não bloquear
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");

    try {
      const ref = await addDoc(collection(db, "shares"), {
        lojaNome: "KING OF CELL",
        cliente: ordem.cliente || "",
        telefone: ordem.telefone || "",
        marca: ordem.marca || "",
        modelo: ordem.modelo || "",
        reparos: ordem.reparos || [],
        estado: ordem.estado || [],
        valorTotal: typeof ordem.valorTotal === "number" ? ordem.valorTotal : null,
        fotosAntes,
        fotosDepois,
        criadoEm: serverTimestamp(),
        osId: id,
      });

      const link = `${window.location.origin}/s/${ref.id}`;
      const nome = ordem.cliente ? ` ${ordem.cliente}` : "";
      const texto = `Olá${nome}! Segue o PDF da sua OS ${osCurta(id)}:\n\n${link}`;

      const tel = normalizarTelefoneBR(ordem.telefone);
      const waUrl = tel
        ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
        : `https://wa.me/?text=${encodeURIComponent(texto)}`;

      // redireciona a janela que já foi aberta
      if (popup) popup.location.href = waUrl;
      else window.location.href = waUrl; // fallback
    } catch (e: any) {
      console.error("ERRO enviarWhats:", e);

      if (popup) popup.close(); // fecha se deu erro

      setMsg(
        "Erro ao gerar link/Whats: " +
          (e?.code ? `${e.code} - ` : "") +
          (e?.message || String(e))
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold"
        >
          Voltar
        </button>
        <span className="text-zinc-400 text-sm">{osCurta(id)}</span>
      </div>

      {loading && <p className="text-zinc-400">Carregando...</p>}

      {!loading && msg && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-yellow-300 font-bold">Aviso</p>
          <p className="text-zinc-300 text-sm break-words mt-1">{msg}</p>
        </div>
      )}

      {!loading && !ordem && (
        <div className="bg-zinc-950 border border-red-700 rounded-2xl p-5">
          <p className="text-red-400 font-bold mb-2">Não foi possível abrir a OS</p>
          <p className="text-zinc-300 text-sm">Use “Tentar de novo”.</p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button onClick={carregar} className="bg-zinc-800 px-4 py-2 rounded-xl font-bold">
              Tentar de novo
            </button>
            <Link href="/dashboard" className="bg-white text-black px-4 py-2 rounded-xl font-bold">
              Voltar para Ativas
            </Link>
          </div>
        </div>
      )}

      {!loading && ordem && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <p className="text-xl font-extrabold">{ordem.cliente || "-"}</p>
          <p className="text-zinc-400">{(ordem.marca || "-") + " • " + (ordem.modelo || "-")}</p>

          <p className="mt-3">
            <b>Status:</b> {status}
          </p>

          <p className="mt-1">
            <b>Valor:</b>{" "}
            <span className="text-green-400 font-extrabold">
              {typeof ordem.valorTotal === "number" ? formatBRL(ordem.valorTotal) : "-"}
            </span>
          </p>

          <div className="mt-4 flex gap-2 flex-wrap">
            {status === "Em análise" && (
              <button onClick={() => setStatus("Em reparo")} className="bg-blue-500 text-black px-4 py-2 rounded-xl font-bold">
                Iniciar reparo
              </button>
            )}
            {emReparo && (
              <button onClick={() => setStatus("Concluído")} className="bg-green-500 text-black px-4 py-2 rounded-xl font-bold">
                Concluir
              </button>
            )}
            {!concluida && (
              <button onClick={() => setStatus("Cancelado")} className="bg-yellow-500 text-black px-4 py-2 rounded-xl font-bold">
                Cancelar
              </button>
            )}

            {concluida && (
              <>
                <button
                  onClick={enviarWhats}
                  disabled={sending}
                  className="bg-green-600 text-black px-4 py-2 rounded-xl font-bold disabled:opacity-50"
                >
                  {sending ? "Gerando..." : "Enviar Whats (PDF)"}
                </button>
                <Link href={`/pdf/${id}`} className="bg-white text-black px-4 py-2 rounded-xl font-bold">
                  PDF
                </Link>
              </>
            )}
          </div>

          <hr className="border-zinc-800 my-5" />

          <p className="font-bold mb-2">Fotos (Antes) — até 3</p>
          <label className="inline-block bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
            Selecionar
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addLocalAntes(e.target.files)} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {fotosAntes.map((src: string, i: number) => (
              <img key={i} src={src} className="rounded-xl border border-zinc-800" />
            ))}
            {antesLocal.map((src, i) => (
              <img key={`a${i}`} src={src} className="rounded-xl border border-zinc-800" />
            ))}
          </div>

          {concluida && (
            <>
              <p className="font-bold mt-6 mb-2">Fotos (Depois) — até 2</p>
              <label className="inline-block bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
                Selecionar
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addLocalDepois(e.target.files)} />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {fotosDepois.map((src: string, i: number) => (
                  <img key={i} src={src} className="rounded-xl border border-zinc-800" />
                ))}
                {depoisLocal.map((src, i) => (
                  <img key={`d${i}`} src={src} className="rounded-xl border border-zinc-800" />
                ))}
              </div>
            </>
          )}

          {(antesLocal.length > 0 || depoisLocal.length > 0) && (
            <button
              onClick={salvarFotos}
              disabled={saving}
              className="mt-6 w-full bg-yellow-500 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar fotos"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
