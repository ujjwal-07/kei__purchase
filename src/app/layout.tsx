import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KEI Purchase Department — Purchase Order Register',
  description: 'Enterprise Purchase Order Register & Approval Workflow for KEI Purchase Department',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
