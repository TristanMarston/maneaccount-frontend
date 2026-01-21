'use client';

import React from 'react';
import Navbar from './_navbar/Navbar';
import Footer from './_landing/_footer/Footer';
import { SessionProvider } from 'next-auth/react';
import { motion } from 'motion/react';

export const Title = ({ children }: { children: React.ReactNode }) => (
    <h1 className='text-4xl md:text-6xl font-lusitana font-bold text-primary mb-12 tracking-tight drop-shadow-sm'>{children}</h1>
);

export const HeadingOne = ({ children }: { children: React.ReactNode }) => (
    <h2 className='text-2xl md:text-3xl font-lusitana font-bold text-primary mt-16 mb-8 border-b-2 border-primary/10 pb-3'>{children}</h2>
);

export const HeadingTwo = ({ children }: { children: React.ReactNode }) => <h3 className='text-xl md:text-2xl font-lusitana font-semibold text-primary-dark mt-10 mb-5'>{children}</h3>;

export const Bold = ({ children }: { children: React.ReactNode }) => (
    <span className='font-bold text-gray-950 px-0.5'>{children}</span>
);

export const BulletList = ({ children }: { children: React.ReactNode }) => <ul className='list-disc list-outside ml-8 space-y-4 my-8 text-gray-700 font-figtree'>{children}</ul>;

export const BulletItem = ({ children }: { children: React.ReactNode }) => <li className='pl-2 leading-relaxed'>{children}</li>;

export const Paragraph = ({ children }: { children: React.ReactNode }) => <p className='mb-6 text-gray-700 font-figtree leading-relaxed text-lg'>{children}</p>;

export const LegalPageLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <SessionProvider>
            <div className='relative min-h-screen flex flex-col items-center overflow-x-hidden bg-background'>
                <Navbar />
                <main className='w-full max-w-max-width pt-32 4xl:pt-36 px-4 sm:px-8 5xl:px-13 pb-48'>
                    <div className='bg-white/80 backdrop-blur-xl rounded-3xl p-8 min-[515px]:p-12 primary-border shadow-[0_20px_50px_rgba(0,0,0,0.1)]'>{children}</div>
                </main>
                <Footer />
            </div>
        </SessionProvider>
    );
};
