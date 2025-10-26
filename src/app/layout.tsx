import { Lusitana, Figtree } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import ColorSelection from './_components/ColorSelection';

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

export const metadata: Metadata = {
    title: 'ManeAccount',
    description: 'Organize your braiding business.',
    icons: {
        icon: [
            {
                url: '/mane-account-M.png',
                href: '/mane-account-M.png',
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
        <html lang='en' className={`${figtree.variable} ${lusitana.variable}`}>
            <body className={`overflow-x-hidden h-screen w-screen p-0 bg-background`}>
                {children}
                <ColorSelection />
            </body>
        </html>
    );
}
