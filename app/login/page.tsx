"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, sai do /login automaticamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  async function handleLogin() {
    setErro("");
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), senha.trim());
      router.replace("/");
    } catch (e: any) {
      console.error("ERRO LOGIN:", e?.code, e?.message);
      setErro("Falha no login: " + (e?.code || "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-xl w-80">
        <h1 className="text-2xl font-bold text-center mb-6">KING OF CELL</h1>

        <input
          type="email"
          placeholder="E-mail"
          className="w-full mb-3 p-2 rounded bg-zinc-800 border border-zinc-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 rounded bg-zinc-800 border border-zinc-700"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && (
          <p className="text-red-400 text-sm mb-3 text-center">{erro}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-yellow-500 text-black font-bold py-2 rounded disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}
