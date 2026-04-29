import type { Metadata } from 'next';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ANGREN TAXI',
  description: 'Passenger web app for ANGREN TAXI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <header className="app-header">
          <Link className="brand" href="/order">
            ANGREN TAXI
          </Link>
          <nav className="nav-links" aria-label="Основная навигация">
            <Link href="/order">Заказ</Link>
            <Link href="/history">История</Link>
            <Link href="/login">Вход</Link>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
