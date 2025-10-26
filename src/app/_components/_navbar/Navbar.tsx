'use client';

import Link from 'next/link';
import Image from 'next/image';
import Logo from './Logo';

export type NavLink = {
    name: string;
    href: string;
};

const Navbar = () => {
    const navLinks: NavLink[] = [
        {
            name: 'Home',
            href: '/',
        },
        {
            name: 'Features',
            href: '/features',
        },
        {
            name: 'Pricing',
            href: '/pricing',
        },
    ];

    return (
        <>
            <section className='w-screen fixed top-0 backdrop-blur-sm px-5 z-100 flex justify-center max-w-max-width'>
                <div className='flex items-center justify-between h-18 mt-5 rounded-2xl primary-border px-5 w-full max-w-max-width from-background-light via-[#FFEDDD] to-background-light'>
                    {/* <Logo /> */}
                    <Image src='/maneaccount-logo.png' alt='logo' className='h-15 w-[430px]' width={300} height={42} />
                    <div className='hidden 4xl:flex gap-6 font-figtree font-semibold text-base'>
                        <NavbarLinks links={navLinks} />
                    </div>
                    <div className='hidden navbar-md:flex gap-2 items-center font-figtree font-bold text-base'>
                        <div className='flex 4xl:hidden gap-6 font-figtree font-semibold text-base mr-3'>
                            <NavbarLinks links={navLinks} />
                        </div>
                        <Link
                            href='/sign-in'
                            className='grid place-items-center rounded-full py-1 px-4 navbar-lg:px-5 text-[15px] navbar-lg:text-base text-primary border-2 border-primary hover:scale-[1.025] hover:brightness-[1.05] transition-all'
                        >
                            Sign In
                        </Link>
                        <Link
                            href='/get-started'
                            className='grid place-items-center rounded-full py-1 px-4 navbar-lg:px-5 text-[15px] navbar-lg:text-base text-background-light border-2 border-primary bg-primary hover:scale-[1.025] hover:brightness-[1.05] transition-all'
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
};

const NavbarLinks = ({ links }: { links: NavLink[] }) => {
    return links.map(({ name, href }) => (
        <Link key={name} href={href} className='hover:text-primary transition-all duration-200 text-[15px] navbar-lg:text-base'>
            {name}
        </Link>
    ));
};

export default Navbar;
