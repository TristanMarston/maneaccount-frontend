import { Lusitana, Figtree, Lustria } from 'next/font/google';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const figtree = Figtree({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-figtree',
});

const lusitana = Lusitana({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-lusitana',
    weight: ['400', '700'],
});

const lustria = Lustria({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-lustria',
    weight: ['400'],
});

export const metadata: Metadata = {
    title: 'ManeAccount',
    description: 'Organize your braiding business.',
    icons: {
        icon: [
            {
                url: '/maneaccount-M-192x192.png',
                href: '/maneaccount-M-192x192.png',
            },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='en' className={`${figtree.variable} ${lusitana.variable} ${lustria.variable}`}>
            <body className={`overflow-x-hidden h-dvh w-dvw p-0 bg-background`}>
                {children}
                <Analytics />
            </body>
        </html>
    );
}
