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

/* ================== COMPONENTE ================== */
export default function OrdensPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [modelo, setModelo] = useState("");

  // valores
  const [valorPeca, setValorPeca] = useState("");
  const [valorReparo, setValorReparo] = useState("");

  const [reparos, setReparos] = useState<string[]>([]);
  const [estado, setEstado] = useState<string[]>([]);

  const [outroReparo, setOutroReparo] = useState("");
  const [outroEstado, setOutroEstado] = useState("");

  // fotos antes
  const [fotosAntesLocal, setFotosAntesLocal] = useState<string[]>([]);

  const [salvando, setSalvando] = useState(false);

  /* ======== CÁLCULOS ======== */
  const valores = useMemo(() => {
    const p = Number(valorPeca.replace(",", "."));
    const r = Number(valorReparo.replace(",", "."));
    if (isNaN(p) || isNaN(r)) return null;

    return {
      valorPeca: p,
      valorReparo: r,
      valorTotal: r,
      lucro: r - p,
    };
  }, [valorPeca, valorReparo]);

  /* ======== FOTOS ======== */
  async function addFotosAntes(files: FileList | null) {
    if (!files) return;

    const livres = Math.max(0, 3 - fotosAntesLocal.length);
    if (livres <= 0) {
      alert("Limite de 3 fotos (Antes).");
      return;
    }

    const toTake = Array.from(files).slice(0, livres);
    const novas: string[] = [];
    for (const f of toTake) {
      novas.push(await compressImage(f, 900, 0.75));
    }
    setFotosAntesLocal((p) => [...p, ...novas]);
  }

  function removerFotoAntes(idx: number) {
    setFotosAntesLocal((p) => p.filter((_, i) => i !== idx));
  }

  /* ======== SALVAR ORDEM ======== */
  async function salvarOrdem() {
    if (!cliente.trim() || !modelo.trim()) {
      alert("Preencha Cliente e Modelo.");
      return;
    }

    if (!valores) {
      alert("Preencha corretamente os valores da peça e do reparo.");
      return;
    }

    setSalvando(true);
    try {
      const reparosFinal = [...reparos];
      if (outroReparo.trim()) reparosFinal.push(`Outros: ${outroReparo.trim()}`);

      const estadoFinal = [...estado];
      if (outroEstado.trim()) estadoFinal.push(`Outros: ${outroEstado.trim()}`);

      const docRef = await addDoc(collection(db, "ordens"), {
        cliente: cliente.trim(),
        modelo: modelo.trim(),
        reparos: reparosFinal,
        estado: estadoFinal,

        // FINANCEIRO
        valorPeca: valores.valorPeca,      // interno
        valorReparo: valores.valorReparo,  // interno
        valorTotal: valores.valorTotal,    // cliente vê
        lucro: valores.lucro,              // usado no financeiro

        status: "Em análise",
        criadoEm: new Date(),

        fotosAntes: fotosAntesLocal,
        fotosDepois: [],
      });

      alert("Ordem criada com sucesso!");
      router.push(`/ordem/${docRef.id}`);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar. Veja o console (F12).");
    } finally {
      setSalvando(false);
    }
  }

  /* ================== UI ================== */
  return (
    <main className="min-h-screen bg-black text-white p-6">
      {/* MENU */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/" className="bg-zinc-700 px-4 py-2 rounded font-bold">Home</Link>
        <Link href="/dashboard" className="bg-zinc-700 px-4 py-2 rounded font-bold">Ativas</Link>
        <Link href="/historico" className="bg-zinc-700 px-4 py-2 rounded font-bold">Histórico</Link>
        <Link href="/logout" className="bg-red-500 text-black px-4 py-2 rounded font-bold">Sair</Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Nova Ordem de Serviço</h1>

      {/* DADOS */}
      <input
        className="w-full mb-3 p-2 rounded bg-zinc-800 border border-zinc-700"
        placeholder="Nome do cliente"
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
      />

      <input
        className="w-full mb-3 p-2 rounded bg-zinc-800 border border-zinc-700"
        placeholder="Modelo do aparelho"
        value={modelo}
        onChange={(e) => setModelo(e.target.value)}
      />

      {/* FINANCEIRO */}
      <h2 className="font-bold mt-4 mb-2">Financeiro (interno)</h2>

      <input
        className="w-full mb-3 p-2 rounded bg-zinc-800 border border-zinc-700"
        placeholder="Valor da peça (custo interno)"
        value={valorPeca}
        onChange={(e) => setValorPeca(e.target.value)}
      />

      <input
        className="w-full mb-2 p-2 rounded bg-zinc-800 border border-zinc-700"
        placeholder="Valor do reparo (mão de obra)"
        value={valorReparo}
        onChange={(e) => setValorReparo(e.target.value)}
      />

      {valores && (
        <p className="text-green-400 font-bold mb-6">
          Valor final ao cliente: R$ {valores.valorTotal.toFixed(2)} | Lucro: R$ {valores.lucro.toFixed(2)}
        </p>
      )}

      {/* REPAROS */}
      <h2 className="font-bold mb-2">Tipo de reparo</h2>
      {["Troca de tela", "Reparo em placa", "Troca de conector"].map((r) => (
        <label key={r} className="block mb-2">
          <input
            type="checkbox"
            className="mr-2"
            checked={reparos.includes(r)}
            onChange={() => toggle(reparos, r, setReparos)}
          />
          {r}
        </label>
      ))}
      <input
        className="w-full mb-6 p-2 rounded bg-zinc-800 border border-zinc-700"
        placeholder="Outros reparos (opcional)"
        value={outroReparo}
        onChange={(e) => setOutroReparo(e.target.value)}
      />

      {/* ESTADO */}
      <h2 className="font-bold mb-2">Estado do aparelho</h2>
      {["Quebrado", "Ligando", "Molhado", "Arranhado", "Com avaria"].map((e) => (
        <label key={e} className="block mb-2">
          <input
            type="checkbox"
            className="mr-2"
            checked={estado.includes(e)}
            onChange={() => toggle(estado, e, setEstado)}
          />
          {e}
        </label>
      ))}
      <input
        className="w-full mb-6 p-2 rounded bg-zinc-800 border border-zinc-700"
        placeholder="Outros estados (opcional)"
        value={outroEstado}
        onChange={(e) => setOutroEstado(e.target.value)}
      />

      {/* FOTOS ANTES */}
      <h2 className="font-bold mb-2">Fotos (Antes)</h2>
      <label className="inline-block bg-zinc-700 px-4 py-2 rounded font-bold cursor-pointer">
        Selecionar fotos (Antes)
        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => addFotosAntes(e.target.files)} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {fotosAntesLocal.map((src, i) => (
          <div key={i} className="relative">
            <img src={src} className="rounded border border-zinc-700" />
            <button
              onClick={() => removerFotoAntes(i)}
              className="absolute top-2 right-2 bg-red-500 text-black px-2 py-1 rounded font-bold"
            >
              X
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={salvarOrdem}
        disabled={salvando}
        className="mt-8 bg-yellow-500 text-black px-6 py-3 rounded font-bold disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Salvar Ordem"}
      </button>
    </main>
  );
}
