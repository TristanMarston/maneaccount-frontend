'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    User as UserIcon,
    Calendar,
    Clock,
    CheckCircle2,
    DollarSign,
    ExternalLink,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    QrCode,
    RefreshCcw,
    Copy,
    Share2,
    Check,
    Smartphone,
    Link as LinkIcon,
    Mail,
    X,
    CircleQuestionMark,
    HandCoins,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getJobs, markJobPaid } from '@/app/actions/jobs';
import { Job } from '@prisma/client';
import toast from 'react-hot-toast';
import Modal from '../../Modal';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { markAllTypeAsRead } from '@/app/actions/notifications';
import { NotificationType } from '@prisma/client';
import { useNotifications } from '@/app/NotificationContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { getUserSettings } from '@/app/actions/settings';
import { failToast, successToast } from '@/app/context';
import { format } from 'date-fns';

const Invoices = ({
    role,
    userEmail,
    setView,
    setSettingsModalOpen,
}: {
    role: string;
    userEmail: string;
    setView: (view: string) => void;
    setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [payModal, setPayModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'venmo' | 'zelle' | 'cash/check' | ''>('');
    const [showQRModal, setShowQRModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (!payModal) setPaymentMethod('');
    }, [payModal]);

    useEffect(() => {
        const fetchSettings = async () => {
            if (role === 'braider') {
                const settings = await getUserSettings();
                setCurrentUser(settings);
            }
        };

        fetchSettings();
    }, [role, showQRModal, payModal]);

    const refreshJobsFn = useCallback(async () => {
        setLoading(true);
        const data = await getJobs(userEmail, role);
        setJobs(data);
        setLoading(false);
    }, [userEmail, role]);

    useAutoRefresh(refreshJobsFn);

    const { refreshCounts } = useNotifications();

    useEffect(() => {
        if (role === 'barn') {
            markAllTypeAsRead(NotificationType.job_completed).then(() => {
                refreshCounts();
            });
        }
    }, [userEmail, role, refreshCounts]);

    const handlePay = async () => {
        if (!selectedJob || !paymentMethod) return;

        const res = await markJobPaid(selectedJob.id, paymentMethod);

        if (res.success) {
            successToast('Payment recorded');
            setPayModal(false);
            setPaymentMethod('');
            setSelectedJob(null);
            refreshJobsFn();
        } else {
            failToast('Failed to record payment');
        }
    };

    if (role === 'subcontractor') {
        return (
            <div className='flex flex-col items-center justify-center h-full text-gray-400'>
                <DollarSign size={48} className='mb-4 opacity-50' />
                <p>Invoices are not available for subcontractors.</p>
            </div>
        );
    }

    const unpaidJobs = jobs.filter((j) => j.status === 'completed' && !j.paidAt);
    const paidJobs = jobs.filter((j) => j.paidAt);

    const totalEarned = paidJobs.reduce(
        (acc, j) => acc + j.assignments.reduce((sAcc: number, s: any) => sAcc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0),
        0
    );
    const pendingAmount = unpaidJobs.reduce(
        (acc, j) => acc + j.assignments.reduce((sAcc: number, s: any) => sAcc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0),
        0
    );

    return (
        <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-8 h-full @container/invoices'>
            <div
                className={cn(
                    role === 'braider'
                        ? 'flex justify-between @min-[490px]/invoices:items-center flex-col @min-[490px]/invoices:flex-row mb-6 gap-4'
                        : 'flex justify-between @min-[380px]/invoices:items-center flex-col @min-[380px]/invoices:flex-row mb-6 gap-4'
                )}
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Invoices</h1>
                    <p className='text-gray-500 font-figtree mt-1'>{role === 'barn' ? 'Manage your payments to braiders.' : 'Track your earnings and pending payments.'}</p>
                </div>
                <div className='flex flex-col gap-3 @min-[380px]/invoices:flex-row @min-[380px]/invoices:items-center @min-[380px]/invoices:gap-4 w-auto'>
                    <button
                        onClick={refreshJobsFn}
                        className={cn(
                            'font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-primary primary-border-hover bg-background',
                            role === 'braider'
                                ? 'text-[17px] @min-[275px]/invoices:text-lg text-nowrap rounded-[14px] @min-[490px]/invoices:rounded-[20px] @min-[735px]/invoices:rounded-[10px] py-2 px-6 @min-[490px]/invoices:p-3 @min-[735px]/invoices:py-2 @min-[735px]/invoices:px-6'
                                : 'text-[17px] @min-[275px]/invoices:text-lg text-nowrap rounded-[14px] @min-[380px]/invoices:rounded-[20px] @min-[440px]/invoices:rounded-[10px] @min-[380px]/invoices:p-3 @min-[440px]/invoices:py-2 @min-[440px]/invoices:px-6 py-2 px-6'
                        )}
                    >
                        <RefreshCcw className={cn('w-6 h-6', loading ? 'animate-spin' : '')} strokeWidth={2.5} />
                        <span
                            className={cn(
                                role === 'braider' ? 'block @min-[490px]/invoices:hidden @min-[735px]/invoices:block' : 'block @min-[380px]/invoices:hidden @min-[440px]/invoices:block'
                            )}
                        >
                            Refresh
                        </span>
                    </button>
                    {role === 'braider' && (
                        <button
                            onClick={() => setShowQRModal(true)}
                            className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[275px]/invoices:text-lg @min-[650px]/invoices:text-[19px] @min-[735px]/invoices:text-lg text-nowrap rounded-[14px] @min-[490px]/invoices:rounded-[20px] @min-[650px]/invoices:rounded-[14px] @min-[735px]/invoices:rounded-[10px] py-2 px-6 @min-[490px]/invoices:p-3 @min-[650px]/invoices:py-2 @min-[650px]/invoices:px-6 bg-primary-light text-background primary-border-hover'
                        >
                            <QrCode className='w-6 h-6' strokeWidth={2.5} />
                            <span className='block @min-[490px]/invoices:hidden @min-[650px]/invoices:block'>Show QR Codes</span>
                        </button>
                    )}
                </div>
            </div>

            {role === 'braider' && (
                <div className='grid grid-cols-1 @min-[490px]/invoices:grid-cols-2 gap-4 mb-8 font-figtree'>
                    <div className='bg-emerald-50 primary-border rounded-[14px] p-6 flex flex-col gap-2'>
                        <span className='text-emerald-600 font-bold uppercase text-xs tracking-wider'>Total Earnings</span>
                        <span
                            className='text-4xl font-lusitana font-bold text-primary truncate'
                            title={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalEarned)}
                        >
                            {loading ? (
                                <span>
                                    $<span className='text-5xl'>--.--</span>
                                </span>
                            ) : (
                                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalEarned)
                            )}
                        </span>
                    </div>
                    <div className='bg-amber-50 amber-border p-6 rounded-[14px] flex flex-col gap-2'>
                        <span className='text-amber-600 font-bold uppercase text-xs tracking-wider'>Pending Payments</span>
                        <span
                            className='text-4xl font-lusitana font-bold text-amber-700 truncate'
                            title={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pendingAmount)}
                        >
                            {loading ? (
                                <span>
                                    $<span className='text-5xl'>--.--</span>
                                </span>
                            ) : (
                                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pendingAmount)
                            )}
                        </span>
                    </div>
                </div>
            )}

            <div className='space-y-8 font-figtree'>
                <section>
                    <h2 className='text-lg font-bold font-figtree mb-4 flex items-center gap-2'>
                        {role === 'barn' ? 'To Pay' : 'Pending Payment'}
                        {unpaidJobs.length > 0 && (
                            <span className='bg-primary text-white text-xs w-5.5 h-5.5 rounded-full aspect-square flex justify-center items-center text-center'>
                                {unpaidJobs.length}
                            </span>
                        )}
                    </h2>

                    {loading ? (
                        <div className='flex flex-col items-center gap-3 animate-pulse'>
                            <div className='w-full h-[140px] @min-[490px]/invoices:h-[82px] bg-gray-100 rounded-2xl'></div>
                            <div className='w-full h-[140px] @min-[490px]/invoices:h-[82px] bg-gray-100 rounded-2xl'></div>
                            <div className='w-full h-[140px] @min-[490px]/invoices:h-[82px] bg-gray-100 rounded-2xl'></div>
                        </div>
                    ) : unpaidJobs.length === 0 ? (
                        <div className='flex flex-col items-center justify-center text-center py-12 bg-gray-50/50 rounded-2xl px-4 border border-dashed border-gray-200'>
                            <div className='w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                                <HandCoins className='text-gray-400' size={40} />
                            </div>
                            <span className='text-gray-500 text-lg font-semibold'>No pending invoices.</span>
                        </div>
                    ) : (
                        <div className='space-y-3'>
                            {unpaidJobs.map((job) => (
                                <InvoiceCard
                                    key={job.id}
                                    job={job}
                                    role={role}
                                    onAction={() => {
                                        setSelectedJob(job);
                                        setPayModal(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {paidJobs.length > 0 && (
                    <section>
                        <span
                            onClick={() => setShowHistory((prev) => !prev)}
                            className='text-gray-400 font-semibold cursor-pointer hover:text-gray-500 transition-all flex items-center gap-1.5 text-lg mb-2'
                        >
                            <h2 className=''>History</h2>
                            <motion.div initial={{ rotate: 0 }} animate={showHistory ? { rotate: 180 } : { rotate: 0 }} transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}>
                                <ChevronDown />
                            </motion.div>
                        </span>
                        <AnimatePresence>
                            {showHistory && (
                                <motion.div
                                    variants={{
                                        hidden: {
                                            opacity: 0,
                                            y: 10,
                                        },
                                        visible: {
                                            opacity: 1,
                                            y: 0,
                                        },
                                    }}
                                    initial='hidden'
                                    animate={showHistory ? 'visible' : 'hidden'}
                                    exit='hidden'
                                    className='space-y-3'
                                >
                                    {paidJobs.map((job) => (
                                        <InvoiceCard key={job.id} job={job} role={role} isHistory />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                )}
            </div>

            <Modal isOpen={payModal} setIsOpen={setPayModal} className='max-w-md w-full p-7 rounded-[18px] primary-border-bold overflow-y-auto'>
                {selectedJob && (
                    <div className='font-figtree @container/send-payment'>
                        <h2 className='text-4xl font-lusitana font-bold mb-1'>Send Payment</h2>
                        <p className='text-gray-500 text-sm mb-6'>
                            Pay <span className='font-bold text-gray-900'>{selectedJob.braider.name}</span> for{' '}
                            {selectedJob.assignments.reduce((acc: any, s: any) => acc + s.services.length, 0)} services across {selectedJob.assignments.length} horses.
                            <span className='text-sm text-gray-400 text-left block mt-0.5'>Service date: {format(selectedJob.scheduledDate, 'MMM d, yyyy')}</span>
                        </p>

                        <div className='bg-emerald-50 p-4 rounded-xl mb-6 border border-emerald-200 shadow-sm'>
                            <div className='flex justify-between items-center'>
                                <span className='text-emerald-600 font-semibold text-lg'>Total Amount</span>
                                <span className='text-3xl font-bold font-lusitana text-emerald-600'>
                                    ${selectedJob.assignments.reduce((acc: any, s: any) => acc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0)}
                                </span>
                            </div>
                        </div>

                        <div className='space-y-3 mb-6'>
                            <p className='text-xs font-bold text-gray-400 uppercase ml-1 tracking-wider'>Select Payment Method</p>

                            {selectedJob.braider.venmo && selectedJob.braider.venmoEnabled && (
                                <div
                                    onClick={() => setPaymentMethod('venmo')}
                                    className={cn(
                                        'flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-sm',
                                        paymentMethod === 'venmo'
                                            ? 'border-[#008CFF] bg-[#008CFF]/5 ring-1 ring-[#008CFF]'
                                            : 'border-gray-200 hover:border-[#008CFF]/30 hover:bg-[#008CFF]/5'
                                    )}
                                >
                                    <div className='w-12 h-12 rounded-full relative overflow-hidden bg-[#008CFF]/10 flex items-center justify-center shrink-0'>
                                        <Image src='/venmo-logo.png' alt='Venmo' width={48} height={48} className='object-cover' />
                                    </div>
                                    <div className='flex-1'>
                                        <div className='font-bold text-gray-900 text-lg'>Venmo</div>
                                        <div className='text-sm text-gray-500'>Tap icon to open</div>
                                    </div>
                                    <Link href={selectedJob.braider.venmo} target='_blank' rel='noreferrer'>
                                        <ExternalLink
                                            size={40}
                                            className='text-gray-300 mr-1 hover:bg-[#008CFF]/10 cursor-pointer hover:text-[#008CFF] transition-all p-2 rounded-2xl'
                                        />
                                    </Link>
                                </div>
                            )}

                            {selectedJob.braider.zelle !== 'disabled' &&
                                (selectedJob.braider.zelle === 'phone'
                                    ? selectedJob.braider.phoneNumber && selectedJob.braider.phoneNumber.length > 0
                                    : selectedJob.braider.zelle === 'email'
                                      ? selectedJob.braider.email && selectedJob.braider.email.length > 0
                                      : false) && (
                                    <div
                                        onClick={() => {
                                            setPaymentMethod('zelle');
                                        }}
                                        className={cn(
                                            'flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-sm',
                                            paymentMethod === 'zelle'
                                                ? 'border-[#6D1ED4] bg-[#6D1ED4]/5 ring-1 ring-[#6D1ED4]'
                                                : 'border-gray-200 hover:border-[#6D1ED4]/30 hover:bg-[#6D1ED4]/5'
                                        )}
                                    >
                                        <div className='w-12 h-12 rounded-full relative overflow-hidden bg-[#6D1ED4]/10 flex items-center justify-center shrink-0'>
                                            <Image src='/zelle-logo.png' alt='Zelle' width={48} height={48} className='object-cover' />
                                        </div>
                                        <div className='flex-1 min-w-0'>
                                            <div className='font-bold text-gray-900 text-lg'>Zelle</div>
                                            <div className='text-sm text-gray-500 flex items-center gap-1 min-w-0'>
                                                <span className='truncate'>
                                                    {selectedJob.braider.zelle === 'email'
                                                        ? selectedJob.braider.email
                                                        : selectedJob.braider.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            <div
                                onClick={() => setPaymentMethod('cash/check')}
                                className={cn(
                                    'flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-sm',
                                    paymentMethod === 'cash/check'
                                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                                        : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50'
                                )}
                            >
                                <div className='w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl shrink-0'>$</div>
                                <div className='flex-1'>
                                    <div className='font-bold text-gray-900 text-lg'>Cash / Check</div>
                                    <div className='text-sm text-gray-500'>Mark as paid manually</div>
                                </div>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 gap-2 @min-[330px]/send-payment:grid-cols-2 @min-[330px]/send-payment:gap-3'>
                            <button onClick={() => setPayModal(false)} className='p-1.5 cursor-pointer primary-border-hover text-primary font-bold rounded-[10px] text-lg'>
                                Cancel
                            </button>
                            <button
                                onClick={handlePay}
                                disabled={paymentMethod.length === 0}
                                className='p-1.5 cursor-pointer primary-border-hover bg-primary-light text-background font-bold rounded-[10px] text-lg disabled:opacity-50 disabled:pointer-events-none'
                            >
                                I sent payment
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={showQRModal} setIsOpen={setShowQRModal} className='max-w-md w-full p-6 rounded-[18px] primary-border-bold overflow-hidden'>
                {currentUser && <QRCodeModal user={currentUser} onClose={() => setShowQRModal(false)} setSettingsModalOpen={setSettingsModalOpen} />}
            </Modal>
        </div>
    );
};

const QRCodeModal = ({ user, onClose, setSettingsModalOpen }: { user: any; onClose: () => void; setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
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
                        view === 'venmo' ? 'text-background' : 'text-primary'
                    )}
                >
                    Venmo
                </button>
                <button
                    onClick={() => setView('zelle')}
                    className={cn(
                        'flex-1 cursor-pointer relative z-10 w-full py-1.5 text-[15px] font-bold text-center rounded-full transition-colors tracking-wide',
                        view === 'zelle' ? 'text-background' : 'text-primary'
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
                                            setSettingsModalOpen(true);
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
                                                toast.success('Venmo link copied');
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
                                            setSettingsModalOpen(true);
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
                                                    navigator.clipboard.writeText(user.zelle === 'email' ? user.email : user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'));
                                                    successToast('Copied to clipboard');
                                                }}
                                                title={user.zelle === 'email' ? user.email : user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                                                className='bg-gray-50 border cursor-pointer truncate text-gray-500 border-gray-200 shadow-sm flex items-center gap-2 w-full px-4 py-[5px] text-[17px] rounded-xl'
                                            >
                                                <Copy size={18} className='min-w-4.5' />
                                                <span className='truncate'>{user.zelle === 'email' ? user.email : user.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}</span>
                                            </button>
                                        </div>

                                        <div className='text-center text-gray-400 text-xs max-w-xs'>
                                            <p>
                                                Ask the barn to open their banking app and pay using Zelle with this {user.zelle === 'email' ? 'email' : 'number'}. If you would like
                                                to switch to {user.zelle === 'email' ? 'a phone number' : 'your email'},{' '}
                                                <span
                                                    className='text-primary hover:text-primary-light underline cursor-pointer transition-all'
                                                    onClick={() => {
                                                        onClose();
                                                        setSettingsModalOpen(true);
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

const InvoiceCard = ({ job, role, onAction, isHistory }: { job: any; role: string; onAction?: () => void; isHistory?: boolean }) => {
    return (
        <div
            className={cn(
                'bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col @min-[490px]/invoices:flex-row gap-4 justify-between items-center',
                isHistory ? 'opacity-60' : ''
            )}
        >
            <div className='flex items-center gap-4 w-full min-w-0'>
                <div
                    className={cn(
                        'w-16 h-12 rounded-[14px] font-bold font-figtree flex items-center justify-center shrink-0',
                        isHistory ? 'bg-gray-100 text-gray-400' : 'bg-primary-extra-light border border-[#dae3de] text-primary-light'
                    )}
                >
                    ${job.assignments.reduce((acc: any, s: any) => acc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0)}
                </div>
                <div className='min-w-0'>
                    <h3 className='font-bold font-figtree text-gray-900 truncate'>{role === 'barn' ? job.braider.name : job.barn.name}</h3>
                    <p className='text-xs text-gray-500 flex items-center gap-2'>
                        <span className='flex items-center gap-1'>
                            <Calendar size={10} /> {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{job.assignments.reduce((acc: any, s: any) => acc + s.services.length, 0)} Services</span>
                    </p>
                </div>
            </div>

            {((isHistory && job.paidAt) || (!isHistory && role === 'barn')) && (
                <div className='flex items-center gap-6 w-full @min-[490px]/invoices:w-auto justify-between @min-[490px]/invoices:justify-end'>
                    {isHistory && job.paidAt && (
                        <div className='text-left @min-[490px]/invoices:text-right w-full text-xs text-green-600 font-bold uppercase text-nowrap'>
                            <p>
                                Paid with{' '}
                                {job.paymentPlatform === 'venmo'
                                    ? 'Venmo'
                                    : job.paymentPlatform === 'zelle'
                                      ? 'Zelle'
                                      : job.paymentPlatform === 'cash/check'
                                        ? 'Cash / Check'
                                        : 'Other Method'}
                            </p>
                            <p>{new Date(job.paidAt).toLocaleDateString()}</p>
                        </div>
                    )}

                    {!isHistory && role === 'barn' && (
                        <button
                            onClick={onAction}
                            className='bg-primary-light w-full text-nowrap text-background primary-border-hover mr-2 px-4 py-2 rounded-[10px] font-bold text-base shadow-sm cursor-pointer'
                        >
                            Pay Now
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Invoices;
