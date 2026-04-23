'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
    Search,
    Shield,
    Users,
    Scissors,
    Calendar,
    Mail,
    RefreshCcw,
    LogOut,
    Trash2,
    Briefcase,
    Warehouse,
    PlusCircle,
    CalendarIcon,
    Hash,
    CircleQuestionMark,
    X,
    Pencil,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Logo from '@/app/_components/_navbar/Logo';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import { dropdownVariants } from '../_components/_navbar/Navbar';
import Modal from '../dashboard/Modal';
import { deleteAccountByID } from '../actions/settings';
import { failToast, loadingToast, successToast } from '../context';
import { addCoupon, deleteCoupon, editCoupon, getCoupons } from '../actions/billing';
import { differenceInDays, format, formatDistanceStrict, formatDistanceToNowStrict, isBefore } from 'date-fns';
import { DropdownPortal } from '../dashboard/_components/_calendar/AddShowForm';
import DatePicker from '../dashboard/_components/DatePicker';

type User = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'braider' | 'subcontractor' | 'barn';
    createdAt: string;
};

const AdminDashboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true,
    });
    const [name, setName] = useState('');
    const [checkDeleteModal, setCheckDeleteModal] = useState({ name: '', id: '', open: false });
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const userButtonRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(userDropdownRef, [userButtonRef], () => setUserDropdownOpen(false));

    const [refreshLoading, setRefreshLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated' && session) {
            if (session.user.role === 'admin' && session.user.name) setName(session.user.name);
        }
    }, [session, status]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Unauthorized');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            router.push('/login?mode=signin');
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        setRefreshLoading(true);

        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('Unauthorized');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            router.push('/login?mode=signin');
        } finally {
            setRefreshLoading(false);
        }
    };

    const filteredUsers = users.filter((user) => user.name?.toLowerCase().includes(filter.toLowerCase()) || user.email?.toLowerCase().includes(filter.toLowerCase()));

    const stats = [
        { label: 'Total Users', value: users.length, icon: Users },
        { label: 'Braiders', value: users.filter((u) => u.role === 'braider').length, icon: Scissors },
        { label: 'Subcontractors', value: users.filter((u) => u.role === 'subcontractor').length, icon: Users },
        { label: 'Barns', value: users.filter((u) => u.role === 'barn').length, icon: Briefcase },
    ];

    return (
        <>
            <div className='min-h-screen bg-white w-full flex flex-col items-center'>
                <Toaster />

                <section className='w-screen fixed top-0 backdrop-blur-sm px-5 z-30 flex justify-center max-w-max-width'>
                    <div className='flex items-center justify-between h-16 4xl:h-18 mt-5 rounded-[18px] primary-border pl-4 pr-2 min-[450px]:px-4.5 navbar-desktop:px-6 w-full max-w-max-width bg-background'>
                        <div className='flex items-center h-full gap-4'>
                            <Logo position='navbar' />
                            <div className='w-px hidden min-[575px]:block rounded-full h-[60%] bg-primary-dark' />
                            <span className='font-lusitana hidden min-[575px]:block text-primary-dark text-lg pt-2'>Admin Dashboard</span>
                        </div>
                        <div className='relative'>
                            <div
                                className='flex items-center gap-4 rounded-full min-[750px]:rounded-xl hover:bg-gray-100 transition-colors p-2 min-[750px]:py-2 min-[750px]:px-3 cursor-pointer'
                                onClick={() => setUserDropdownOpen((prev) => !prev)}
                                ref={userButtonRef}
                            >
                                <div className='text-right font-figtree hidden min-[750px]:block'>
                                    <p className='text-sm font-bold text-gray-800'>{name}</p>
                                    <p className='text-xs text-gray-500'>Admin</p>
                                </div>
                                <div className='w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center uppercase font-bold'>{name.substring(0, 1)}</div>
                            </div>
                            <AnimatePresence>
                                {userDropdownOpen && (
                                    <motion.div
                                        className={cn('absolute top-20 right-0 w-[300px] bg-white rounded-2xl primary-border overflow-hidden z-50 origin-top-right')}
                                        variants={dropdownVariants(0.3, 0.3)}
                                        initial='closed'
                                        animate={userDropdownOpen ? 'open' : 'closed'}
                                        exit='closed'
                                        ref={userDropdownRef}
                                    >
                                        <div className='flex flex-col gap-2 w-full h-full p-2'>
                                            <div
                                                onClick={refresh}
                                                className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors group cursor-pointer'
                                            >
                                                <div className='p-2 bg-primary-light primary-border rounded-lg group-hover:brightness-105 group-hover:text-primary transition-all'>
                                                    <RefreshCcw className={cn('text-background w-5 h-5', refreshLoading ? 'animate-spin' : 'animate-none')} />
                                                </div>
                                                <div>
                                                    <p className='font-figtree font-bold text-lg text-gray-800'>Refresh</p>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => signOut({ callbackUrl: '/login?mode=signin' })}
                                                className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors group cursor-pointer'
                                            >
                                                <div className='p-2 bg-primary-light primary-border rounded-lg group-hover:brightness-105 group-hover:text-primary transition-all'>
                                                    <LogOut className='text-background w-5 h-5' />
                                                </div>
                                                <div>
                                                    <p className='font-figtree font-bold text-lg text-gray-800'>Sign Out</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </section>

                <section className='w-full max-w-max-width px-8 py-10 mt-20 min-[575px]:mt-24'>
                    <h4 className='font-lusitana text-primary block min-[575px]:hidden text-3xl mb-4'>Admin Dashboard</h4>
                    <div className='grid grid-cols-1 lg:grid-cols-2 5xl:grid-cols-4 gap-6 mb-10'>
                        {stats.map((stat, idx) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className='bg-white p-4 lg:p-6 rounded-[18px] primary-border flex items-center gap-4 hover:shadow-md transition-shadow'
                            >
                                <div className='rounded-[14px] bg-primary-light primary-border p-2 w-12 xl:w-14 h-12 xl:h-14 aspect-square grid place-items-center'>
                                    <stat.icon className='w-6 h-6 xl:w-7 xl:h-7 text-background' />
                                </div>
                                <div>
                                    <p className='text-sm text-gray-500 font-figtree'>{stat.label}</p>
                                    <h3 className='text-3xl font-bold font-lusitana text-gray-800'>{loading ? '-' : stat.value}</h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className='rounded-3xl primary-border overflow-hidden mb-10'>
                        <CouponManagement />
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className='rounded-3xl primary-border overflow-hidden'>
                        <div className='p-6 border-b border-gray-100 flex flex-col min-[650px]:flex-row justify-between items-start min-[650px]:items-center gap-4 bg-gray-50/50'>
                            <h2 className='text-2xl font-lusitana text-gray-800'>User Management</h2>

                            <div className='relative w-full sm:w-72'>
                                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
                                <input
                                    type='text'
                                    placeholder='Search users...'
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className='w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-figtree text-sm bg-white'
                                />
                            </div>
                        </div>

                        <div className='w-full'>
                            <nav className='hidden 3xl:grid bg-gray-50 border-b border-gray-100 col-span-4 grid-cols-[2fr_1.25fr_1fr_1fr] 7xl:grid-cols-4'>
                                <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>User</span>
                                <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Role</span>
                                <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Joined</span>
                                <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Delete</span>
                            </nav>

                            <section className={cn('flex flex-col gap-4 3xl:gap-0', filteredUsers.length > 0 ? 'p-4 3xl:p-0' : 'py-6')}>
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <div key={i} className='grid grid-cols-[2fr_1.25fr_1fr_1fr] 7xl:grid-cols-4 animate-pulse'>
                                            <span className='px-6 py-4'>
                                                <div className='h-4 bg-gray-200 rounded-md w-32'></div>
                                            </span>
                                            <span className='px-6 py-4'>
                                                <div className='h-4 bg-gray-200 rounded-md w-20'></div>
                                            </span>
                                            <span className='px-6 py-4'>
                                                <div className='h-4 bg-gray-200 rounded-md w-24'></div>
                                            </span>
                                            <span className='px-6 py-4'>
                                                <div className='h-4 bg-gray-200 rounded-md w-16'></div>
                                            </span>
                                        </div>
                                    ))
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className='relative font-figtree bg-white p-5 rounded-2xl border border-gray-100 shadow-sm 3xl:shadow-none 3xl:border-0 3xl:border-b 3xl:rounded-none 3xl:p-0 3xl:grid 3xl:grid-cols-[2fr_1.25fr_1fr_1fr] 7xl:grid-cols-4 hover:bg-gray-50/80 transition-all group'
                                        >
                                            <div className='px-0 3xl:px-6 py-2 3xl:py-4 gap-3 flex flex-col min-[450px]:flex-row items-left min-[450px]:items-center justify-between 3xl:justify-start'>
                                                <div className='flex items-center gap-3 min-w-0'>
                                                    <div className='w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0'>
                                                        {user.name?.substring(0, 1).toUpperCase() || 'U'}
                                                    </div>
                                                    <div className='min-w-0'>
                                                        <p className='font-semibold text-gray-800 font-figtree truncate'>{user.name || 'Unknown'}</p>
                                                        <div className='flex items-center gap-1 text-gray-400 text-xs truncate min-w-0' title={user.email}>
                                                            <Mail className='w-3 h-3 shrink-0' />
                                                            <span className='truncate'>{user.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='block 3xl:hidden'>
                                                    <span
                                                        onClick={() => setCheckDeleteModal({ name: user.name, id: user.id, open: true })}
                                                        className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 transition-colors cursor-pointer'
                                                    >
                                                        <Trash2 className='w-3 h-3 text-red-700' />
                                                        Delete
                                                    </span>
                                                </div>
                                            </div>

                                            <div className='block 3xl:hidden h-px bg-gray-100 my-2'></div>

                                            <div className='grid grid-cols-1 cm:grid-cols-2 cm:gap-4 3xl:contents'>
                                                <div className='px-0 3xl:px-6 py-2 3xl:py-4 flex flex-col 3xl:flex justify-center'>
                                                    <span className='text-[10px] uppercase text-gray-400 font-bold mb-1 block 3xl:hidden'>Role</span>
                                                    <div className='flex'>
                                                        <RoleBadge role={user.role} />
                                                    </div>
                                                </div>

                                                <div className='px-0 3xl:px-6 py-2 3xl:py-4 flex flex-col 3xl:flex justify-center'>
                                                    <span className='text-[10px] uppercase text-gray-400 font-bold mb-1 block 3xl:hidden'>Joined</span>
                                                    <div className='flex items-center gap-2 text-gray-500 text-sm font-figtree'>
                                                        <Calendar className='w-4 h-4 text-gray-300' />
                                                        {new Date(user.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>

                                                <div className='hidden 3xl:flex px-6 py-4 items-center'>
                                                    <span
                                                        onClick={() => setCheckDeleteModal({ name: user.name, id: user.id, open: true })}
                                                        className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 transition-colors cursor-pointer'
                                                    >
                                                        <Trash2 className='w-3 h-3 text-red-700' />
                                                        Delete
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <span className='p-6 text-left text-gray-400 font-figtree'>No users found matching "{filter}"</span>
                                )}
                            </section>
                        </div>
                    </motion.div>
                </section>
            </div>
            <Modal
                isOpen={checkDeleteModal.open}
                setIsOpen={(open: boolean) =>
                    setCheckDeleteModal((prev) => {
                        return { ...prev, open };
                    })
                }
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                        This will delete <span className='font-bold'>{checkDeleteModal.name}</span> and their user data forever.
                    </p>
                    <div className='grid grid-cols-2 gap-4'>
                        <button
                            onClick={() => setCheckDeleteModal({ open: false, id: '', name: '' })}
                            className='font-figtree mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                const result = await deleteAccountByID(checkDeleteModal.id);
                                if (result.success) {
                                    successToast('Account deleted');
                                    setUsers((prev) => prev.filter((user) => user.id !== checkDeleteModal.id));
                                } else failToast('Failed to delete');

                                setCheckDeleteModal((prev) => {
                                    return {
                                        ...prev,
                                        open: false,
                                    };
                                });
                            }}
                            className='font-figtree mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Delete User
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

type Coupon = {
    id: string;
    code: string;
    startDate: Date;
    endDate: Date;
    days?: number | null;
};

type CouponAdd = {
    code: string;
    startDate: Date | null;
    endDate: Date | null;
    days: number;
};

const getNumDays = (endDate: Date, startDate?: Date) => {
    if (!startDate) startDate = new Date();
    return differenceInDays(endDate, startDate);
};

const CouponManagement = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(false);
    const [addCouponOpen, setAddCouponOpen] = useState(false);

    const prevEditingCoupon = useRef<Coupon | null>(null);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const [couponData, setCouponData] = useState<CouponAdd>({ code: '', startDate: null, endDate: null, days: 0 });

    const startDateDropdownRef = useRef<HTMLDivElement>(null);
    const [startDateSelectorOpen, setStartDateSelectorOpen] = useState(false);

    const endDateDropdownRef = useRef<HTMLDivElement>(null);
    const [endDateSelectorOpen, setEndDateSelectorOpen] = useState(false);

    const [optionalDaysExplanation, setOptionalDaysExplanation] = useState(false);

    const [checkDeleteCouponModal, setCheckDeleteCouponModal] = useState({ code: '', id: '', open: false });

    const fetchCoupons = async () => {
        const res = await getCoupons();
        if (res && res.length > 0) setCoupons(res);
        setLoading(false);
    };

    useEffect(() => {
        setLoading(true);
        fetchCoupons();
    }, []);

    const addNewCoupon = async () => {
        const toastID = loadingToast('Adding new coupon...');

        const res = await addCoupon(couponData);
        if (res.success) {
            successToast('Successfully added new coupon', toastID);
            setCoupons((prev) => [
                ...prev,
                { id: couponData.code, code: couponData.code, startDate: couponData.startDate || new Date(), endDate: couponData.endDate || new Date(), days: couponData.days },
            ]);
            setCouponData({ code: '', startDate: null, endDate: null, days: 0 });
            await fetchCoupons();
        } else failToast('Unable to add new coupon.', toastID);
    };

    const couponDifferent = ({ old, current }: { old: Coupon | null; current: Coupon | null }) => {
        if (!old && !current) return false;

        if (!old || !current) return true;
        if (old.id !== current.id) return true;
        if (old.code !== current.code) return true;
        if (old.startDate.getTime() !== current.startDate.getTime()) return true;
        if (old.endDate.getTime() !== current.endDate.getTime()) return true;
        if (old.days !== current.days) return true;

        return false;
    };

    return (
        <>
            <div className='p-6 flex justify-between items-center flex-wrap gap-4 bg-gray-50/50'>
                <h2 className='text-2xl font-lusitana text-gray-800 whitespace-nowrap'>One-Time Coupons</h2>

                <div
                    onClick={() => setAddCouponOpen((prev) => !prev)}
                    className='bg-primary text-white font-bold text-sm flex justify-center items-center gap-2 px-4 py-2 rounded-[12px] font-figtree shadow-sm cursor-pointer hover:brightness-110 transition-all'
                >
                    <PlusCircle className='w-4 h-4' />
                    <span>Add New</span>
                </div>
            </div>

            <div className={cn('border-b border-gray-100 bg-gray-50/50 font-figtree @container/add-coupon', addCouponOpen && 'px-6 py-2')}>
                {addCouponOpen && (
                    <div className='bg-white shadow-sm border border-gray-200 mb-4 p-4 pt-5 rounded-[14px] space-y-3 @min-[590px]/add-coupon:grid grid-cols-2 @min-[590px]/add-coupon:gap-x-3 gap-y-3 relative'>
                        <div className='flex flex-col gap-2 w-full'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Code*</label>
                            <input
                                className='w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='code'
                                value={couponData.code}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setCouponData((prev) => ({ ...prev, code: e.target.value }));
                                }}
                                placeholder='CODE123'
                                required
                            />
                        </div>
                        <div className='flex flex-col gap-2 w-full'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Start Date*</label>
                            <motion.div ref={startDateDropdownRef} animate={startDateSelectorOpen ? 'open' : 'closed'} className='relative w-full'>
                                <button
                                    onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                    className={`${
                                        couponData.startDate ? 'text-black' : 'text-gray-400'
                                    } w-full hidden @min-[225px]/pick-start-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                >
                                    <CalendarIcon className='w-4 h-4 mb-0.5' />
                                    <span className='truncate min-w-0'>{couponData.startDate === null ? 'Start Date' : format(couponData.startDate, 'PPP')}</span>
                                </button>
                                <button
                                    onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                    className={`${
                                        couponData.startDate ? 'text-black' : 'text-gray-400'
                                    } w-full flex @min-[225px]/pick-start-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                >
                                    <CalendarIcon className='w-4 h-4 mb-0.5' />
                                    <span className='truncate min-w-0'>{couponData.startDate === null ? 'Start Date' : format(couponData.startDate, 'PP')}</span>
                                </button>
                                <DropdownPortal
                                    isOpen={startDateSelectorOpen}
                                    onClose={() => setStartDateSelectorOpen(false)}
                                    triggerRef={startDateDropdownRef}
                                    className='w-64 max-h-[300px] overflow-auto hide-scrollbar rounded-xl'
                                >
                                    <DatePicker
                                        onDateSelect={(selectedDate: Date) => setCouponData((prev) => ({ ...prev, startDate: selectedDate }))}
                                        selectedDate={couponData.startDate}
                                        noDateBefore={new Date(new Date().setHours(0, 0, 0, 0))}
                                        noDateAfter={couponData.endDate}
                                        today={couponData.startDate ? couponData.startDate : new Date(new Date().setHours(0, 0, 0, 0))}
                                        startDateEffect={false}
                                    />
                                </DropdownPortal>
                            </motion.div>
                        </div>
                        <div className='flex flex-col gap-2 w-full'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>End Date*</label>
                            <motion.div ref={endDateDropdownRef} animate={endDateSelectorOpen ? 'open' : 'closed'} className='relative w-full'>
                                <button
                                    onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                    className={`${
                                        couponData.endDate ? 'text-black' : 'text-gray-400'
                                    } w-full hidden @min-[225px]/pick-end-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                >
                                    <CalendarIcon className='w-4 h-4 mb-0.5' />
                                    <span className='truncate min-w-0'>{couponData.endDate === null ? 'End Date' : format(couponData.endDate, 'PPP')}</span>
                                </button>
                                <button
                                    onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                    className={`${
                                        couponData.endDate ? 'text-black' : 'text-gray-400'
                                    } w-full flex @min-[225px]/pick-end-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                >
                                    <CalendarIcon className='w-4 h-4 mb-0.5' />
                                    <span className='truncate min-w-0'>{couponData.endDate === null ? 'End Date' : format(couponData.endDate, 'PP')}</span>
                                </button>
                                <DropdownPortal
                                    isOpen={endDateSelectorOpen}
                                    onClose={() => setEndDateSelectorOpen(false)}
                                    triggerRef={endDateDropdownRef}
                                    className='w-64 max-h-[300px] overflow-auto hide-scrollbar rounded-xl'
                                >
                                    <DatePicker
                                        onDateSelect={(selectedDate: Date) => setCouponData((prev) => ({ ...prev, endDate: selectedDate }))}
                                        selectedDate={couponData.endDate}
                                        noDateBefore={couponData.startDate ? couponData.startDate : null}
                                        today={couponData.endDate ? couponData.endDate : couponData.startDate ? couponData.startDate : new Date(new Date().setHours(0, 0, 0, 0))}
                                        startDateEffect
                                    />
                                </DropdownPortal>
                            </motion.div>
                        </div>
                        <div className='flex flex-col gap-2 w-full'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase flex items-center gap-2'>
                                Free Days Received (OPTIONAL)
                                <CircleQuestionMark
                                    onClick={() => setOptionalDaysExplanation(true)}
                                    className='w-5 h-5 cursor-pointer hover:text-gray-400 transition-all'
                                    strokeWidth={2.25}
                                />
                            </label>
                            <input
                                className={cn(
                                    'w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors',
                                    couponData.days === 0 ? 'text-gray-500' : '',
                                )}
                                name='days'
                                inputMode='numeric'
                                value={couponData.days ? couponData.days : ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const numVal = val === '' ? 0 : parseInt(val, 10);
                                    setCouponData((prev) => {
                                        return { ...prev, days: numVal };
                                    });
                                }}
                                placeholder={
                                    couponData.days === 0
                                        ? couponData.endDate && couponData.startDate
                                            ? getNumDays(couponData.endDate, couponData.startDate).toString()
                                            : couponData.endDate
                                              ? getNumDays(couponData.endDate).toString()
                                              : '0'
                                        : '0'
                                }
                            />
                        </div>
                        <div className='text-amber-700 bg-amber-100 border border-amber-200 shadow-sm rounded-full px-3 py-0.5 font-figtree font-bold absolute uppercase text-sm -top-4 left-3'>
                            Add Coupon
                        </div>
                        <button
                            onClick={() => addNewCoupon()}
                            className='text-background bg-primary px-4 py-2 rounded-[14px] w-full flex justify-center items-center shadow-sm gap-2 font-figtree col-span-2 font-bold cursor-pointer hover:brightness-110 transition-all mt-2'
                        >
                            <PlusCircle className='w-5 h-5 text-white' />
                            Add Coupon
                        </button>
                    </div>
                )}
            </div>

            <div className='w-full'>
                <nav className='hidden 3xl:grid bg-gray-50 border-b border-gray-100 col-span-4 grid-cols-[1.5fr_1fr_1fr_1fr_1fr]'>
                    <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Code</span>
                    <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Start Date</span>
                    <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>End Date</span>
                    <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Days</span>
                    <span className='px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider font-figtree'>Actions</span>
                </nav>

                <section className={cn('flex flex-col gap-4 3xl:gap-0', coupons.length > 0 ? 'p-4 3xl:p-0' : 'py-6')}>
                    {loading
                        ? [...Array(5)].map((_, i) => (
                              <div key={i} className='grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] animate-pulse'>
                                  <span className='px-6 py-4'>
                                      <div className='h-4 bg-gray-200 rounded-md w-32'></div>
                                  </span>
                                  <span className='px-6 py-4'>
                                      <div className='h-4 bg-gray-200 rounded-md w-20'></div>
                                  </span>
                                  <span className='px-6 py-4'>
                                      <div className='h-4 bg-gray-200 rounded-md w-24'></div>
                                  </span>
                                  <span className='px-6 py-4'>
                                      <div className='h-4 bg-gray-200 rounded-md w-16'></div>
                                  </span>
                                  <span className='px-6 py-4'>
                                      <div className='h-4 bg-gray-200 rounded-md w-16'></div>
                                  </span>
                              </div>
                          ))
                        : coupons.length > 0 &&
                          coupons.map((coupon) => {
                              return (
                                  <Fragment key={coupon.id}>
                                      <div className='relative hidden bg-white p-5 rounded-2xl border border-gray-100 shadow-sm 3xl:shadow-none 3xl:border-0 3xl:border-b 3xl:rounded-none 3xl:p-0 3xl:grid 3xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] transition-all'>
                                          <div
                                              title={coupon.code}
                                              className='text-red-600 font-figtree font-bold tracking-widest uppercase px-6 py-2 flex gap-2 items-center truncate min-w-0'
                                          >
                                              <Hash className='min-w-4 max-w-4 h-4' />
                                              {coupon.code}
                                          </div>
                                          <div className='px-6 py-4 flex flex-col 3xl:flex justify-center'>
                                              <div className='flex items-center gap-2 text-gray-500 text-sm font-figtree'>
                                                  <Calendar className='w-4 h-4 text-gray-300' />
                                                  {new Date(coupon.startDate).toLocaleDateString()}
                                              </div>
                                          </div>
                                          <div className='px-6 py-4 flex flex-col 3xl:flex justify-center'>
                                              <div className='flex items-center gap-2 text-gray-500 text-sm font-figtree'>
                                                  <Calendar className='w-4 h-4 text-gray-300' />
                                                  {new Date(coupon.endDate).toLocaleDateString()}
                                              </div>
                                          </div>
                                          <div
                                              title={`${coupon.days ? coupon.days : getNumDays(coupon.endDate, coupon.startDate)} days`}
                                              className='font-figtree text-sm flex items-center px-6 py-2 min-w-0'
                                          >
                                              <span
                                                  className={cn(
                                                      'px-4 font-figtree py-0.5 text-sm border rounded-full truncate min-w-0',
                                                      isBefore(new Date(), coupon.startDate) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700',
                                                  )}
                                              >
                                                  {coupon.days ? coupon.days : getNumDays(coupon.endDate, coupon.startDate)} days
                                              </span>
                                          </div>
                                          <div className='font-figtree text-sm flex items-center gap-3 px-6 py-2'>
                                              <button
                                                  title='Edit'
                                                  onClick={() => {
                                                      prevEditingCoupon.current = coupon;
                                                      setEditingCoupon({ ...coupon });
                                                  }}
                                                  className='bg-amber-50 border border-amber-200 rounded-full text-amber-700 p-2 cursor-pointer hover:bg-amber-100 transition-all'
                                              >
                                                  <Pencil className='w-4 h-4' />
                                              </button>
                                              <button
                                                  title='Delete'
                                                  onClick={() => setCheckDeleteCouponModal({ code: coupon.code, id: coupon.id, open: true })}
                                                  className='bg-red-50 border border-red-200 rounded-full text-red-700 p-2 cursor-pointer hover:bg-red-100 transition-all'
                                              >
                                                  <Trash2 className='w-4 h-4' />
                                              </button>
                                          </div>
                                      </div>
                                      <div className='relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm 3xl:hidden transition-all'>
                                          <div className='flex justify-between gap-2 py-1 min-w-0 flex-wrap'>
                                              <div
                                                  title={coupon.code}
                                                  className='text-red-600 font-figtree font-bold tracking-widest uppercase flex gap-2 items-center truncate min-w-0'
                                              >
                                                  <Hash className='min-w-4 max-w-4 h-4' />
                                                  {coupon.code}
                                              </div>
                                              <div className='font-figtree text-sm flex items-center gap-3'>
                                                  <button
                                                      title='Edit'
                                                      onClick={() => {
                                                          prevEditingCoupon.current = coupon;
                                                          setEditingCoupon({ ...coupon });
                                                      }}
                                                      className='bg-amber-50 border border-amber-200 rounded-full text-amber-700 p-2 cursor-pointer hover:bg-amber-100 transition-all'
                                                  >
                                                      <Pencil className='w-4 h-4' />
                                                  </button>
                                                  <button
                                                      title='Delete'
                                                      onClick={() => setCheckDeleteCouponModal({ code: coupon.code, id: coupon.id, open: true })}
                                                      className='bg-red-50 border border-red-200 rounded-full text-red-700 p-2 cursor-pointer hover:bg-red-100 transition-all'
                                                  >
                                                      <Trash2 className='w-4 h-4' />
                                                  </button>
                                              </div>
                                          </div>
                                          <div className='block 3xl:hidden h-px bg-gray-100 my-2'></div>
                                          <div className='flex items-center justify-between gap-2 flex-wrap'>
                                              <div className='flex items-center flex-wrap gap-5'>
                                                  <div className='py-2 flex flex-col justify-center'>
                                                      <span className='text-[10px] uppercase text-gray-400 font-bold mb-1.5 block 3xl:hidden font-figtree'>Start Date</span>
                                                      <div className='flex items-center gap-2 text-gray-500 text-sm font-figtree'>
                                                          <Calendar className='w-4 h-4 text-gray-300' />
                                                          {new Date(coupon.startDate).toLocaleDateString()}
                                                      </div>
                                                  </div>
                                                  <div className='py-2 flex flex-col justify-center'>
                                                      <span className='text-[10px] uppercase text-gray-400 font-bold mb-1.5 block 3xl:hidden font-figtree'>End Date</span>
                                                      <div className='flex items-center gap-2 text-gray-500 text-sm font-figtree'>
                                                          <Calendar className='w-4 h-4 text-gray-300' />
                                                          {new Date(coupon.endDate).toLocaleDateString()}
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className='py-2 flex flex-col justify-center'>
                                                  <span className='text-[10px] uppercase text-gray-400 font-bold mb-1.5 block 3xl:hidden font-figtree'>Days</span>
                                                  <span
                                                      className={cn(
                                                          'px-4 font-figtree py-0.5 text-sm border rounded-full truncate min-w-0',
                                                          isBefore(new Date(), coupon.startDate)
                                                              ? 'bg-red-50 border-red-200 text-red-700'
                                                              : 'bg-green-50 border-green-200 text-green-700',
                                                      )}
                                                  >
                                                      {coupon.days ? coupon.days : getNumDays(coupon.endDate, coupon.startDate)} days
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  </Fragment>
                              );
                          })}
                </section>
            </div>
            <Modal
                isOpen={optionalDaysExplanation}
                setIsOpen={(open: boolean) => setOptionalDaysExplanation(open)}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Explanation</h1>
                    <p className='text-gray-800 text-base cm:text-[17px] font-figtree mt-2'>
                        By default, when a braider uses a coupon, they will receive the number of days remaining within the period that the coupon is available. For instance, if the
                        coupon is available from May 5th to May 25th, and the date of use is May 10th, their subscription/trial would be <b>extended by 15 days</b> (inclusive;
                        essentially 16 days).
                    </p>
                    <p className='text-gray-800 text-base cm:text-[17px] font-figtree mt-2'>
                        This field is optional because it gives you flexibility for how you want each coupon to function. Leaving it blank gives more incentive for users to act quick,
                        but providing a numerical value is clearer.
                    </p>
                    <p className='text-gray-800 text-base cm:text-[17px] font-figtree mt-2'>
                        Alternatively, if you enter a number into this field, it will give the user an extension of that number of days, <b>regardless of the date</b>. So, returning to
                        the previous example, if the number entered was 30 days, the user would receive 30 days regardless of whether it was May 6th or May 24th. The offer would still
                        conclude on the ending date of May 25th.
                    </p>
                    <button
                        onClick={() => setOptionalDaysExplanation(false)}
                        className='text-primary primary-border-hover cursor-pointer rounded-[14px] bg-background px-4 py-2 font-bold text-lg w-full mt-4'
                    >
                        Close
                    </button>
                </div>
            </Modal>
            <Modal
                isOpen={checkDeleteCouponModal.open}
                setIsOpen={(open: boolean) => setCheckDeleteCouponModal({ id: '', code: '', open })}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                        This will delete the &quot;<span className='font-bold uppercase'>{checkDeleteCouponModal.code}</span>&quot; coupon and its data forever.
                    </p>
                    <div className='grid grid-cols-2 gap-4'>
                        <button
                            onClick={() => setCheckDeleteCouponModal({ open: false, id: '', code: '' })}
                            className='font-figtree mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                const toastID = loadingToast('Deleting...');
                                const result = await deleteCoupon(checkDeleteCouponModal.id);
                                if (result.success) {
                                    successToast('Coupon deleted', toastID);
                                    setCoupons((prev) => prev.filter((coupon) => coupon.id !== checkDeleteCouponModal.id));
                                } else failToast('Failed to delete', toastID);

                                setCheckDeleteCouponModal({ id: '', code: '', open: false });
                            }}
                            className='font-figtree mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Delete Coupon
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={!!editingCoupon}
                setIsOpen={(open: boolean) => setEditingCoupon((prev) => (open ? null : prev))}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'
            >
                {editingCoupon && prevEditingCoupon.current && (
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Edit Coupon</h1>
                        <div className='bg-white shadow-sm border border-gray-200 mb-4 p-4 pt-5 mt-3 rounded-[14px] space-y-3 @min-[590px]/add-coupon:grid grid-cols-2 @min-[590px]/add-coupon:gap-x-3 gap-y-3 relative font-figtree'>
                            <div className='flex flex-col gap-2 w-full'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Code*</label>
                                <input
                                    className='w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                    name='code'
                                    value={editingCoupon.code}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        // @ts-ignore
                                        setEditingCoupon((prev) => ({ ...prev, code: e.target.value }));
                                    }}
                                    placeholder='CODE123'
                                    required
                                />
                            </div>
                            <div className='flex flex-col gap-2 w-full'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Start Date*</label>
                                <motion.div ref={startDateDropdownRef} animate={startDateSelectorOpen ? 'open' : 'closed'} className='relative w-full'>
                                    <button
                                        onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                        className={`${
                                            editingCoupon.startDate ? 'text-black' : 'text-gray-400'
                                        } w-full hidden @min-[225px]/pick-start-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                    >
                                        <CalendarIcon className='w-4 h-4 mb-0.5' />
                                        <span className='truncate min-w-0'>{editingCoupon.startDate === null ? 'Start Date' : format(editingCoupon.startDate, 'PPP')}</span>
                                    </button>
                                    <button
                                        onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                        className={`${
                                            editingCoupon.startDate ? 'text-black' : 'text-gray-400'
                                        } w-full flex @min-[225px]/pick-start-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                    >
                                        <CalendarIcon className='w-4 h-4 mb-0.5' />
                                        <span className='truncate min-w-0'>{editingCoupon.startDate === null ? 'Start Date' : format(editingCoupon.startDate, 'PP')}</span>
                                    </button>
                                    <DropdownPortal
                                        isOpen={startDateSelectorOpen}
                                        onClose={() => setStartDateSelectorOpen(false)}
                                        triggerRef={startDateDropdownRef}
                                        className='w-64 max-h-[300px] overflow-auto hide-scrollbar rounded-xl'
                                    >
                                        <DatePicker
                                            // @ts-ignore
                                            onDateSelect={(selectedDate: Date) => setEditingCoupon((prev) => ({ ...prev, startDate: selectedDate }))}
                                            selectedDate={editingCoupon.startDate}
                                            noDateBefore={new Date(new Date().setHours(0, 0, 0, 0))}
                                            noDateAfter={editingCoupon.endDate}
                                            today={editingCoupon.startDate ? editingCoupon.startDate : new Date(new Date().setHours(0, 0, 0, 0))}
                                            startDateEffect={false}
                                        />
                                    </DropdownPortal>
                                </motion.div>
                            </div>
                            <div className='flex flex-col gap-2 w-full'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>End Date*</label>
                                <motion.div ref={endDateDropdownRef} animate={endDateSelectorOpen ? 'open' : 'closed'} className='relative w-full'>
                                    <button
                                        onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                        className={`${
                                            editingCoupon.endDate ? 'text-black' : 'text-gray-400'
                                        } w-full hidden @min-[225px]/pick-end-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                    >
                                        <CalendarIcon className='w-4 h-4 mb-0.5' />
                                        <span className='truncate min-w-0'>{editingCoupon.endDate === null ? 'End Date' : format(editingCoupon.endDate, 'PPP')}</span>
                                    </button>
                                    <button
                                        onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                        className={`${
                                            editingCoupon.endDate ? 'text-black' : 'text-gray-400'
                                        } w-full flex @min-[225px]/pick-end-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                    >
                                        <CalendarIcon className='w-4 h-4 mb-0.5' />
                                        <span className='truncate min-w-0'>{editingCoupon.endDate === null ? 'End Date' : format(editingCoupon.endDate, 'PP')}</span>
                                    </button>
                                    <DropdownPortal
                                        isOpen={endDateSelectorOpen}
                                        onClose={() => setEndDateSelectorOpen(false)}
                                        triggerRef={endDateDropdownRef}
                                        className='w-64 max-h-[300px] overflow-auto hide-scrollbar rounded-xl'
                                    >
                                        <DatePicker
                                            // @ts-ignore
                                            onDateSelect={(selectedDate: Date) => setEditingCoupon((prev) => ({ ...prev, endDate: selectedDate }))}
                                            selectedDate={editingCoupon.endDate}
                                            noDateBefore={editingCoupon.startDate ? editingCoupon.startDate : null}
                                            today={
                                                editingCoupon.endDate
                                                    ? editingCoupon.endDate
                                                    : editingCoupon.startDate
                                                      ? editingCoupon.startDate
                                                      : new Date(new Date().setHours(0, 0, 0, 0))
                                            }
                                            startDateEffect
                                        />
                                    </DropdownPortal>
                                </motion.div>
                            </div>
                            <div className='flex flex-col gap-2 w-full'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase flex items-center gap-2'>Free Days Received (OPTIONAL)</label>
                                <input
                                    className={cn(
                                        'w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors',
                                        editingCoupon.days === 0 ? 'text-gray-500' : '',
                                    )}
                                    name='days'
                                    inputMode='numeric'
                                    value={editingCoupon.days ? editingCoupon.days : ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        const numVal = val === '' ? 0 : parseInt(val, 10);
                                        // @ts-ignore
                                        setEditingCoupon((prev) => {
                                            return { ...prev, days: numVal };
                                        });
                                    }}
                                    placeholder={
                                        editingCoupon.days === 0
                                            ? editingCoupon.endDate && editingCoupon.startDate
                                                ? getNumDays(editingCoupon.endDate, editingCoupon.startDate).toString()
                                                : editingCoupon.endDate
                                                  ? getNumDays(editingCoupon.endDate).toString()
                                                  : '0'
                                            : '0'
                                    }
                                />
                            </div>
                        </div>
                        <div className='grid grid-cols-2 gap-4 mt-2'>
                            <button
                                onClick={() => setEditingCoupon(null)}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const toastID = loadingToast('Editing...');
                                    const sendData: any = {};
                                    if (editingCoupon.code !== prevEditingCoupon.current?.code) sendData.code = editingCoupon.code;
                                    if (editingCoupon.startDate.getTime() !== prevEditingCoupon.current?.startDate.getTime()) sendData.startDate = editingCoupon.startDate;
                                    if (editingCoupon.endDate.getTime() !== prevEditingCoupon.current?.endDate.getTime()) sendData.endDate = editingCoupon.endDate;
                                    if (editingCoupon.days !== prevEditingCoupon.current?.days) sendData.days = editingCoupon.days;

                                    const result = await editCoupon(sendData, editingCoupon.id);
                                    if (result.success) {
                                        successToast('Coupon successfully edited', toastID);
                                        setCoupons((prev) => prev.map((coupon) => (coupon.id === editingCoupon.id ? editingCoupon : coupon)));
                                    } else failToast('Failed to edit', toastID);

                                    setEditingCoupon(null);
                                }}
                                disabled={!couponDifferent({ old: prevEditingCoupon.current, current: editingCoupon })}
                                className='font-figtree disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

const RoleBadge = ({ role }: { role: string }) => {
    const styles = {
        admin: 'bg-red-50 text-red-700 border-red-100',
        braider: 'bg-primary/10 text-primary border-primary/20',
        subcontractor: 'bg-purple-50 text-purple-700 border-purple-100',
        barn: 'bg-orange-50 text-orange-700 border-orange-100',
    };

    const icons = {
        admin: Shield,
        braider: Scissors,
        subcontractor: Users,
        barn: Warehouse,
    };

    const Style = styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-600';
    const Icon = icons[role as keyof typeof icons] || Users;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${Style}`}>
            <Icon className='w-3 h-3' />
            {role}
        </span>
    );
};

export default AdminDashboard;
