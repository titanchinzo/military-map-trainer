import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Тактикийн тэмдгийн сургалт",
  description:
    "Байлдааны газрын зураг дээр цэргийн тактикийн таних тэмдэг байрлуулах сургалтын хэрэгсэл",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="mn"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="h-full flex flex-col bg-zinc-950 text-zinc-100">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-zinc-50">
                Тактикийн тэмдгийн сургалт
              </span>
              <span className="hidden text-xs text-zinc-500 sm:inline">
                T4-2022 · TessaDEM
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Show when="signed-in">
                <Link
                  href="/map"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  Газрын зураг
                </Link>
                <UserButton />
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-500">
                    Нэвтрэх
                  </button>
                </SignInButton>
              </Show>
            </div>
          </header>
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
