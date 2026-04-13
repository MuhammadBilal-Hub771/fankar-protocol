import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Fankar Protocol",
  description: "Web3 Creator & Culture Protocol — Powered by Fankar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Scanline CRT overlay */}
        <div className="scanlines" />

        {/* Background grid pattern */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage: `
              linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />

        {/* Ambient glow blobs */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: "-10%",
            left: "10%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,180,255,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "fixed",
            bottom: "5%",
            right: "5%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Main app shell */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            minHeight: "100vh",
          }}
        >
          <Sidebar />

          <main
            style={{
              flex: 1,
              marginLeft: "var(--sidebar-width)",
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TopBar />
            <div style={{ flex: 1, padding: "32px" }}>{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
