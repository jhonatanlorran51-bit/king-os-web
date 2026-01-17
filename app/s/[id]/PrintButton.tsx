"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-white text-black px-4 py-2 rounded-xl font-extrabold"
    >
      Baixar / Imprimir PDF
    </button>
  );
}
