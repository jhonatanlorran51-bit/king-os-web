export default function SRoot() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <p className="text-red-400 font-bold">Link incompleto</p>
        <p className="text-zinc-300 mt-2">
          Esse link precisa de um código no final.
        </p>
        <p className="text-zinc-400 mt-3 text-sm">
          Exemplo: <b>/s/ABC123...</b>
        </p>
      </div>
    </main>
  );
}
