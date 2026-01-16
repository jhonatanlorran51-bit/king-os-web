"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { db } from "../../lib/firebase";
import { addDoc, collection } from "firebase/firestore";

/* ================== UTILIDADES ================== */
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

function toggle(list: string[], item: string, setList: (v: string[]) => void) {
  setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
}

function soNumeros(v: string) {
  return v.replace(/\D/g, "");
}

function toNumberBR(v: string) {
  const n = Number(String(v || "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/* ================== COMPONENTE ================== */
export default function OrdensPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");

  const [valorPeca, setValorPeca] = useState("");
  const [valorReparo, setValorReparo] = useState("");

  const [reparos, setReparos] = useState<string[]>([]);
  const [estado, setEstado] = useState<string[]>([]);

  const [outroReparo, setOutroReparo] = useState("");
  const [outroEstado, setOutroEstado] = useState("");

  const [fotosAntesLocal, setFotosAntesLocal] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const valores = useMemo(() => {
    const p = toNumberBR(valorPeca);
    const r = toNumberBR(valorReparo);
    if (p === null || r === null) return null;

    return {
      valorPeca: p,
      valorReparo: r,
      valorTotal: r,
      lucro: r - p,
    };
  }, [valorPeca, valorReparo]);

  async function addFotosAntes(files: FileList | null) {
    if (!files) return;

    const livres = Math.max(0, 3 - fotosAntesLocal.length);
    if (livres <= 0) return alert("Limite de 3 fotos (Antes).");

    const toTake = Array.from(files).slice(0, livres);
    const novas: string[] = [];
    for (const f of toTake) novas.push(await compressImage(f, 900, 0.75));
    setFotosAntesLocal((p) => [...p, ...novas]);
  }

  function removerFotoAntes(idx: number) {
    setFotosAntesLocal((p) => p.filter((_, i) => i !== idx));
  }

  async function salvarOrdem() {
    if (!cliente.trim()) return alert("Preencha o nome do cliente.");
    if (!marca.trim()) return alert("Preencha a marca do aparelho.");
    if (!modelo.trim()) return alert("Preencha o modelo do aparelho.");
    if (!valores) return alert("Preencha corretamente os valores da peça e do reparo.");

    setSalvando(true);
    try {
      const reparosFinal = [...reparos];
      if (outroReparo.trim()) reparosFinal.push(`Outros: ${outroReparo.trim()}`);

      const estadoFinal = [...estado];
      if (outroEstado.trim()) estadoFinal.push(`Outros: ${outroEstado.trim()}`);

      const docRef = await addDoc(collection(db, "ordens"), {
        cliente: cliente.trim(),
        telefone: soNumeros(telefone),
        marca: marca.trim(),
        modelo: modelo.trim(),

        reparos: reparosFinal,
        estado: estadoFinal,

        valorPeca: valores.valorPeca,
        valorReparo: valores.valorReparo,
        valorTotal: valores.valorTotal,
        lucro: valores.lucro,

        status: "Em análise",
        criadoEm: new Date(),

        fotosAntes: fotosAntesLocal,
        fotosDepois: [],
      });

      router.push(`/ordem/${docRef.id}`);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar. Veja o console (F12).");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* TOP BAR */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-extrabold tracking-wide">KING OS</div>
          <nav className="flex gap-2 text-sm">
            <Link href="/" className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">Home</Link>
            <Link href="/dashboard" className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">Ativas</Link>
            <Link href="/historico" className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">Histórico</Link>
            <Link href="/logout" className="px-3 py-2 rounded bg-red-500 text-black font-bold">Sair</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Nova Ordem</h1>
        <p className="text-zinc-400 mb-6">Preencha só o essencial. O resto é opcional.</p>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow">
          {/* DADOS DO CLIENTE */}
          <section className="mb-6">
            <h2 className="font-bold mb-3">Cliente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                placeholder="Nome do cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                placeholder="Telefone (WhatsApp) ex: 67999999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
          </section>

          {/* APARELHO */}
          <section className="mb-6">
            <h2 className="font-bold mb-3">Aparelho</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                placeholder="Marca (Samsung, Apple...)"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                placeholder="Modelo (A14, iPhone 11...)"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              />
            </div>
          </section>

          {/* FINANCEIRO (COLAPSÁVEL) */}
          <details className="mb-6 open:mb-6" open>
            <summary className="cursor-pointer font-bold mb-3">
              Financeiro (interno)
              <span className="text-zinc-400 font-normal ml-2 text-sm">(cliente não vê custo)</span>
            </summary>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                placeholder="Custo da peça (interno)"
                value={valorPeca}
                onChange={(e) => setValorPeca(e.target.value)}
              />
              <input
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                placeholder="Valor do reparo (mão de obra)"
                value={valorReparo}
                onChange={(e) => setValorReparo(e.target.value)}
              />
            </div>

            {valores && (
              <div className="mt-3 text-sm">
                <span className="text-zinc-300">Valor final ao cliente: </span>
                <span className="text-green-400 font-bold">
                  R$ {valores.valorTotal.toFixed(2)}
                </span>
                <span className="text-zinc-400"> • </span>
                <span className="text-zinc-300">Lucro: </span>
                <span className="text-green-400 font-bold">
                  R$ {valores.lucro.toFixed(2)}
                </span>
              </div>
            )}
          </details>

          {/* REPAROS (COLAPSÁVEL) */}
          <details className="mb-6" open>
            <summary className="cursor-pointer font-bold mb-3">Reparos</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["Troca de tela", "Reparo em placa", "Troca de conector"].map((r) => (
                <label key={r} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                  <input
                    type="checkbox"
                    checked={reparos.includes(r)}
                    onChange={() => toggle(reparos, r, setReparos)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <input
              className="w-full mt-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Outros (opcional)"
              value={outroReparo}
              onChange={(e) => setOutroReparo(e.target.value)}
            />
          </details>

          {/* ESTADO (COLAPSÁVEL) */}
          <details className="mb-6" open>
            <summary className="cursor-pointer font-bold mb-3">Estado do aparelho</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["Quebrado", "Ligando", "Molhado", "Arranhado", "Com avaria"].map((e) => (
                <label key={e} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                  <input
                    type="checkbox"
                    checked={estado.includes(e)}
                    onChange={() => toggle(estado, e, setEstado)}
                  />
                  <span>{e}</span>
                </label>
              ))}
            </div>
            <input
              className="w-full mt-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Outros (opcional)"
              value={outroEstado}
              onChange={(e) => setOutroEstado(e.target.value)}
            />
          </details>

          {/* FOTOS ANTES */}
          <details className="mb-6" open>
            <summary className="cursor-pointer font-bold mb-3">Fotos (Antes) — até 3</summary>

            <label className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl font-bold cursor-pointer w-full sm:w-auto">
              Selecionar fotos
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFotosAntes(e.target.files)} />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {fotosAntesLocal.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`Antes ${i + 1}`} className="rounded-xl border border-zinc-800" />
                  <button
                    onClick={() => removerFotoAntes(i)}
                    className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded-lg font-bold"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </details>

          {/* AÇÃO PRINCIPAL */}
          <button
            onClick={salvarOrdem}
            disabled={salvando}
            className="w-full mt-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-2xl font-extrabold disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Criar Ordem"}
          </button>

          <p className="text-zinc-500 text-xs mt-3">
            Dica: valores usam vírgula ou ponto. Ex: 120,50
          </p>
        </div>
      </div>
    </main>
  );
}
