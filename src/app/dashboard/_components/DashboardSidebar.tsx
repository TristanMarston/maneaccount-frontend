'use client';

import {
    BadgeDollarSign,
    Banknote,
    Calendar,
    ClipboardCheck,
    ChevronsLeft,
    CreditCard,
    HelpCircle,
    Home,
    Icon,
    LogOut,
    Mail,
    Menu,
    MoreHorizontal,
    Settings,
    User,
    Scissors,
    UserPlus,
    Users,
    X,
    Briefcase,
    Wallet,
    Warehouse,
    Sparkles,
} from 'lucide-react';
import { horseHead } from '@lucide/lab';
import { AnimatePresence, motion, Variants } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import Modal from '../Modal';
import { useNotifications } from '@/app/NotificationContext';
import { NotificationType, SubscriptionTier } from '@prisma/client';
import { Tab } from './_braider/BraiderDashboard';

type Page = {
    title: string;
    icon: React.ElementType;
    path: string;
    accountTypes: string[];
};

const HorseIcon = () => <Icon className='w-full h-full max-h-5 max-w-5 dashboard-sm:max-w-6 dashboard-sm:max-h-6' iconNode={horseHead} />;

const pages: Page[] = [
    { title: 'Dashboard', path: '/dashboard/', icon: Home, accountTypes: ['barn', 'subcontractor', 'braider', 'admin'] },
    { title: 'Calendar', path: '/dashboard/calendar', icon: Calendar, accountTypes: ['braider', 'subcontractor', 'barn'] },
    { title: 'Tasks', path: '/dashboard/tasks', icon: ClipboardCheck, accountTypes: ['braider', 'subcontractor'] },
    { title: 'Services', path: '/dashboard/services', icon: Briefcase, accountTypes: ['barn'] },
    { title: 'Invoices', path: '/dashboard/invoices', icon: Banknote, accountTypes: ['braider', 'barn'] },
    { title: 'Braiders', path: '/dashboard/braiders', icon: Scissors, accountTypes: ['barn'] },
    { title: 'Horses', path: '/dashboard/horses', icon: HorseIcon, accountTypes: ['barn'] },
    { title: 'Barns', path: '/dashboard/barns', icon: Warehouse, accountTypes: ['braider'] },
    { title: 'Team', path: '/dashboard/team', icon: UserPlus, accountTypes: ['braider', 'subcontractor'] },
    { title: 'Pricing', path: '/dashboard/pricing', icon: BadgeDollarSign, accountTypes: ['braider'] },
];

const DashboardSidebar = ({
    dashboard,
    session,
    update,
    loading,
    name,
    image,
    selectedPage,
    setSelectedPage,
    unsavedChanges,
    activeTab,
    setActiveTab,
    subscriptionTier,
}: {
    dashboard: string;
    session: Session | null;
    update: (data?: any) => Promise<Session | null>;
    loading: boolean;
    name: string;
    image: string;
    selectedPage: string;
    setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
    unsavedChanges?: boolean;
    activeTab: Tab;
    setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
    subscriptionTier?: SubscriptionTier | null;
}) => {
    const { unreadCounts, refreshCounts } = useNotifications();
    const [open, setOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unsavedModalOpen, setUnsavedModalOpen] = useState(false);
    const [pendingPage, setPendingPage] = useState<string | null>(null);

    useEffect(() => {
        refreshCounts();
    }, [selectedPage, refreshCounts]);

    const handlePageChange = (title: string) => {
        if (selectedPage === title) {
            setMobileMenuOpen(false);
            return;
        }

        if (unsavedChanges) {
            setPendingPage(title);
            setUnsavedModalOpen(true);
        } else {
            setSelectedPage(title);
            setMobileMenuOpen(false);
        }
    };

    const confirmNavigation = () => {
        if (pendingPage) {
            setSelectedPage(pendingPage);
            setPendingPage(null);
        }
        setUnsavedModalOpen(false);
        setMobileMenuOpen(false);
    };

    const getPageNotifs = (page: Page) => {
        if (page.title === 'Calendar') return unreadCounts.byType[NotificationType.calendar_invite] || 0;
        if (page.title === 'Tasks' || page.title === 'Services') {
            return (
                (unreadCounts.byType[NotificationType.job_request] || 0) +
                (unreadCounts.byType[NotificationType.job_status_change] || 0) +
                (unreadCounts.byType[NotificationType.job_completed] || 0) +
                (unreadCounts.byType[NotificationType.job_paid] || 0) +
                (unreadCounts.byType[NotificationType.new_message] || 0)
            );
        }
        if (page.title === 'Team') {
            return (unreadCounts.byType[NotificationType.team_invite] || 0) + (unreadCounts.byType[NotificationType.team_status_change] || 0);
        }
        if (page.title === 'Barns' || page.title === 'Braiders') {
            return (unreadCounts.byType[NotificationType.barn_invite] || 0) + (unreadCounts.byType[NotificationType.barn_status_change] || 0);
        }
        return 0;
    };

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const userDropdownRef = useRef<HTMLDivElement>(null);
    const userButtonRef = useRef<HTMLDivElement>(null);

    // Mobile Detection (Breakpoint 650px)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 650);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useOnClickOutside(userDropdownRef, [userButtonRef], () => setUserDropdownOpen(false));

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-open');
        if (saved !== null) setOpen(JSON.parse(saved));
    }, []);

    const handleToggle = () => {
        setOpen((prev) => {
            const newState = !prev;
            localStorage.setItem('sidebar-open', JSON.stringify(newState));
            return newState;
        });
    };

    const normalizedRole = (dashboard || 'braider').toLowerCase();
    const filteredPages = pages.filter((page) => {
        if (subscriptionTier === 'starter' && page.title === 'Team') return false;
        return page.accountTypes.includes(normalizedRole);
    });

    const mobilePrimaryPages = filteredPages.slice(0, 3);
    const mobileSecondaryPages = filteredPages.slice(3);

    if (isMobile) {
        return (
            <>
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileMenuOpen(false)}
                                className='fixed inset-0 bg-black/40 backdrop-blur-[2px] z-71'
                            />

                            <motion.div
                                initial={{ y: '100%', opacity: 0.5 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className='fixed font-figtree bottom-6 left-4 right-4 bg-white rounded-3xl z-80 shadow-2xl border border-gray-100 overflow-hidden max-h-[75vh] flex flex-col'
                            >
                                <div className='p-5 border-b border-gray-100 bg-gray-50/50'>
                                    <div className='flex items-center gap-3'>
                                        {image && image.length > 0 ? (
                                            <Image className='w-12 h-12 rounded-full border border-white shadow-sm' src={image} alt='profile' width={50} height={50} />
                                        ) : (
                                            <div className='h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shadow-sm'>
                                                {name ? name.charAt(0).toUpperCase() : ''}
                                            </div>
                                        )}
                                        <div className='flex flex-col overflow-hidden'>
                                            <span className='font-lusitana font-bold leading-[1.25] text-lg text-gray-900 truncate'>{name}</span>
                                            <div className='flex items-center gap-1'>
                                                <Mail className='w-3 h-3 text-gray-500' />
                                                <p className='text-xs text-gray-500 truncate'>{session?.user.email}</p>
                                            </div>
                                            <div className='flex items-center gap-1 mt-0.5'>
                                                {dashboard === 'barn' ? (
                                                    <Warehouse className='w-3 h-3 text-gray-500' />
                                                ) : dashboard === 'subcontractor' ? (
                                                    <Users className='w-3 h-3 text-gray-500' />
                                                ) : (
                                                    <Scissors className='w-3 h-3 text-gray-500' />
                                                )}
                                                <p className='text-xs text-gray-500 truncate'>{dashboard}</p>
                                            </div>
                                        </div>
                                        <div className='ml-auto'>
                                            <span className='inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary'>
                                                Pro
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className='overflow-y-auto p-4 space-y-4 font-figtree'>
                                    {mobileSecondaryPages.length > 0 && (
                                        <div className='space-y-1'>
                                            <p className='px-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2'>Menu</p>
                                            {mobileSecondaryPages.map((page) => (
                                                <MobileDrawerItem
                                                    key={page.title}
                                                    icon={page.icon}
                                                    title={page.title}
                                                    notifs={getPageNotifs(page)}
                                                    onClick={() => handlePageChange(page.title)}
                                                    selected={selectedPage === page.title}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className='space-y-1'>
                                        <p className='px-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2'>Account</p>
                                        <MobileDrawerItem
                                            icon={Settings}
                                            title='Settings'
                                            onClick={() => {
                                                setActiveTab('profile');
                                                handlePageChange('Settings');
                                            }}
                                            selected={selectedPage === 'Settings'}
                                        />
                                        <MobileDrawerItem
                                            icon={User}
                                            title='Account'
                                            onClick={() => {
                                                setActiveTab('account');
                                                handlePageChange('Settings');
                                            }}
                                        />
                                        {dashboard === 'braider' && (
                                            <MobileDrawerItem
                                                icon={CreditCard}
                                                title='Payments'
                                                onClick={() => {
                                                    setActiveTab('payments');
                                                    handlePageChange('Settings');
                                                }}
                                            />
                                        )}
                                    </div>

                                    <button
                                        onClick={() => signOut({ callbackUrl: '/login?mode=signin' })}
                                        className='w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors'
                                    >
                                        <LogOut className='w-4.5 h-4.5' />
                                        Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <div className='fixed bottom-6 font-figtree h-16 z-70 w-full flex justify-center px-6 cm:px-8 min-[550px]:px-10 @container/nav'>
                    <div className='bg-white/95 w-full backdrop-blur-md rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 flex items-center justify-between dashboard-sm:hidden'>
                        {mobilePrimaryPages.map((page, index) => (
                            <MobileNavItem
                                key={page.title}
                                icon={page.icon}
                                title={page.title}
                                index={index}
                                selected={selectedPage === page.title}
                                notifs={getPageNotifs(page)}
                                onClick={() => handlePageChange(page.title)}
                            />
                        ))}
                        <MobileNavItem
                            icon={MoreHorizontal}
                            index={3}
                            title='More'
                            selected={mobileMenuOpen}
                            notifs={mobileSecondaryPages.some((p) => getPageNotifs(p) > 0) ? 1 : 0} // Show a dot if any secondary page has notifs
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        />
                    </div>
                </div>
                <Modal isOpen={unsavedModalOpen} setIsOpen={setUnsavedModalOpen} className='max-w-3xl p-7 rounded-[18px] relative primary-border-bold'>
                    <div className='@container/unsaved-changes'>
                        <h1 className='text-[27px] @min-[240px]/unsaved-changes:text-3xl @min-[265px]/unsaved-changes:text-[33px] @min-[285px]/unsaved-changes:text-4xl leading-[1.1] font-lusitana font-bold text-gray-900'>
                            Unsaved Changes
                        </h1>
                        <p className='text-gray-800 text-[17px] font-figtree mt-2'>You have unsaved changes. Are you sure you want to leave?</p>
                        <div className='grid grid-cols-1 @min-[380px]/unsaved-changes:grid-cols-2 mt-6 gap-3'>
                            <button
                                onClick={() => {
                                    setUnsavedModalOpen(false);
                                    setPendingPage(null);
                                }}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmNavigation}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                            >
                                Discard & Leave
                            </button>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }

    // --- RENDER DESKTOP VIEW (>= 650px) ---
    return (
        <>
            <motion.nav
                layout
                initial={false}
                animate={{ width: open ? 240 : 80 }}
                transition={{ duration: 0.3 }}
                className={cn(
                    'sticky top-0 h-full font-figtree rounded-l-[18px] shrink-0 border-r border-gray-100 bg-white z-40 dashboard-sm:flex flex-col justify-between shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] hidden',
                )}
            >
                <div className='flex flex-col h-full'>
                    <motion.div
                        className='flex h-24 items-center justify-start border-b border-gray-50/50 scale-95'
                        initial={{ height: 96 }}
                        animate={{ height: open ? 96 : 68 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={cn('flex items-center transition-all duration-300 justify-start', open ? 'w-full ml-2' : 'w-10 ml-4.5')}>
                            <AnimatePresence>
                                {open ? (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0, transition: { duration: 0.25, delay: 0.15 } }}
                                        exit={{ opacity: 0, x: 10, transition: { duration: 0.2 } }}
                                        className='whitespace-nowrap'
                                    >
                                        <Image key='maneaccount-sidebar-logo' src='/maneaccount-logo.png' alt='Logo' className='w-full h-14' width={200} height={50} />
                                    </motion.span>
                                ) : (
                                    <Image key='m-image' src='/maneaccount-new-M.png' alt='M' className='w-10 h-7 relative left-0.5' width={50} height={50} />
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    <div className='w-[90%] mx-auto h-px -mt-2 bg-primary' />

                    <div className='flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 custom-scrollbar'>
                        {filteredPages.map((page, index) => (
                            <SidebarItem
                                key={page.title + index}
                                icon={page.icon}
                                title={page.title}
                                onClick={() => handlePageChange(page.title)}
                                selected={selectedPage === page.title}
                                open={open}
                                notifs={getPageNotifs(page)}
                                stagger={index * 0.025}
                            />
                        ))}
                    </div>

                    <div className='border-t border-gray-100 p-3 space-y-1'>
                        <SidebarItem
                            icon={() => (
                                <motion.div
                                    initial='open'
                                    animate={open ? 'open' : 'closed'}
                                    variants={{
                                        open: { rotate: 0, transition: { duration: 0.3, type: 'spring', bounce: 0.5 } },
                                        closed: { rotate: 180, transition: { duration: 0.3, type: 'spring', bounce: 0.5 } },
                                    }}
                                >
                                    <ChevronsLeft />
                                </motion.div>
                            )}
                            title='Collapse'
                            onClick={handleToggle}
                            selected={false}
                            open={open}
                        />
                        <SidebarItem icon={Settings} title='Settings' onClick={() => handlePageChange('Settings')} selected={selectedPage === 'Settings'} open={open} />

                        <div className='relative'>
                            <div
                                className={cn('mt-4 flex items-center gap-2 rounded-xl bg-primary-extra-light p-2 cursor-pointer hover:brightness-[1.025] transition-all')}
                                ref={userButtonRef}
                                onClick={() => setUserDropdownOpen((prev) => !prev)}
                            >
                                {image && image.length > 0 ? (
                                    <Image className='w-9 h-9 rounded-full' src={image} alt='profile' width={50} height={50} />
                                ) : (
                                    <div className='h-9 w-9 rounded-full bg-primary/80 text-background flex items-center justify-center text-sm font-bold shrink-0'>
                                        {name ? name.charAt(0).toUpperCase() : ''}
                                    </div>
                                )}
                                <AnimatePresence>
                                    {open && (
                                        <motion.div
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: 'auto' }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className='font-figtree overflow-hidden'
                                        >
                                            <div className='flex flex-col pl-1'>
                                                <span className='text-xs font-semibold text-gray-700 whitespace-nowrap'>{name}</span>
                                                <span className='text-[11px] text-gray-400 capitalize whitespace-nowrap'>{dashboard}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <AnimatePresence>
                                {userDropdownOpen && (
                                    <motion.div
                                        className={cn('absolute bottom-[calc(100%+8px)] w-[215px] left-0 bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 z-50')}
                                        variants={dropupVariants}
                                        ref={userDropdownRef}
                                        initial='closed'
                                        animate='open'
                                        exit='closed'
                                    >
                                        <div className='p-1'>
                                            <div className='px-3 py-3 border-b border-gray-50 mb-1 font-figtree'>
                                                <p className='text-sm font-semibold text-gray-900 truncate'>{name}</p>
                                                <div className='flex items-center gap-1'>
                                                    <Mail className='w-3 h-3 text-gray-500' />
                                                    <p className='text-xs text-gray-500 truncate'>{session?.user.email}</p>
                                                </div>
                                                <div className='flex items-center gap-1 mt-0.5'>
                                                    {dashboard === 'barn' ? (
                                                        <Warehouse className='w-3 h-3 text-gray-500' />
                                                    ) : dashboard === 'subcontractor' ? (
                                                        <Users className='w-3 h-3 text-gray-500' />
                                                    ) : (
                                                        <Scissors className='w-3 h-3 text-gray-500' />
                                                    )}
                                                    <p className='text-xs text-gray-500 truncate'>{dashboard}</p>
                                                </div>
                                                {dashboard === 'braider' && (
                                                    <div className='mt-1'>
                                                        <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 border-primary/20 text-primary capitalize'>
                                                            {subscriptionTier}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className='space-y-0.5'>
                                                <MenuItem
                                                    icon={User}
                                                    onClick={() => {
                                                        setUserDropdownOpen(false);
                                                        setActiveTab('account');
                                                        handlePageChange('Settings');
                                                    }}
                                                    label='Account'
                                                />

                                                {dashboard === 'braider' && (
                                                    <MenuItem
                                                        icon={Sparkles}
                                                        onClick={() => {
                                                            setUserDropdownOpen(false);
                                                            setActiveTab('subscription');
                                                            handlePageChange('Settings');
                                                        }}
                                                        label='Subscription'
                                                    />
                                                )}
                                            </div>

                                            <div className='mt-1 border-t border-gray-50 pt-1'>
                                                <MenuItem icon={LogOut} onClick={() => signOut({ callbackUrl: '/login?mode=signin' })} label='Sign Out' isDestructive />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.nav>

            <Modal isOpen={unsavedModalOpen} setIsOpen={setUnsavedModalOpen} className='max-w-3xl p-7 rounded-[18px] relative primary-border-bold'>
                <div className='@container/unsaved-changes'>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Unsaved Changes</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>You have unsaved changes. Are you sure you want to leave?</p>
                    <div className='grid grid-cols-1 @min-[285px]/unsaved-changes:grid-cols-2 mt-6 gap-3'>
                        <button
                            onClick={() => {
                                setUnsavedModalOpen(false);
                                setPendingPage(null);
                            }}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmNavigation}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Discard & Leave
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

// --- Helper Components for Mobile ---

const MobileNavItem = ({
    icon: Icon,
    title,
    index,
    selected,
    notifs,
    onClick,
}: {
    icon: React.ElementType;
    index: number;
    title: string;
    selected: boolean;
    notifs?: number;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={cn(
            'flex-1 cursor-pointer flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-200 active:scale-95 font-figtree py-0.5 relative',
            selected ? 'text-primary bg-primary-extra-light' : 'text-gray-500 hover:bg-primary-extra-light hover:text-primary',
            index === 0 ? 'rounded-l-[18px]' : index === 3 ? 'rounded-r-[18px]' : 'rounded-none',
        )}
    >
        <div className={cn('rounded-xl transition-all w-7 h-7 @min-[330px]/nav:w-7.5 @min-[330px]/nav:h-7.5 @min-[450px]/nav:w-6 @min-[450px]/nav:h-6 grid place-items-center')}>
            <Icon className='w-full h-full' strokeWidth={selected ? 2.5 : 2} />
        </div>
        <span className='text-[13px] font-bold tracking-wide hidden @min-[450px]/nav:block'>{title}</span>
        {notifs && notifs > 0 ? (
            <div
                className={cn(
                    'absolute top-2 left-[50%] ml-3 transform-[translateX(-50%)] text-[9.9px] min-w-5 h-5 @min-[450px]/nav:m-0 @min-[450px]/nav:left-auto @min-[450px]/nav:transform-none @min-[450px]/nav:top-0.5 @min-[450px]/nav:right-[35%] flex @min-[450px]/nav:h-4.5 @min-[450px]/nav:min-w-4.5 items-center justify-center rounded-full bg-primary px-1 @min-[450px]/nav:text-[9.5px] font-bold text-white border-2',
                    selected ? 'border-primary-extra-light' : 'border-white',
                )}
            >
                {notifs}
            </div>
        ) : (
            <></>
        )}
    </button>
);

const MobileDrawerItem = ({ icon: Icon, title, selected, notifs, onClick }: { icon: React.ElementType; title: string; selected?: boolean; notifs?: number; onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            'w-full flex items-center justify-between cursor-pointer gap-4 px-4 py-3 rounded-xl transition-all duration-200',
            selected ? 'text-primary bg-primary-extra-light font-semibold' : 'text-gray-500 hover:bg-primary-extra-light hover:text-primary',
        )}
    >
        <div className='flex items-center gap-4'>
            <Icon strokeWidth={2} className='w-5 h-5' />
            <span className='font-figtree'>{title}</span>
        </div>
        {notifs && notifs > 0 ? <div className='flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white'>{notifs}</div> : <></>}
    </button>
);

const MenuItem = ({ icon: Icon, label, onClick, isDestructive = false }: { icon: React.ElementType; label: string; onClick: () => void; isDestructive?: boolean }) => (
    <button
        className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer',
            isDestructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-500 hover:bg-primary-extra-light hover:text-primary',
        )}
        onClick={onClick}
    >
        <Icon strokeWidth={2} className={cn('w-4 h-4', isDestructive && 'text-red-500')} />
        <span className='font-figtree font-medium'>{label}</span>
    </button>
);

const SidebarItem = ({
    icon: Icon,
    title,
    selected,
    onClick,
    open,
    notifs,
    stagger,
}: {
    icon: React.ElementType;
    title: string;
    onClick: () => void;
    selected: boolean;
    open: boolean;
    notifs?: number;
    stagger?: number;
}) => {
    return (
        <motion.button
            layout
            onClick={onClick}
            className={cn(
                'relative flex h-11 items-center justify-between rounded-xl transition-all duration-200 group cursor-pointer',
                selected ? 'bg-primary-extra-light text-primary' : 'text-gray-500 hover:bg-primary-extra-light hover:text-primary',
                open ? 'w-full' : 'ml-[5px] w-11',
            )}
        >
            <div className='flex items-center'>
                <motion.div layout className='flex items-center justify-center min-w-11 h-11'>
                    <Icon />
                </motion.div>

                {open && (
                    <motion.span
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + (stagger ? stagger : 0) }}
                        className='font-figtree whitespace-nowrap text-nowrap text-sm font-medium'
                    >
                        {title}
                    </motion.span>
                )}
            </div>

            {notifs && notifs > 0 && open ? (
                <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='flex h-5 min-w-5 mr-2 items-center font-figtree justify-center rounded-full bg-primary p-1.5 text-[10px] font-bold text-white'
                >
                    {notifs}
                </motion.span>
            ) : (
                <></>
            )}
        </motion.button>
    );
};

const dropupVariants: Variants = {
    closed: {
        opacity: 0,
        y: 0,
        transition: { duration: 0.3, ease: 'easeInOut' },
    },
    open: {
        opacity: 1,
        y: -10,
        transition: { duration: 0.3, ease: 'easeInOut' },
    },
};

export default DashboardSidebar;
