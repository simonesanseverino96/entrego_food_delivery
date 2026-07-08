import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrego — Food Delivery in Bluffton, SC',
  description: 'Order food from Bluffton restaurants with fast delivery.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
