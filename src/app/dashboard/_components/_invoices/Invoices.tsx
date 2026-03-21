'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Calendar,
    CheckCircle2,
    RefreshCcw,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    ListFilter,
    X,
    Check,
    QrCode,
    User as UserIcon,
    Share2,
    Copy,
    Smartphone,
    ExternalLink,
    CheckSquare,
    BadgeDollarSign,
    Loader2,
    CalendarCheck,
    CheckCircle,
    MinusCircle,
    Trash2,
    DollarSign,
    Loader,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { cn } from '@/lib/utils';
import { getJobs, markClientPaid, getEarningsHistory, getUserByEmail, markJobCompleted, removeCustomCharge, getJobById, addCustomCharge } from '@/app/actions/jobs';
import { useNotifications } from '@/app/NotificationContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { format } from 'date-fns-tz';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Modal from '../../Modal';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { changeThanksMessage, getUserSettings } from '@/app/actions/settings';
import { formatPhoneNumber } from '../_settings/Settings';
import { failToast, successToast } from '@/app/context';
import { Tab } from '../_braider/BraiderDashboard';
import { calendarDateToLocal } from '@/lib/date-utils';

const Invoices = ({ role, userEmail, setView, setSettingsOpen }: { role: string; userEmail: string; setView: (view: string) => void; setSettingsOpen: (page: Tab) => void }) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [pendingModalOpen, setPendingModalOpen] = useState(false);
    const [earningsModalOpen, setEarningsModalOpen] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);

    // Earnings Data
    const [earningsData, setEarningsData] = useState<any[]>([]);
    const [earningsPeriod, setEarningsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
    const [earningsLoading, setEarningsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Filter
    const [showHistory, setShowHistory] = useState(false);

    const [checkMarkedCompleted, setCheckMarkedCompleted] = useState<{ open: boolean; id: string; assignments: any[] }>({ open: false, id: '', assignments: [] });
    const [exactTime, setExactTime] = useState(new Date());

    const [chargeModalOpen, setChargeModalOpen] = useState(false);
    const [chargeName, setChargeName] = useState('');
    const [chargeAmount, setChargeAmount] = useState('');
    const [chargeLoading, setChargeLoading] = useState(false);
    const [selectedChargeAssignmentId, setSelectedChargeAssignmentId] = useState<string>('');
    const [refreshModalFunction, setRefreshModalFunction] = useState<(() => void) | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!checkMarkedCompleted.open) return;
            setExactTime(new Date());
        }, 60000);

        return () => {
            clearInterval(interval);
        };
    }, [checkMarkedCompleted]);

    useEffect(() => {
        const fetchSettings = async () => {
            if (role === 'braider') {
                const settings = await getUserSettings();
                setCurrentUser(settings);
            }
        };

        fetchSettings();
    }, [role, showQRModal]);

    const refreshJobsFn = useCallback(
        async (load: boolean) => {
            if (load) setLoading(true);
            const data = await getJobs(userEmail, role);
            setJobs(data);
            setLoading(false);
        },
        [userEmail, role],
    );

    const refreshCheckMarkedCompletedModal = async (jobId: string) => {
        const job = await getJobById(jobId);
        if (job && job.success && job.job) {
            setCheckMarkedCompleted({ ...checkMarkedCompleted, assignments: job.job.assignments });
        }
    };

    const fetchEarnings = useCallback(async () => {
        setEarningsLoading(true);
        const data = await getEarningsHistory(earningsPeriod);
        setEarningsData(data);
        setEarningsLoading(false);
    }, [earningsPeriod]);

    useAutoRefresh(() => refreshJobsFn(false));

    const handleMarkJobCompleted = async (jobID: string, thanksMessage: string) => {
        const res = await markJobCompleted(jobID, thanksMessage);
        if (res.success) {
            successToast('Invoice sent!');
            setCheckMarkedCompleted((prev) => ({ ...prev, open: false }));
            refreshJobsFn(false);
        } else {
            failToast('Failed to mark job as completed.');
        }
    };

    const handleAddCharge = async () => {
        if (!selectedChargeAssignmentId || !chargeName || !chargeAmount) return;
        setChargeLoading(true);
        const res = await addCustomCharge(selectedChargeAssignmentId, chargeName, parseFloat(chargeAmount));
        if (res.success) {
            successToast('Charge added');
            setChargeModalOpen(false);
            setChargeName('');
            setChargeAmount('');
            setChargeLoading(false);

            setSelectedChargeAssignmentId('');

            refreshCheckMarkedCompletedModal(checkMarkedCompleted.id);

            return true;
        } else {
            failToast(res.error || 'Failed to add charge');
            setChargeLoading(false);
            return false;
        }
    };

    const handleOpenAddChargeModal = (assignmentId: string) => {
        setChargeModalOpen(true);
        setChargeName('');
        setChargeAmount('');
        setSelectedChargeAssignmentId(assignmentId);
    };

    useEffect(() => {
        if (earningsModalOpen) {
            fetchEarnings();
        }
    }, [earningsModalOpen, earningsPeriod, fetchEarnings]);

    if (role !== 'braider') {
        return (
            <div className='flex flex-col items-center justify-center h-full text-gray-400'>
                <p>This page is only available for braiders.</p>
            </div>
        );
    }

    const allAssignments = jobs.filter((j) => j.invoiceSentAt).flatMap((j) => j.assignments.map((a: any) => ({ ...a, job: j })));

    const getAssignmentCost = (a: any) => {
        const servicesTotal = a.services
            .filter((s: any) => !a.canceledServiceIds.includes(s.id) && (a.status === 'completed' || a.status === 'accepted') && !a.canceledAt)
            .reduce((acc: number, s: any) => acc + s.priceUSD, 0);
        const customTotal = a.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0);
        return servicesTotal + customTotal;
    };

    const paidAssignments = allAssignments.filter((a: any) => a.paidAt);
    const unpaidAssignments = allAssignments.filter((a: any) => !a.paidAt);

    const totalEarned = paidAssignments.reduce((acc, a) => acc + getAssignmentCost(a), 0);
    const pendingAmount = unpaidAssignments.reduce((acc, a) => acc + getAssignmentCost(a), 0);

    const jobsWithPending = jobs.filter((j) => j.status === 'completed' && j.assignments.some((a: any) => !a.paidAt && !a.canceledAt));

    const jobsUnderReview = jobs.filter((j) => j.status === 'reviewing');

    const fullyPaidJobs = jobs.filter((j) => j.status === 'completed' && j.assignments.length > 0 && j.assignments.every((a: any) => a.paidAt || a.canceledAt));

    return (
        <>
            <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-8 @container/invoices'>
                <div className='flex justify-between @min-[490px]/invoices:items-center flex-col @min-[490px]/invoices:flex-row mb-6 gap-4'>
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Invoices</h1>
                        <p className='text-gray-500 font-figtree mt-1'>Track your earnings and manage payments.</p>
                    </div>
                    <div className='flex flex-col gap-3 @min-[380px]/invoices:flex-row @min-[380px]/invoices:items-center @min-[380px]/invoices:gap-4 w-auto'>
                        <button
                            onClick={() => refreshJobsFn(true)}
                            className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-primary primary-border-hover bg-background text-[17px] @min-[275px]/invoices:text-lg text-nowrap rounded-[14px] @min-[490px]/invoices:rounded-[20px] @min-[735px]/invoices:rounded-[10px] py-2 px-6 @min-[490px]/invoices:p-3 @min-[735px]/invoices:py-2 @min-[735px]/invoices:px-6'
                        >
                            <RefreshCcw className={cn('w-6 h-6', loading ? 'animate-spin' : '')} strokeWidth={2.5} />
                            <span className='block @min-[490px]/invoices:hidden @min-[735px]/invoices:block'>Refresh</span>
                        </button>
                        <button
                            onClick={() => setShowQRModal(true)}
                            className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[275px]/invoices:text-lg @min-[650px]/invoices:text-[19px] @min-[735px]/invoices:text-lg text-nowrap rounded-[14px] @min-[490px]/invoices:rounded-[20px] @min-[650px]/invoices:rounded-[14px] @min-[735px]/invoices:rounded-[10px] py-2 px-6 @min-[490px]/invoices:p-3 @min-[650px]/invoices:py-2 @min-[650px]/invoices:px-6 bg-primary-light text-background primary-border-hover'
                        >
                            <QrCode className='w-6 h-6' strokeWidth={2.5} />
                            <span className='block @min-[490px]/invoices:hidden @min-[650px]/invoices:block'>Show QR Codes</span>
                        </button>
                    </div>
                </div>

                <div className='grid grid-cols-1 @min-[490px]/invoices:grid-cols-2 gap-4 mb-8 font-figtree'>
                    <div className='bg-emerald-50 primary-border rounded-[14px] p-6 flex flex-col gap-2'>
                        <span className='text-emerald-600 font-bold uppercase text-xs tracking-wider flex items-center gap-2'>
                            Total Earnings <TrendingUp size={16} />
                        </span>
                        <span
                            className='text-4xl font-lusitana font-bold text-primary truncate'
                            title={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalEarned)}
                        >
                            {loading ? (
                                <span>
                                    $<span className='text-4xl'>--.--</span>
                                </span>
                            ) : (
                                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalEarned)
                            )}
                        </span>
                    </div>
                    <div className='bg-amber-50 amber-border p-6 rounded-[14px] flex flex-col gap-2'>
                        <span className='text-amber-600 font-bold uppercase text-xs tracking-wider flex items-center gap-2'>
                            Pending Payments <ListFilter size={16} />
                        </span>
                        <span
                            className='text-4xl font-lusitana font-bold text-amber-700 truncate'
                            title={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pendingAmount)}
                        >
                            {loading ? (
                                <span>
                                    $<span className='text-4xl'>--.--</span>
                                </span>
                            ) : (
                                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pendingAmount)
                            )}
                        </span>
                    </div>
                </div>

                <div className='space-y-8 font-figtree'>
                    <section>
                        <h2 className='text-lg font-bold font-figtree mb-4 flex items-center gap-2'>
                            Invoices to Review
                            {jobsUnderReview.length > 0 && (
                                <span className='bg-purple-600 text-white text-xs w-5.5 h-5.5 rounded-full aspect-square flex justify-center items-center text-center'>
                                    {jobsUnderReview.length}
                                </span>
                            )}
                        </h2>

                        {loading ? (
                            <div className='flex flex-col gap-3 animate-pulse'>
                                <div className='w-full h-32 bg-gray-100 rounded-2xl'></div>
                                <div className='w-full h-32 bg-gray-100 rounded-2xl'></div>
                            </div>
                        ) : jobsUnderReview.length === 0 ? (
                            <div className='flex flex-col items-center justify-center text-center py-12 bg-gray-50/50 rounded-2xl px-4 border border-dashed border-gray-200'>
                                <span className='text-gray-500 text-lg font-semibold'>No invoices to review.</span>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {jobsUnderReview
                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                    .map((job) => {
                                        const totalRevenue = job.assignments.reduce((acc: number, a: any) => {
                                            const servicesTotal = a.services
                                                .filter((s: any) => !a.canceledServiceIds.includes(s.id) && (a.status === 'completed' || a.status === 'accepted') && !a.canceledAt)
                                                .reduce((acc: number, s: any) => acc + s.priceUSD, 0);
                                            const customTotal = a.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0);
                                            return acc + servicesTotal + customTotal;
                                        }, 0);

                                        return (
                                            <div key={job.id} className={cn('bg-violet-50 rounded-[14px] border border-violet-100 shadow-sm overflow-hidden transition-all')}>
                                                <div
                                                    className='p-4 flex items-center justify-between cursor-pointer transition-all'
                                                    onClick={() => {
                                                        setCheckMarkedCompleted({
                                                            open: true,
                                                            id: job.id,
                                                            assignments: job.assignments,
                                                        });
                                                    }}
                                                >
                                                    <div className='flex items-center gap-4'>
                                                        <div className='w-24 h-12 rounded-[14px] font-bold font-figtree flex items-center justify-center shrink-0 bg-violet-200 border border-violet-200 text-violet-500'>
                                                            {new Intl.NumberFormat('en-US', {
                                                                style: 'currency',
                                                                currency: 'USD',
                                                            }).format(totalRevenue)}
                                                        </div>
                                                        <div>
                                                            <h3 className='font-bold text-gray-900'>{job.show.name}</h3>
                                                            <p className='text-xs text-gray-500'>
                                                                {format(new Date(job.invoiceSentAt), 'MMM d, yyyy')} • {job.assignments.length} Horses
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        className='px-5 cursor-pointer py-2 violet-border-hover text-[17px] bg-violet-400 text-white font-bold font-figtree rounded-[10px]'
                                                    >
                                                        Send Invoice
                                                    </button>
                                                    {/* <motion.div
                                                    className='text-gray-400 mr-2 bg-gray-100 p-1 rounded-full'
                                                    initial={{ rotate: 0 }}
                                                    animate={{ rotate: expanded ? 180 : 0 }}
                                                    transition={{ type: 'spring', stiffness: 150 }}
                                                >
                                                    <ChevronUp />
                                                </motion.div> */}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </section>
                    <section>
                        <h2 className='text-lg font-bold font-figtree mb-4 flex items-center gap-2'>
                            Pending Payment
                            {jobsWithPending.length > 0 && (
                                <span className='bg-primary text-white text-xs w-5.5 h-5.5 rounded-full aspect-square flex justify-center items-center text-center'>
                                    {jobsWithPending.length}
                                </span>
                            )}
                        </h2>

                        {loading ? (
                            <div className='flex flex-col gap-3 animate-pulse'>
                                <div className='w-full h-32 bg-gray-100 rounded-2xl'></div>
                                <div className='w-full h-32 bg-gray-100 rounded-2xl'></div>
                            </div>
                        ) : jobsWithPending.length === 0 ? (
                            <div className='flex flex-col items-center justify-center text-center py-12 bg-gray-50/50 rounded-2xl px-4 border border-dashed border-gray-200'>
                                <span className='text-gray-500 text-lg font-semibold'>No pending invoices.</span>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {jobsWithPending
                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                    .map((job) => (
                                        <InvoiceCard key={job.id} job={job} onRefresh={() => refreshJobsFn(false)} />
                                    ))}
                            </div>
                        )}
                    </section>

                    {fullyPaidJobs.length > 0 && (
                        <section>
                            <span
                                onClick={() => setShowHistory((prev) => !prev)}
                                className='text-gray-400 font-semibold cursor-pointer hover:text-gray-500 transition-all flex items-center gap-1.5 text-lg mb-2'
                            >
                                <h2 className=''>History</h2>
                                <motion.div animate={{ rotate: showHistory ? 180 : 0 }}>
                                    <ChevronDown />
                                </motion.div>
                            </span>
                            <AnimatePresence>
                                {showHistory && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className='space-y-3 overflow-hidden pb-0.5 px-0.5'
                                    >
                                        {fullyPaidJobs
                                            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                            .map((job) => (
                                                <InvoiceCard key={job.id} job={job} isHistory onRefresh={() => refreshJobsFn(false)} />
                                            ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>
                    )}
                </div>
            </div>
            <Modal isOpen={pendingModalOpen} setIsOpen={setPendingModalOpen} className='max-w-2xl w-full p-6 rounded-[18px] primary-border-bold'>
                <div className='font-figtree'>
                    <div className='flex justify-between items-center mb-6'>
                        <h2 className='text-3xl font-lusitana font-bold'>Pending Payments</h2>
                        <button onClick={() => setPendingModalOpen(false)} className='p-2 hover:bg-gray-100 rounded-full'>
                            <X className='w-6 h-6 text-gray-500' />
                        </button>
                    </div>
                    <div className='max-h-[60vh] overflow-y-auto space-y-4 pr-2'>
                        {unpaidAssignments.length === 0 && <p className='text-gray-500 text-center py-8'>No pending payments.</p>}
                        {unpaidAssignments.map((a: any) => (
                            <div key={a.id} className='bg-background border border-gray-200 p-4 rounded-xl flex justify-between items-center'>
                                <div>
                                    <div className='font-bold text-gray-900'>{a.job.show.name}</div>
                                    <div className='text-sm text-gray-500'>
                                        {a.horse.client?.name || 'Barn/No Client'} • {a.horse.showName}
                                    </div>
                                    <div className='text-xs text-gray-400 mt-1'>Invoiced: {format(new Date(a.job.createdAt), 'MMM d, yyyy')}</div>
                                </div>
                                <div className='text-right'>
                                    <div className='font-bold text-amber-600'>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(getAssignmentCost(a))}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showQRModal} setIsOpen={setShowQRModal} className='max-w-md w-full p-6 rounded-[18px] primary-border-bold overflow-hidden'>
                {currentUser && <QRCodeModal user={currentUser} onClose={() => setShowQRModal(false)} setSettingsOpen={setSettingsOpen} />}
            </Modal>

            <Modal
                isOpen={checkMarkedCompleted.open}
                setIsOpen={(open: boolean) => setCheckMarkedCompleted((prev) => ({ ...prev, open }))}
                closeOnOutsideClick={false}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative @container/check-completed'
            >
                <CheckMarkedCompletedModal
                    checkMarkedCompleted={checkMarkedCompleted}
                    setCheckMarkedCompleted={setCheckMarkedCompleted}
                    handleMarkJobCompleted={handleMarkJobCompleted}
                    handleOpenAddChargeModal={handleOpenAddChargeModal}
                    exactTime={exactTime}
                    role={role}
                    userEmail={userEmail}
                    setSettingsOpen={setSettingsOpen || ((page: Tab) => {})}
                />
            </Modal>

            <Modal isOpen={chargeModalOpen} setIsOpen={setChargeModalOpen} className='max-w-md p-6 rounded-3xl primary-border-bold bg-white'>
                <div className='space-y-1 font-figtree'>
                    <div className='flex justify-between items-center'>
                        <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Add Extra Expense</h3>
                        <button onClick={() => setChargeModalOpen(false)} className='p-2 text-gray-400 hover:text-gray-600 cursor-pointer'>
                            <X size={20} />
                        </button>
                    </div>
                    <p className='text-sm text-gray-500 mb-2'>This allows you to add charges for equipment, travel, or other extra costs.</p>
                    <div className='space-y-3'>
                        <div className='flex flex-col gap-1'>
                            <label className='text-sm font-bold text-gray-500 uppercase ml-1'>Reason / Expense Name</label>
                            <input
                                type='text'
                                value={chargeName}
                                onChange={(e) => setChargeName(e.target.value)}
                                className='w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                placeholder='e.g. Extra Equipment, Extended Prep'
                            />
                        </div>
                        <div className='flex flex-col gap-1'>
                            <label className='text-sm font-bold text-gray-500 uppercase ml-1'>Amount ($)</label>
                            <div className='relative'>
                                <DollarSign className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', chargeAmount.length > 0 ? 'text-black' : 'text-gray-400')} />
                                <input
                                    className='w-full flex items-center outline-none shadow-sm border border-gray-200 pl-8 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                    name='price'
                                    inputMode='numeric'
                                    value={chargeAmount}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        let val = e.target.value.replace(/[^0-9.]/g, '');

                                        if (val.split('.').length > 2) val = val.substring(0, val.length - 1);
                                        if (val.indexOf('.') !== -1 && val.substring(val.indexOf('.') + 1).length > 2) val = val.substring(0, val.length - 1);

                                        setChargeAmount(val);
                                    }}
                                    placeholder='00.00'
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddCharge}
                            disabled={chargeLoading || !chargeName || !chargeAmount}
                            className='w-full mt-2 py-2 bg-primary-light text-background rounded-[10px] font-bold primary-border-hover cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {chargeLoading ? <Loader className='animate-spin inline mr-2' size={18} /> : null}
                            Add to Assignment
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

const getInvoiceInfo = (assignments: any[]) => {
    const validAssignments = assignments
        .filter((a) => !a.canceledAt && (a.status === 'completed' || a.status === 'accepted') && a.services.length !== a.canceledServiceIds.length)
        .sort((a, b) => a.assignmentDate.getTime() - b.assignmentDate.getTime());

    const horseDetails: Record<string, Record<string, { days: Date[]; price: number }>> = {};
    const horseExpenses: Record<string, { name: string; id: string; amount: number }[]> = {};
    const horseIds: Record<string, string> = {};
    for (const horse of validAssignments) {
        const showName = horse.horse.showName;
        const barnName = horse.horse.barnName;
        const nameKey = `${showName}/////(${barnName})`;

        if (!horseExpenses[nameKey]) horseExpenses[nameKey] = [];
        if (horse.customCharges.length > 0) horseExpenses[nameKey].push(...horse.customCharges.map((c: any) => ({ name: c.name, amount: c.amount, id: c.id })));

        horseIds[nameKey] = horse.id;

        if (!horseDetails[nameKey]) horseDetails[nameKey] = {};

        for (const service of horse.services) {
            const serviceName = service.name;
            if (!horseDetails[nameKey][serviceName]) horseDetails[nameKey][serviceName] = { days: [], price: 0 };

            horseDetails[nameKey][serviceName].days.push(horse.assignmentDate);
            horseDetails[nameKey][serviceName].days.sort((a, b) => a.getTime() - b.getTime());
            horseDetails[nameKey][serviceName].price += service.priceUSD;
        }
    }

    return {
        earnings: assignments.reduce((acc: number, a: any) => {
            const servicesTotal = a.services.filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).reduce((sAcc: number, s: any) => sAcc + s.priceUSD, 0);
            const customTotal = a.customCharges?.reduce((cAcc: number, c: any) => cAcc + c.amount, 0) || 0;
            return a.canceledAt ? acc : acc + servicesTotal + customTotal;
        }, 0),
        horses: assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length,
        // @ts-ignore
        services: assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0),
        horseDetails,
        horseExpenses,
        horseIds,
    };
};

const CheckMarkedCompletedModal = ({
    checkMarkedCompleted,
    setCheckMarkedCompleted,
    handleMarkJobCompleted,
    handleOpenAddChargeModal,
    exactTime,
    role,
    userEmail,
    setSettingsOpen,
}: {
    checkMarkedCompleted: {
        open: boolean;
        id: string;
        assignments: any[];
    };
    setCheckMarkedCompleted: (checkMarkedCompleted: { open: boolean; id: string; assignments: any[] }) => void;
    role: string;
    handleMarkJobCompleted: (id: string, thanksMessage: string) => void;
    handleOpenAddChargeModal: (assignmentId: string, refreshFn: () => void) => void;
    exactTime: Date;
    userEmail: string;
    setSettingsOpen: (page: Tab) => void;
}) => {
    // @ts-ignore
    if (!checkMarkedCompleted.id) setCheckMarkedCompleted((prev) => ({ ...prev, open: false }));
    const [invoiceInfo, setInvoiceInfo] = useState(getInvoiceInfo(checkMarkedCompleted.assignments));
    const originalThanksMessage = useRef('');
    const [thanksMessage, setThanksMessage] = useState('');
    const [loadingThanksMessage, setLoadingThanksMessage] = useState(true);
    const [thanksMessageWords, setThanksMessageWords] = useState(0);

    useEffect(() => {
        setInvoiceInfo(getInvoiceInfo(checkMarkedCompleted.assignments));
    }, [checkMarkedCompleted.open, checkMarkedCompleted.assignments]);

    const [loadingDetails, setLoadingDetails] = useState(true);
    const [hasPayoutInfo, setHasPayoutInfo] = useState(false);

    useEffect(() => {
        const getPayoutInfo = async () => {
            setLoadingDetails(true);
            const user = await getUserByEmail(userEmail);

            if (user && ((user.venmo && user.venmoEnabled) || user.zelle !== 'disabled')) setHasPayoutInfo(true);
            setLoadingDetails(false);
        };

        const getThanksMessage = async () => {
            setLoadingThanksMessage(true);
            const user = await getUserByEmail(userEmail);
            if (user && user.thanksMessage) {
                originalThanksMessage.current = user.thanksMessage;
                setThanksMessage(user.thanksMessage);
                setThanksMessageWords(user.thanksMessage.split(' ').filter((s) => s.trim().length > 0).length);
            }
            setLoadingThanksMessage(false);
        };

        getPayoutInfo();
        getThanksMessage();
    }, [checkMarkedCompleted.id]);

    const refresh = async () => {
        const job = await getJobById(checkMarkedCompleted.id);
        if (job && job.success && job.job) {
            setCheckMarkedCompleted({ ...checkMarkedCompleted, assignments: job.job.assignments });
            setInvoiceInfo(getInvoiceInfo(job.job.assignments));
        }
    };

    const setNewThanksMessage = async () => {
        setLoadingThanksMessage(true);
        const result = await changeThanksMessage(thanksMessage);

        if (result.success) {
            setLoadingThanksMessage(false);
            successToast('Default thank-you message saved!');
            originalThanksMessage.current = result.message;
        } else {
            setLoadingThanksMessage(false);
            failToast('Failed to save thank-you message.');
        }
    };

    const handleRemoveCharge = async (id: string) => {
        const res = await removeCustomCharge(id);
        if (res.success) {
            successToast('Charge removed');
            refresh();
        } else {
            failToast(res.error || 'Failed to remove charge');
        }
    };

    return loadingDetails ? (
        <div className='w-full h-48 flex items-center justify-center'>
            <span className='loader-primary'></span>
        </div>
    ) : checkMarkedCompleted.id.length > 0 && role === 'braider' && hasPayoutInfo ? (
        <div>
            <h1 className='text-3xl @min-[300px]/check-completed:text-[33px] leading-[1.05] @min-[520px]/check-completed:text-4xl font-lusitana font-bold text-gray-900'>
                Have you completed these services?
            </h1>
            <div className='text-[15px] @min-[520px]/check-completed:text-[17px] text-gray-800 font-figtree mt-2'>
                <p className='font-semibold'>This action will send an invoice to the barn and related horse owners.</p>
                <p className='mt-2'>
                    Payments occur outside of the ManeAccount platform, but we offer the ability to track them here in the <span className='font-bold'>Invoices</span> panel. Please
                    ensure that all reported services were actually completed.
                </p>
            </div>
            <div className='flex flex-col gap-2 mt-4'>
                <p className='font-figtree text-gray-500 font-bold tracking-wide uppercase text-[15.5px]'>Preview & Adjust Invoice</p>
                <div className='w-full font-figtree border border-gray-50 p-1.5 shadow-sm rounded-[14px] text-primary font-bold'>
                    <div className='flex items-center gap-3 flex-wrap'>
                        <div className='font-lusitana text-3xl py-2 px-4 bg-primary-light/30 border border-primary shadow-sm rounded-[14px]'>
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                            }).format(invoiceInfo.earnings)}
                        </div>
                        <div className='font-figtree font-normal text-sm'>
                            <div className='flex items-center gap-2 font-semibold text-[15px]'>
                                <CalendarCheck className='w-4 h-4' strokeWidth={2.25} />
                                {format(exactTime, 'Pp')}
                            </div>
                            <span>
                                {invoiceInfo.horses} Horse{invoiceInfo.horses === 1 ? '' : 's'}
                            </span>{' '}
                            •{' '}
                            <span>
                                {invoiceInfo.services} Service{invoiceInfo.services === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>
                    <div className=''>
                        <p className='font-figtree text-purple-600 font-bold tracking-wide uppercase text-[14px] min-[280px]/check-completed:text-[15px] mt-3'>
                            Horse-By-Week Breakdown
                        </p>
                        {invoiceInfo.horseDetails && (
                            <div className='ml-5 mt-2'>
                                {Object.entries(invoiceInfo.horseDetails)
                                    .sort(([aName], [bName]) => aName.split('/////')[0].localeCompare(bName.split('/////')[0]))
                                    .map(([horseName, serviceDetails], i) => (
                                        <Fragment key={horseName + i}>
                                            <span className='font-figtree my-3 text-violet-400 font-bold text-[15px]'>
                                                {horseName.split('/////')[0]}&nbsp;{horseName.split('/////')[1]}
                                            </span>
                                            <div>
                                                <div className='ml-2'>
                                                    <ul className='mt-1'>
                                                        {Object.entries(serviceDetails).map(([service, { days, price }], j) => (
                                                            <li key={j + service + price} className='mb-0.5 font-normal text-violet-950 text-sm flex items-start gap-1.5'>
                                                                <CheckCircle className='min-w-3.5 h-3.5 w-fit flex mt-1' strokeWidth={2.25} />
                                                                <span>
                                                                    <span className='font-bold'>{service}&nbsp;-&nbsp;</span>
                                                                    {days.map((day, k) => (
                                                                        <span key={k + day.getTime()}>
                                                                            {format(calendarDateToLocal(day), 'EEEE')}
                                                                            {k === days.length - 1 ? '' : ', '}
                                                                        </span>
                                                                    ))}{' '}
                                                                    ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)})
                                                                </span>
                                                            </li>
                                                        ))}
                                                        {invoiceInfo.horseExpenses !== undefined &&
                                                            invoiceInfo.horseExpenses[horseName] !== undefined &&
                                                            invoiceInfo.horseExpenses[horseName].length > 0 &&
                                                            invoiceInfo.horseExpenses[horseName].map((expense, i) => (
                                                                <li key={i + expense.name + expense.amount} className='mb-0.5 text-amber-600 font-bold text-sm flex items-center gap-1'>
                                                                    <MinusCircle className='min-w-3.5 h-3.5 w-fit' strokeWidth={2.25} />
                                                                    <span>
                                                                        {expense.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expense.amount)}
                                                                    </span>
                                                                    <Trash2
                                                                        onClick={() => handleRemoveCharge(expense.id)}
                                                                        className='min-w-3.5 h-3.5 w-fit cursor-pointer text-red-500'
                                                                        strokeWidth={2.25}
                                                                    />
                                                                </li>
                                                            ))}
                                                        <li
                                                            onClick={() => handleOpenAddChargeModal(invoiceInfo.horseIds[horseName], refresh)}
                                                            className='text-amber-600 w-fit cursor-pointer hover:bg-amber-100 transition-all text-sm px-3 py-0.5 border border-amber-100 bg-amber-50 rounded-full mt-3'
                                                        >
                                                            Add Custom Expense
                                                        </li>
                                                    </ul>
                                                    <p className='text-sm px-3 py-0.5 bg-violet-50 w-fit rounded-full border border-violet-100 text-violet-900 mt-2 mb-2'>
                                                        Subtotal:{' '}
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                                            Object.entries(serviceDetails).reduce((acc, [service, { price }]) => acc + price, 0) +
                                                                (invoiceInfo.horseExpenses !== undefined && invoiceInfo.horseExpenses[horseName] !== undefined
                                                                    ? invoiceInfo.horseExpenses[horseName].reduce((acc, expense) => acc + expense.amount, 0)
                                                                    : 0),
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </Fragment>
                                    ))}
                            </div>
                        )}
                    </div>
                    <div className='ml-1'>
                        <p className='font-figtree text-primary font-bold tracking-wide uppercase text-sm mt-1'>Thank-you Message (optional)</p>
                        <p className='font-figtree text-primary font-semibold text-[13px] mt-0.5'>Write a custom thank-you message for your clients to see in the invoice.</p>
                        <textarea
                            value={loadingThanksMessage ? 'Loading...' : thanksMessage}
                            onChange={(e) => {
                                const value = e.target.value;
                                const words = value.split(' ').filter((s) => s.trim().length > 0).length;
                                if (words > 150) return;
                                setThanksMessage(e.target.value);
                                setThanksMessageWords(words);
                            }}
                            className='w-full mt-2 font-medium text-primary-dark bg-primary/15 focus:bg-primary/5 outline-none shadow-sm border h-[90px] max-h-[90px] min-h-[42px] overflow-y-auto border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                            placeholder={`e.g. "Thanks for doing business with me!"`}
                            autoCorrect='on'
                            autoComplete='on'
                            spellCheck={true}
                            required
                        />
                        <span className='inline-flex items-start mt-1 flex-col @min-[270px]/check-completed:flex-row @min-[270px]/check-completed:justify-between w-full'>
                            <p className={cn('text-xs ml-1 pb-2 text-primary', thanksMessageWords === 150 ? 'text-red-400' : '')}>{thanksMessageWords} / 150 words</p>
                            <AnimatePresence>
                                {originalThanksMessage.current.length > 0 && originalThanksMessage.current.trim() !== thanksMessage.trim() && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        onClick={() => setNewThanksMessage()}
                                        className='text-sm uppercase ml-1 flex items-center gap-1 bg-primary/10 py-0.5 px-2 rounded-full hover:bg-primary/5 transition-colors cursor-pointer'
                                    >
                                        {loadingThanksMessage ? <Loader2 className='animate-spin text-primary w-4 h-4' /> : <></>}
                                        {loadingThanksMessage ? 'Loading...' : 'Set as Default'}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </span>
                    </div>
                </div>
            </div>
            <div className='grid @min-[415px]/check-completed:grid-cols-2 @min-[415px]/check-completed:gap-3 gap-2 mt-4'>
                <button
                    // @ts-ignore
                    onClick={() => setCheckMarkedCompleted((prev) => ({ ...prev, open: false }))}
                    className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                >
                    Cancel
                </button>
                <button
                    onClick={() => handleMarkJobCompleted(checkMarkedCompleted.id, thanksMessage)}
                    className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                >
                    Send Invoice
                </button>
            </div>
        </div>
    ) : (
        role === 'braider' &&
        !hasPayoutInfo && (
            <div className='w-full px-5 py-24 flex flex-col items-center justify-center gap-4'>
                <div className='bg-primary-extra-light rounded-full p-3'>
                    <BadgeDollarSign className='text-primary w-14 h-14' />
                </div>
                <h4 className='text-gray-700 text-lg text-center font-figtree'>
                    You have no payout information added, so clients will have no way of paying you. Go to{' '}
                    <button
                        onClick={() => {
                            setSettingsOpen('invoicing');
                        }}
                        className='text-primary hover:text-primary-light transition-all font-semibold cursor-pointer'
                    >
                        Settings
                    </button>{' '}
                    to fix this.
                </h4>
            </div>
        )
    );
};

const QRCodeModal = ({ user, onClose, setSettingsOpen }: { user: any; onClose: () => void; setSettingsOpen: (page: Tab) => void }) => {
    const [view, setView] = useState<'venmo' | 'zelle'>(user.venmo && user.venmo.length > 0 && user.venmoEnabled ? 'venmo' : user.zelle !== 'disabled' ? 'zelle' : 'venmo');

    return (
        <div className='font-figtree flex flex-col items-center @container/payment-qr-codes'>
            <div className='flex w-full items-center justify-between mb-4 @min-[300px]/payment-qr-codes:mb-6'>
                <h2 className='text-[22px] @min-[235px]/payment-qr-codes:text-2xl @min-[265px]/payment-qr-codes:text-[27px] @min-[300px]/payment-qr-codes:text-3xl font-lusitana font-bold'>
                    Payment QR Codes
                </h2>
                <X className='text-gray-500 cursor-pointer hover:scale-105 transition-all' onClick={onClose} />
            </div>

            <div className='relative flex w-full max-w-[300px] bg-primary-extra-light rounded-full p-1 mb-2 @min-[270px]/payment-qr-codes:mb-6'>
                <button
                    onClick={() => setView('venmo')}
                    className={cn(
                        'flex-1 cursor-pointer relative z-10 w-full py-1.5 text-[15px] font-bold text-center rounded-full transition-colors tracking-wide',
                        view === 'venmo' ? 'text-background' : 'text-primary',
                    )}
                >
                    Venmo
                </button>
                <button
                    onClick={() => setView('zelle')}
                    className={cn(
                        'flex-1 cursor-pointer relative z-10 w-full py-1.5 text-[15px] font-bold text-center rounded-full transition-colors tracking-wide',
                        view === 'zelle' ? 'text-background' : 'text-primary',
                    )}
                >
                    Zelle
                </button>
                <div className={`absolute p-1 inset-0 z-0 flex ${view === 'zelle' ? 'justify-end' : 'justify-start'}`}>
                    <motion.span layout transition={{ type: 'spring', damping: 15, stiffness: 250 }} className='h-full w-1/2 rounded-full bg-primary' />
                </div>
            </div>

            <div className='w-full min-h-80'>
                <AnimatePresence mode='wait'>
                    {view === 'venmo' ? (
                        <motion.div
                            key='venmo'
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            className='flex flex-col items-center justify-center space-y-6 w-full'
                        >
                            {!user.venmo || !user.venmoEnabled ? (
                                <div className='text-center py-10 px-4 flex flex-col justify-center'>
                                    <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                        <UserIcon className='text-gray-400' size={32} />
                                    </div>
                                    <p className='text-gray-500 text-sm'>You haven't added a Venmo link yet or Venmo is disabled.</p>
                                    <button
                                        onClick={() => {
                                            onClose();
                                            setSettingsOpen('invoicing');
                                        }}
                                        className='text-primary font-bold text-sm mt-2 hover:text-primary-light transition-all cursor-pointer'
                                    >
                                        Go to Settings
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className='p-4 bg-white scale-[0.85] @min-[250px]/payment-qr-codes:scale-[0.9] @min-[270px]/payment-qr-codes:scale-[0.95] @min-[285px]/payment-qr-codes:scale-[1] rounded-2xl border-2 border-[#008CFF]/10 shadow-sm'>
                                        <QRCode value={user.venmo} size={250} fgColor='#171717' bgColor='#FFFFFF' level='M' />
                                    </div>

                                    <div className='flex flex-col @min-[315px]/payment-qr-codes:flex-row w-full items-center gap-3 justify-center'>
                                        <div className='bg-[#008dff] venmo-border rounded-[10px] h-[42px] flex items-center justify-center w-full @min-[315px]/payment-qr-codes:w-[161px]'>
                                            <Image src='/venmo-logo-full.png' alt='Venmo' width={100} height={100} className='max-h-[38px] w-fit px-4' />
                                        </div>

                                        <button
                                            type='button'
                                            onClick={() => {
                                                navigator.clipboard.writeText(user.venmo);
                                                successToast('Venmo link copied');
                                            }}
                                            className='font-figtree w-full @min-[315px]/payment-qr-codes:w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-1.5 px-6 bg-background text-primary primary-border-hover'
                                        >
                                            <Share2 className='w-4 h-4' strokeWidth={3} />
                                            Share Link
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key='zelle'
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className='flex flex-col items-center w-full space-y-6'
                        >
                            {user.zelle === 'disabled' ? (
                                <div className='text-center py-10 px-4 flex flex-col justify-center'>
                                    <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                        <Smartphone className='text-gray-400' size={32} />
                                    </div>
                                    <p className='text-gray-500 text-sm'>Zelle is not enabled or set up.</p>
                                    <button
                                        onClick={() => {
                                            onClose();
                                            setSettingsOpen('invoicing');
                                        }}
                                        className='text-primary font-bold text-sm mt-2 hover:text-primary-light transition-all cursor-pointer'
                                    >
                                        Go to Settings
                                    </button>
                                </div>
                            ) : (
                                (user.zelle === 'email' || (user.zelle === 'phone' && user.phoneNumber && user.phoneNumber.length > 0)) && (
                                    <div className='flex flex-col items-center justify-center p-4 w-full'>
                                        <div className='w-40 h-40 bg-[#6D1ED4]/10 rounded-4xl flex items-center justify-center mb-6'>
                                            <Image src='/zelle-logo.png' alt='Zelle' width={120} height={120} />
                                        </div>

                                        <div className='w-full text-center mb-4'>
                                            <p className='text-gray-400 text-xs font-bold uppercase mb-1'>Send Zelle payment to:</p>
                                            <p className='text-2xl font-bold text-gray-900 break-all family-mono mb-2 truncate'>{user.name}</p>
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    navigator.clipboard.writeText(user.zelle === 'email' ? user.email : formatPhoneNumber(user.phoneNumber));
                                                    successToast('Copied to clipboard');
                                                }}
                                                title={user.zelle === 'email' ? user.email : formatPhoneNumber(user.phoneNumber)}
                                                className='bg-gray-50 border cursor-pointer truncate text-gray-500 border-gray-200 shadow-sm flex items-center gap-2 w-full px-4 py-[5px] text-[17px] rounded-xl'
                                            >
                                                <Copy size={18} className='min-w-4.5' />
                                                <span className='truncate'>{user.zelle === 'email' ? user.email : formatPhoneNumber(user.phoneNumber)}</span>
                                            </button>
                                        </div>

                                        <div className='text-center text-gray-400 text-xs max-w-xs'>
                                            <p>
                                                Ask the client to open their banking app and pay using Zelle with this {user.zelle === 'email' ? 'email' : 'number'}. If you would like
                                                to switch to {user.zelle === 'email' ? 'a phone number' : 'your email'},{' '}
                                                <span
                                                    className='text-primary hover:text-primary-light underline cursor-pointer transition-all'
                                                    onClick={() => {
                                                        onClose();
                                                        setSettingsOpen('invoicing');
                                                    }}
                                                >
                                                    go to settings
                                                </span>{' '}
                                                to change it.
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const InvoiceCard = ({ job, isHistory = false, onRefresh }: { job: any; isHistory?: boolean; onRefresh: () => void }) => {
    const [assignmentsByClient, setAssignmentsByClient] = useState(
        job.assignments.reduce((acc: any, a: any) => {
            const clientId = a.horse.clientId || 'barn';
            const clientName = a.horse.client?.name || 'Barn / No Client';

            if (!acc[clientId]) {
                acc[clientId] = {
                    id: clientId,
                    name: clientName,
                    assignments: [],
                    isPaid: true,
                };
            }
            acc[clientId].assignments.push(a);
            if (!a.paidAt) acc[clientId].isPaid = false;
            return acc;
        }, {}),
    );

    const [expanded, setExpanded] = useState(!isHistory);
    const [loadingClient, setLoadingClient] = useState<string | null>(null);

    const handleClientToggle = async (clientId: string, currentStatus: boolean, realClientId: string | null) => {
        setLoadingClient(clientId);
        const res = await markClientPaid(job.id, realClientId === 'barn' ? null : realClientId, !currentStatus);

        if (res.success) {
            setAssignmentsByClient({ ...assignmentsByClient, [clientId]: { ...assignmentsByClient[clientId], isPaid: !currentStatus } });
            onRefresh();
        } else {
            failToast('Error updating payment status');
        }

        setLoadingClient(null);
    };

    const totalRevenue = job.assignments.reduce((acc: number, a: any) => {
        const servicesTotal = a.services
            .filter((s: any) => !a.canceledServiceIds.includes(s.id) && (a.status === 'completed' || a.status === 'accepted') && !a.canceledAt)
            .reduce((acc: number, s: any) => acc + s.priceUSD, 0);
        const customTotal = a.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0);
        return acc + servicesTotal + customTotal;
    }, 0);

    return (
        <div className={cn('bg-white rounded-[14px] border border-gray-100 shadow-sm overflow-hidden transition-all', isHistory ? 'opacity-70 hover:opacity-100' : '')}>
            <div className='p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 bg-gray-50/50' onClick={() => setExpanded(!expanded)}>
                <div className='flex items-center gap-4'>
                    <div
                        className={cn(
                            'w-24 h-12 rounded-[14px] font-bold font-figtree flex items-center justify-center shrink-0',
                            isHistory ? 'bg-gray-100 text-gray-400' : 'bg-primary-extra-light border border-[#dae3de] text-primary-light',
                        )}
                    >
                        {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                        }).format(totalRevenue)}
                    </div>
                    <div>
                        <h3 className='font-bold text-gray-900'>{job.show.name}</h3>
                        <p className='text-xs text-gray-500'>
                            {format(new Date(job.invoiceSentAt), 'MMM d, yyyy')} • {job.assignments.length} Horses
                        </p>
                    </div>
                </div>
                <motion.div
                    className='text-gray-400 mr-2 bg-gray-100 p-1 rounded-full'
                    initial={{ rotate: 0 }}
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 150 }}
                >
                    <ChevronUp />
                </motion.div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ ease: 'easeOut', duration: 0.3 }}
                        className='border-t border-gray-100'
                    >
                        <div className='p-4 space-y-3'>
                            <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-2'>Client Payments</p>

                            {Object.values(assignmentsByClient)
                                .sort((aGroup: any, bGroup: any) => aGroup.name.localeCompare(bGroup.name))
                                .map((group: any) => {
                                    const groupTotal = group.assignments.reduce((acc: number, a: any) => {
                                        const servicesTotal = a.services
                                            .filter((s: any) => !a.canceledServiceIds.includes(s.id) && (a.status === 'completed' || a.status === 'accepted') && !a.canceledAt)
                                            .reduce((acc: number, s: any) => acc + s.priceUSD, 0);
                                        const customTotal = a.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0);
                                        return acc + servicesTotal + customTotal;
                                    }, 0);

                                    if (groupTotal === 0) return null;

                                    return (
                                        <div key={group.id} className='flex items-center justify-between p-3 rounded-lg border border-gray-100'>
                                            <div className='flex items-center gap-3'>
                                                <button
                                                    type='button'
                                                    disabled={loadingClient === group.id}
                                                    onClick={() => handleClientToggle(group.id, group.isPaid, group.id === 'barn' ? null : group.id)}
                                                    className={cn(
                                                        'min-w-5 h-5 rounded border flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer hover:border-primary disabled:cursor-not-allowed',
                                                        group.isPaid ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-white',
                                                        loadingClient === group.id && !group.isPaid ? 'text-primary' : '',
                                                    )}
                                                >
                                                    {loadingClient === group.id ? (
                                                        <RefreshCcw className='w-3 h-3 animate-spin text-primary' />
                                                    ) : (
                                                        <CheckSquare size={14} strokeWidth={3} className='text-white' />
                                                    )}
                                                </button>
                                                <p className='font-bold text-sm text-gray-900'>{group.name}</p>
                                            </div>
                                            <div className='font-bold text-gray-700'>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(groupTotal)}</div>
                                        </div>
                                    );
                                })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Invoices;
