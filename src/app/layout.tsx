import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlckBx Partnerships Portal',
  description: 'Partnership pipeline management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-blckbx-sand">
        {children}
      </body>
    </html>
  );
}
