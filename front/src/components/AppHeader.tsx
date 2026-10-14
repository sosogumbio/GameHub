"use client";

import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/" className="brand">GameHub</Link>
      <nav>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/products">Produtos</Link>
        <Link href="/favorites">Favoritos</Link>
        <Link href="/login">Entrar</Link>
      </nav>
    </header>
  );
}
