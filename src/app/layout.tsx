import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <div className="min-h-screen">
          {/* Header */}
          <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 100 100"
                    fill="currentColor"
                  >
                    <path d="M15.08,66.92l19-19-19-19,11.3-11.31L64.69,55.9a4,4,0,0,1,0,5.66L26.38,99.87Z" />
                    <path d="M84.92,66.92l-19-19,19-19L73.62,17.61,35.31,55.9a4,4,0,0,0,0,5.66L73.62,99.87Z" />
                  </svg>
                  <span className="font-semibold text-lg">Proposed Issues</span>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                    Beta
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  AI-powered code analysis
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
