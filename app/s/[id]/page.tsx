export const dynamic = "force-dynamic";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

function toArr(v: any): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function toStr(v: any): string {
  return typeof v === "string" ? v : "";
}
function toNum(v: any): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

// Firestore REST convert
function fsValueToJs(v: any): any {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.booleanValue !== undefined) return Boolean(v.booleanValue);
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) {
    const arr = v.arrayValue.values || [];
    return arr.map(fsValueToJs);
  }
  if (v.mapValue !== undefined) {
    const fields = v.mapValue.fields || {};
    const obj: any = {};
    for (const k of Object.keys(fields)) obj[k] = fsValueToJs(fields[k]);
    return obj;
  }
  return null;
}

async function getShareDoc(id: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    return { ok: false, error: "Faltam env vars do Firebase no Vercel." };
  }

  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}` +
    `/databases/(default)/documents/shares/${id}` +
    `?key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `Firestore: ${res.status} ${res.statusText} ${txt}` };
  }

  const json = await res.json();
  const fields = json.fields || {};
  const data: any = {};
  for (const k of Object.keys(fields)) data[k] = fsValueToJs(fields[k]);
  return { ok: true, data };
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const id = String(params?.id || "");

  if (!id) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <p className="text-red-400 font-bold">Link inválido</p>
          <p className="text-zinc-300 mt-2">Sem ID.</p>
        </div>
      </main>
    );
  }

  const r = await getShareDoc(id);

  if (!r.ok) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <p className="text-red-400 font-bold">Não foi possível abrir</p>
          <p className="text-zinc-300 mt-2 break-words">{r.error}</p>
          <p className="text-zinc-500 text-xs mt-4 break-words">ID: {id}</p>
        </div>
      </main>
    );
  }

  const d: any = r.data || {};

  const lojaNome = toStr(d.lojaNome) || "KING OF CELL";
  const cliente = toStr(d.cliente) || "-";
  const marca = toStr(d.marca) || "-";
  const modelo = toStr(d.modelo) || "-";
  const valorTotal = toNum(d.valorTotal);

  const reparos = toArr(d.reparos);
  const estado = toArr(d.estado);
  const fotosAntes = toArr(d.fotosAntes);
  const fotosDepois = toArr(d.fotosDepois);

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-2xl font-extrabold">{lojaNome}</p>
            <p className="text-zinc-400 text-sm">Comprovante / Ordem de Serviço</p>
          </div>

          <button
            onClick={() => (globalThis as any).print?.()}
            className="bg-white text-black px-4 py-2 rounded-xl font-extrabold"
          >
            Imprimir / Salvar PDF
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-2">
          <p><b>Cliente:</b> {cliente}</p>
          <p><b>Aparelho:</b> {marca} • {modelo}</p>
          <p>
            <b>Valor Final:</b>{" "}
            <span className="text-green-400 font-extrabold">
              {typeof valorTotal === "number" ? formatBRL(valorTotal) : "-"}
            </span>
          </p>
        </div>

        <div className="mt-5">
          <p className="font-bold mb-2">Serviços</p>
          <ul className="list-disc pl-6 text-zinc-200">
            {reparos.length ? reparos.map((r, i) => <li key={i}>{r}</li>) : <li>-</li>}
          </ul>
        </div>

        <div className="mt-5">
          <p className="font-bold mb-2">Estado do aparelho</p>
          <ul className="list-disc pl-6 text-zinc-200">
            {estado.length ? estado.map((e, i) => <li key={i}>{e}</li>) : <li>-</li>}
          </ul>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Antes)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fotosAntes.length ? fotosAntes.map((src, i) => (
              <img key={i} src={src} alt={`Antes ${i + 1}`} className="rounded-xl border border-zinc-800" />
            )) : <p className="text-zinc-400">Nenhuma foto.</p>}
          </div>
        </div>

        <div className="mt-6">
          <p className="font-bold mb-2">Fotos (Depois)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {fotosDepois.length ? fotosDepois.map((src, i) => (
              <img key={i} src={src} alt={`Depois ${i + 1}`} className="rounded-xl border border-zinc-800" />
            )) : <p className="text-zinc-400">Nenhuma foto.</p>}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: #000 !important; }
          button { display: none !important; }
        }
      `}</style>
    </main>
  );
}
