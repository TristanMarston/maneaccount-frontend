import { Lusitana, Figtree, Lustria, Reenie_Beanie } from 'next/font/google';
import type { Metadata } from 'next';
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

const reenieBeanie = Reenie_Beanie({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-reenie-beanie',
    weight: ['400'],
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
        <html lang='en' className={`${figtree.variable} ${lusitana.variable} ${lustria.variable} ${reenieBeanie.variable}`}>
            <body className={`overflow-x-hidden h-screen w-screen p-0 bg-background`}>
                {children}
            </body>
        </html>
    );
}
