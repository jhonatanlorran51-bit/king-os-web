import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "King OS",
  description: "Sistema de Ordens de Serviço - King Of Cell",

  manifest: "/manifest.webmanifest",
  themeColor: "#000000",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "King OS",
  },

  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="King OS" />
      </head>

      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
