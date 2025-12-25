'use client';

import { Calendar, DollarSign, TrendingUp, Users, ArrowRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '../Dashboard';

interface DashboardHomeProps {
    role: UserRole;
    name: string;
}

const DashboardHome = ({ role, name }: DashboardHomeProps) => {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

    const normalizedRole = (role || 'braider').toLowerCase();

    return (
        <div className='w-full px-8 min-[450px]:px-12 pt-8 pb-28 dashboard-sm:py-8 space-y-4 @container/home'>
            {/* Header Section */}
            <header className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>
                        {greeting}, {name.split(' ')[0]}.
                    </h1>
                    <p className='text-gray-500 font-figtree mt-1'>Here's what's happening in your stable today.</p>
                </div>

                {/* <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className='bg-primary text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 flex items-center gap-2 self-start md:self-auto'
                >
                    {normalizedRole === 'braider' ? 'New Invoice' : normalizedRole === 'client' ? 'Request Braiding' : 'Update Availability'}
                    <ArrowRight size={18} />
                </motion.button> */}
            </header>

            {/* Stats Grid */}
            {/* <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                <StatCard title={normalizedRole === 'client' ? 'Active Requests' : 'Upcoming Jobs'} value='12' icon={Calendar} delay={0.2} trend='+2 this week' />
                <StatCard title={normalizedRole === 'client' ? 'Total Horses' : 'Active Clients'} value={normalizedRole === 'client' ? '8' : '24'} icon={Users} delay={0.3} />
                <StatCard title={normalizedRole === 'client' ? 'Pending Invoices' : 'Pending Payment'} value='$850' icon={DollarSign} delay={0.4} alert />
                <StatCard
                    title={normalizedRole === 'client' ? 'Next Show' : 'Monthly Income'}
                    value={normalizedRole === 'client' ? 'WEF 3' : '$4,200'}
                    icon={TrendingUp}
                    delay={0.5}
                    trend={normalizedRole !== 'client' ? '+12% vs last mo' : undefined}
                />
            </div> */}

            {/* Main Content Area */}
            {/* <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className='lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'
                >
                    <div className='p-6 border-b border-gray-100 flex justify-between items-center'>
                        <h3 className='font-lusitana text-xl font-bold text-gray-800'>{normalizedRole === 'braider' ? 'Upcoming Schedule' : 'Recent Activity'}</h3>
                        <button className='text-sm text-primary font-semibold hover:underline'>View All</button>
                    </div>
                    <div className='p-6'>
                        <div className='space-y-6'>
                            {[1, 2, 3].map((item, i) => (
                                <div key={i} className='flex gap-4 items-start group'>
                                    <div className='flex flex-col items-center min-w-[50px]'>
                                        <span className='text-xs font-bold text-gray-400 uppercase'>Feb</span>
                                        <span className='text-2xl font-bold text-gray-800'>{14 + i}</span>
                                    </div>
                                    <div className='flex-1 bg-gray-50 rounded-xl p-4 transition-colors group-hover:bg-primary/5'>
                                        <div className='flex justify-between items-start mb-1'>
                                            <h4 className='font-semibold text-gray-800'>Wellington International</h4>
                                            <span className='text-xs font-medium bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-600'>08:00 AM</span>
                                        </div>
                                        <p className='text-sm text-gray-500 mb-2'>Barn A, Aisle 3 • 4 Horses</p>
                                        <div className='flex items-center gap-2'>
                                            <div className='flex -space-x-2'>
                                                <div className='w-6 h-6 rounded-full bg-blue-100 border-2 border-white'></div>
                                                <div className='w-6 h-6 rounded-full bg-purple-100 border-2 border-white'></div>
                                            </div>
                                            <span className='text-xs text-gray-400'>+2 Braiders</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className='space-y-6'>
                    <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden'>
                        <div className='relative z-10'>
                            <h3 className='font-lusitana text-xl font-bold mb-2'>Premium Features</h3>
                            <p className='text-gray-300 text-sm mb-4'>Upgrade to unlock automated invoicing and SMS notifications.</p>
                            <button className='bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold'>Upgrade to Pro</button>
                        </div>
                        <div className='absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl'></div>
                    </div>

                    <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-6'>
                        <h3 className='font-lusitana text-lg font-bold text-gray-800 mb-4'>To Do List</h3>
                        <div className='space-y-3'>
                            <TaskItem label='Send invoice to Sarah' urgent />
                            <TaskItem label='Confirm schedule for WEF 4' />
                            <TaskItem label='Update banking info' />
                        </div>
                    </div>
                </motion.div>
            </div> */}
        </div>
    );
};

// Helper Components
// const StatCard = ({ title, value, icon: Icon, delay, trend, alert }: any) => (
//     <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ delay }}
//         className='bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden'
//     >
//         <div className='flex justify-between items-start mb-4'>
//             <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', alert ? 'bg-red-50 text-red-500' : 'bg-primary/5 text-primary')}>
//                 <Icon size={20} />
//             </div>
//             {alert && <span className='w-2 h-2 rounded-full bg-red-500 animate-pulse'></span>}
//         </div>
//         <div>
//             <p className='text-sm font-medium text-gray-500 font-figtree'>{title}</p>
//             <h3 className='text-2xl font-bold text-gray-800 mt-1'>{value}</h3>
//             {trend && (
//                 <p className='text-xs text-green-600 font-medium mt-1 flex items-center gap-1'>
//                     <TrendingUp size={10} /> {trend}
//                 </p>
//             )}
//         </div>
//     </motion.div>
// );

// const TaskItem = ({ label, urgent }: { label: string; urgent?: boolean }) => (
//     <div className='flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group'>
//         <div
//             className={cn(
//                 'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
//                 urgent ? 'border-red-200 group-hover:border-red-500' : 'border-gray-200 group-hover:border-primary'
//             )}
//         >
//             {urgent && <div className='w-2.5 h-2.5 rounded-full bg-red-500'></div>}
//         </div>
//         <span className={cn('text-sm font-medium', urgent ? 'text-gray-800' : 'text-gray-600')}>{label}</span>
//     </div>
// );

export default DashboardHome;
