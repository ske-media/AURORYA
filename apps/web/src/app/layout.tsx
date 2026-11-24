import { darkColors } from '@aurorya/shared';
import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { messages } from '@/messages';
import './globals.css';

export const metadata: Metadata = { title: messages.brand.name, description: messages.brand.tagline, robots: { index: true, follow: true } };

// Thème sombre uniquement au lancement (D-024) : les rôles de couleur deviennent des variables CSS.
const colorVariables = Object.fromEntries(Object.entries(darkColors).map(([role, value]) => [`--${role}`, value])) as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" style={colorVariables}>
      <body>{children}</body>
    </html>
  );
}
