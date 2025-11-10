import { useState, useEffect, useRef, Fragment } from 'react';
import { useAnimate, stagger, motion, Variants, AnimatePresence } from 'motion/react';
import { dropdownVariants, flipVariants, NavLink } from './Navbar';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

const MobileMenu = ({ isOpen, setIsOpen, links }: { isOpen: boolean; setIsOpen: React.Dispatch<React.SetStateAction<boolean>>; links: NavLink[] }) => {
    const [currentDropdown, setCurrentDropdown] = useState(-1);

    return (
        <div className='fixed top-26 4xl:top-28 w-full px-5 z-100'>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={dropdownVariants}
                        animate={isOpen ? 'open' : 'closed'}
                        exit='closed'
                        initial='closed'
                        className='flex navbar-desktop:hidden flex-col gap-4 bg-background rounded-[18px] primary-border p-6 w-full'
                    >
                        {links.map(({ name, href, dropdown }, index) => (
                            <Fragment key={name}>
                                {dropdown !== undefined ? (
                                    <DropdownLink key={name} name={name} dropdown={dropdown} index={index} currentDropdown={currentDropdown} setCurrentDropdown={setCurrentDropdown} />
                                ) : (
                                    <Link key={name} href={href} className='text-primary hover:text-primary-light font-figtree font-semibold text-2xl select-none w-full transition-all'>
                                        {name}
                                    </Link>
                                )}
                                <div className='w-full h-[0.5px] bg-primary rounded-full' />
                            </Fragment>
                        ))}
                        <div className='flex items-center justify-end font-figtree font-bold text-base gap-3'>
                            <Link href='/sign-in' className='w-full text-nowrap grid place-items-center rounded-[10px] py-2 text-lg text-primary primary-border-hover'>
                                Sign In
                            </Link>
                            <Link
                                href='/get-started'
                                className='w-full text-nowrap grid place-items-center rounded-[10px] py-2 text-lg bg-primary-light text-background primary-border-hover'
                            >
                                Get Started
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
                className='px-2 overflow-y-scroll overflow-x-hidden h-full text-base lg:text-[17px] max-h-[400px]'
            >
                {dropdown()}
            </motion.div>
        </motion.div>
    );
};

export default MobileMenu;
