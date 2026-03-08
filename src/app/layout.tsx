import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Agentation } from 'agentation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Proposed Issues | Linear',
  description: 'AI-powered code analysis with human approval before creating Linear issues',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#6366f1',
          colorBackground: '#0a0a0f',
          colorInputBackground: '#16161e',
          colorInputText: '#e4e4e7',
          colorText: '#e4e4e7',
          colorTextSecondary: '#a1a1aa',
          colorNeutral: '#e4e4e7',
        },
        elements: {
          card: 'bg-[#16161e] border border-[#27272a]',
          userButtonPopoverCard: 'bg-[#16161e] border border-[#27272a]',
          userButtonPopoverActionButton: 'hover:bg-[#27272a]',
          userButtonPopoverActionButtonText: 'text-[#e4e4e7]',
          userButtonPopoverActionButtonIcon: 'text-[#a1a1aa]',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-background text-foreground antialiased`}>
          {children}
          {process.env.NODE_ENV === 'development' && <Agentation />}
        </body>
      </html>
    </ClerkProvider>
  );
}
