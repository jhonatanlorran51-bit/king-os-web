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

export default function OrdemDetalhePage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  // buffers simples (sem compressão agora — pra evitar qualquer bug)
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
        // sanitiza pra não quebrar render
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
      setMsg(
        "Erro ao abrir esta OS. Mensagem: " +
          (e?.message || String(e) || "desconhecido")
      );
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

  function addLocalAntes(files: FileList | null) {
    try {
      if (!files) return;
      const livres = Math.max(0, 3 - fotosAntes.length - antesLocal.length);
      if (livres <= 0) return setMsg("Limite de 3 fotos (Antes).");
      const toTake = Array.from(files).slice(0, livres);

      // sem compressão: apenas preview base64
      toTake.forEach((f) => {
        const r = new FileReader();
        r.onload = () => setAntesLocal((p) => [...p, String(r.result)]);
        r.readAsDataURL(f);
      });
    } catch (e: any) {
      setMsg("Erro ao selecionar fotos (Antes): " + (e?.message || String(e)));
    }
  }

  function addLocalDepois(files: FileList | null) {
    try {
      if (!files) return;
      const livres = Math.max(0, 3 - fotosDepois.length - depoisLocal.length);
      if (livres <= 0) return setMsg("Limite de 3 fotos (Depois).");
      const toTake = Array.from(files).slice(0, livres);

      toTake.forEach((f) => {
        const r = new FileReader();
        r.onload = () => setDepoisLocal((p) => [...p, String(r.result)]);
        r.readAsDataURL(f);
      });
    } catch (e: any) {
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
        fotosDepois: [...fotosDepois, ...depoisLocal].slice(0, 3),
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

  async function enviarWhats() {
    if (!ordem) return;
    setSending(true);
    setMsg("");
    try {
      const ref = await addDoc(collection(db, "shares"), {
        cliente: ordem.cliente || "",
        telefone: ordem.telefone || "",
        marca: ordem.marca || "",
        modelo: ordem.modelo || "",
        reparos: ordem.reparos || [],
        estado: ordem.estado || [],
        valorTotal: typeof ordem.valorTotal === "number" ? ordem.valorTotal : null,
        fotosAntes: fotosAntes,
        fotosDepois: fotosDepois,
        criadoEm: serverTimestamp(),
      });

      const link = `${window.location.origin}/s/${ref.id}`;
      const texto = `Olá ${ordem.cliente || ""}! Segue sua OS:\n\n${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("ERRO enviarWhats:", e);
      setMsg("Erro ao gerar link/Whats: " + (e?.message || String(e)));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5">
      {/* topo simples */}
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
      )}

      {!loading && ordem && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <p className="text-xl font-extrabold">{ordem.cliente || "-"}</p>
          <p className="text-zinc-400">
            {(ordem.marca || "-") + " • " + (ordem.modelo || "-")}
          </p>

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
                  {sending ? "Gerando..." : "Enviar Whats"}
                </button>
                <Link href={`/pdf/${id}`} className="bg-white text-black px-4 py-2 rounded-xl font-bold">
                  PDF
                </Link>
              </>
            )}
          </div>

          <hr className="border-zinc-800 my-5" />

          <p className="font-bold mb-2">Fotos (Antes)</p>
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
              <p className="font-bold mt-6 mb-2">Fotos (Depois)</p>
              <label className="inline-block bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer">
                Selecionar
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addLocalDepois(e.target.files)} />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
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
