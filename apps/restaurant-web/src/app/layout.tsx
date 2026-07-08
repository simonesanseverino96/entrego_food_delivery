import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrego — Restaurant Dashboard',
  description: 'Manage your restaurant orders, menu, and finances.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
