import { useState, useEffect, useRef, Fragment } from 'react';
import { useAnimate, stagger, motion, Variants, AnimatePresence } from 'motion/react';
import { dropdownVariants, flipVariants, NavLink } from './Navbar';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useScrollShadow } from '@/hooks/useScrollShadow';

const MobileMenu = ({ isOpen, setIsOpen, links }: { isOpen: boolean; setIsOpen: React.Dispatch<React.SetStateAction<boolean>>; links: NavLink[] }) => {
    const [currentDropdown, setCurrentDropdown] = useState(-1);

    return (
        <div className='fixed top-26 4xl:top-28 w-full px-5 z-100'>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={dropdownVariants(0.2, 0.3)}
                        animate={isOpen ? 'open' : 'closed'}
                        exit='closed'
                        initial='closed'
                        className='flex navbar-desktop:hidden flex-col gap-4 bg-background rounded-[18px] primary-border p-6 w-full'
                    >
                        {links.map(({ name, href, dropdown, scroll }, index) => (
                            <Fragment key={name}>
                                {dropdown !== undefined ? (
                                    <DropdownLink key={name} name={name} dropdown={dropdown} index={index} currentDropdown={currentDropdown} setCurrentDropdown={setCurrentDropdown} />
                                ) : (
                                    <Link
                                        key={name}
                                        href={scroll ? '#' : href}
                                        onClick={(e) => {
                                            setIsOpen(false);
                                            e.preventDefault();
                                            if (scroll) {
                                                const targetElement = document.getElementById(href.substring(1));
                                                if (targetElement) {
                                                    targetElement.scrollIntoView({ behavior: 'smooth' });
                                                }
                                            }
                                        }}
                                        className='text-primary hover:text-primary-light font-figtree font-semibold text-2xl select-none w-full transition-all'
                                    >
                                        {name}
                                    </Link>
                                )}
                                <div className='w-full h-[0.5px] bg-primary rounded-full' />
                            </Fragment>
                        ))}
                        <div className='flex flex-col md:flex-row items-center justify-end font-figtree font-bold text-base gap-3'>
                            <Link href='/login?mode=signin' className='w-full text-nowrap grid place-items-center rounded-[10px] py-2 text-lg xl:text-xl text-primary primary-border-hover'>
                                Sign In
                            </Link>
                            <Link
                                href='/login?mode=signup'
                                className='w-full text-nowrap grid place-items-center rounded-[10px] py-2 text-lg xl:text-xl bg-primary-light text-background primary-border-hover'
                            >
                                Start For Free
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DropdownLink = ({
    name,
    dropdown,
    currentDropdown,
    setCurrentDropdown,
    index,
}: {
    name: string;
    dropdown: () => React.ReactNode;
    currentDropdown: number;
    setCurrentDropdown: React.Dispatch<React.SetStateAction<number>>;
    index: number;
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const { showBottomShadow } = useScrollShadow(contentRef);

    const toggleQuestion = (index: number) => {
        if (currentDropdown === index) setCurrentDropdown(-1);
        else setCurrentDropdown(index);
    };

    const answerVariants: Variants = {
        closed: {
            opacity: 0,
            height: 0,
            marginTop: 0,
            marginBottom: 0,
        },
        open: {
            opacity: 1,
            height: contentHeight,
            marginTop: '8px',
            marginBottom: '8px',
        },
    };

    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, []);

    return (
        <motion.div
            key={index}
            animate={currentDropdown === index ? 'open' : 'closed'}
            initial='closed'
            className='flex flex-col justify-center rounded-2xl cursor-pointer overflow-y-scroll overflow-x-hidden'
        >
            <motion.div className='flex justify-between items-center rounded-xl' onClick={() => toggleQuestion(index)}>
                <div className='text-primary hover:text-primary-light font-figtree font-semibold text-2xl select-none w-full transition-all'>{name}</div>

                <motion.div variants={flipVariants} initial='closed' animate={currentDropdown === index ? 'open' : 'closed'}>
                    <ChevronDown strokeWidth={1.8} className='text-primary' />
                </motion.div>
            </motion.div>

            <motion.div
                key='answer'
                ref={contentRef}
                variants={answerVariants}
                initial='closed'
                animate={currentDropdown === index ? 'open' : 'closed'}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className='px-2 flex flex-col gap-2 relative overflow-x-hidden h-full text-base lg:text-[17px] max-h-[30vh] lg:max-h-[35vh]'
            >
                {dropdown()}
                {showBottomShadow && <div className='sticky bottom-0 left-0 right-0 min-h-8 bg-linear-to-t from-background to-transparent pointer-events-none' />}
            </motion.div>
        </motion.div>
    );
};

export default MobileMenu;
