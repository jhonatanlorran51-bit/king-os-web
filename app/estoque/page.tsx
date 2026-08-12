"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

type Peca = {
  id: string;
  nome: string;
  codigo: string;
  quantidade: number;
  custo: number;
  preco: number;
};

export default function EstoquePage() {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [custo, setCusto] = useState("");
  const [preco, setPreco] = useState("");

  const [editando, setEditando] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "estoque"),
      (snap) => {
        const lista = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Peca, "id">),
        }));

        setPecas(lista);
        setCarregando(false);
      },
      (erro) => {
        console.error("Erro ao carregar estoque:", erro);
        setCarregando(false);
      }
    );

    return () => unsub();
  }, []);

  function numero(valor: string) {
    const n = Number(String(valor).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function limpar() {
    setNome("");
    setCodigo("");
    setQuantidade("");
    setCusto("");
    setPreco("");
    setEditando(null);
  }

  async function salvarPeca() {
    if (!nome.trim()) {
      alert("Digite o nome da peça.");
      return;
    }

    const dados = {
      nome: nome.trim(),
      codigo: codigo.trim(),
      quantidade: Math.max(0, Math.floor(numero(quantidade))),
      custo: numero(custo),
      preco: numero(preco),
    };

    try {
      if (editando) {
        await updateDoc(doc(db, "estoque", editando), dados);
      } else {
        await addDoc(collection(db, "estoque"), dados);
      }

      limpar();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar a peça.");
    }
  }

  function editarPeca(peca: Peca) {
    setEditando(peca.id);
    setNome(peca.nome);
    setCodigo(peca.codigo || "");
    setQuantidade(String(peca.quantidade ?? 0));
    setCusto(String(peca.custo ?? 0));
    setPreco(String(peca.preco ?? 0));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirPeca(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta peça?")) return;

    try {
      await deleteDoc(doc(db, "estoque", id));
    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir a peça.");
    }
  }

  async function alterarQuantidade(peca: Peca, valor: number) {
    const novaQuantidade = Math.max(
      0,
      Math.floor((peca.quantidade || 0) + valor)
    );

    try {
      await updateDoc(doc(db, "estoque", peca.id), {
        quantidade: novaQuantidade,
      });
    } catch (erro) {
      console.error(erro);
      alert("Erro ao alterar quantidade.");
    }
  }

  const totalItens = pecas.reduce(
    (total, peca) => total + (peca.quantidade || 0),
    0
  );

  const valorEstoque = pecas.reduce(
    (total, peca) => total + (peca.quantidade || 0) * (peca.custo || 0),
    0
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 font-bold"
          >
            Voltar
          </Link>

          <span className="text-zinc-400 text-sm">Estoque</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Estoque</h1>

        <p className="text-zinc-400 mb-6">
          Controle das peças disponíveis.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-400 text-sm">Peças cadastradas</p>
            <p className="text-2xl font-extrabold">{pecas.length}</p>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-400 text-sm">Quantidade total</p>
            <p className="text-2xl font-extrabold">{totalItens}</p>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 mb-6">
          <h2 className="font-bold mb-4">
            {editando ? "Editar peça" : "Adicionar peça"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Nome da peça"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Código / referência"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />

            <input
              type="number"
              min="0"
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />

            <input
              inputMode="decimal"
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Custo da peça"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
            />

            <input
              inputMode="decimal"
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800"
              placeholder="Preço de venda"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={salvarPeca}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-2xl font-extrabold"
            >
              {editando ? "Salvar alterações" : "Adicionar peça"}
            </button>

            {editando && (
              <button
                type="button"
                onClick={limpar}
                className="px-5 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-2xl font-bold"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Peças em estoque</h2>

            <span className="text-zinc-500 text-sm">
              Valor de custo: R$ {valorEstoque.toFixed(2)}
            </span>
          </div>

          {carregando && (
            <p className="text-zinc-400">Carregando estoque...</p>
          )}

          {!carregando && pecas.length === 0 && (
            <p className="text-zinc-500">
              Nenhuma peça cadastrada ainda.
            </p>
          )}

          <div className="space-y-3">
            {pecas.map((peca) => (
              <div
                key={peca.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">{peca.nome}</h3>

                    {peca.codigo && (
                      <p className="text-zinc-500 text-sm">
                        Código: {peca.codigo}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      <span className="text-zinc-300">
                        Custo: R$ {(peca.custo || 0).toFixed(2)}
                      </span>

                      <span className="text-zinc-300">
                        Venda: R$ {(peca.preco || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-zinc-400 text-sm">Quantidade</p>

                    <p
                      className={`text-2xl font-extrabold ${
                        peca.quantidade <= 0
                          ? "text-red-400"
                          : peca.quantidade <= 2
                            ? "text-yellow-400"
                            : "text-green-400"
                      }`}
                    >
                      {peca.quantidade}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => alterarQuantidade(peca, -1)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold"
                  >
                    -1
                  </button>

                  <button
                    type="button"
                    onClick={() => alterarQuantidade(peca, 1)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold"
                  >
                    +1
                  </button>

                  <button
                    type="button"
                    onClick={() => editarPeca(peca)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirPeca(peca.id)}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-black font-bold"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}