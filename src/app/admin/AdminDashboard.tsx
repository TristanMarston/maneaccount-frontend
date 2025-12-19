'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Shield, Users, Scissors, Calendar, Mail, RefreshCcw, LogOut, Trash2, Briefcase } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Logo from '@/app/_components/_navbar/Logo';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import { dropdownVariants } from '../_components/_navbar/Navbar';
import Modal from '../dashboard/Modal';
import { deleteAccountByID } from '../actions/settings';
import { failToast, successToast } from '../context';

type User = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'braider' | 'subcontractor' | 'client';
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
        { label: 'Clients', value: users.filter((u) => u.role === 'client').length, icon: Briefcase },
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
                                            className='relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm 3xl:shadow-none 3xl:border-0 3xl:border-b 3xl:rounded-none 3xl:p-0 3xl:grid 3xl:grid-cols-[2fr_1.25fr_1fr_1fr] 7xl:grid-cols-4 hover:bg-gray-50/80 transition-all group'
                                        >
                                            <div className='px-0 3xl:px-6 py-2 3xl:py-4 gap-3 flex flex-col min-[450px]:flex-row items-left min-[450px]:items-center justify-between 3xl:justify-start'>
                                                <div className='flex items-center gap-3'>
                                                    <div className='w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0'>
                                                        {user.name?.substring(0, 1).toUpperCase() || 'U'}
                                                    </div>
                                                    <div className='min-w-0'>
                                                        <p className='font-semibold text-gray-800 font-figtree truncate'>{user.name || 'Unknown'}</p>
                                                        <div className='flex items-center gap-1 text-gray-400 text-xs truncate'>
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

const RoleBadge = ({ role }: { role: string }) => {
    const styles = {
        admin: 'bg-red-50 text-red-700 border-red-100',
        braider: 'bg-primary/10 text-primary border-primary/20',
        subcontractor: 'bg-purple-50 text-purple-700 border-purple-100',
        client: 'bg-orange-50 text-orange-700 border-orange-100',
    };

    const icons = {
        admin: Shield,
        braider: Scissors,
        subcontractor: Users,
        client: Briefcase,
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
