'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Tab } from '../_braider/BraiderDashboard';
import { getJobById, getUserById, removeCustomCharge, resendInvoice } from '@/app/actions/jobs';
import { changeThanksMessage } from '@/app/actions/settings';
import { failToast, generateId, successToast } from '@/app/context';
import { ArchiveRestore, BadgeDollarSign, CalendarCheck, Check, CheckCircle, Loader2, MinusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { calendarDateToLocal } from '@/lib/date-utils';
import { AnimatePresence, motion } from 'motion/react';

export const CheckMarkedCompletedModal = ({
    checkMarkedCompleted,
    setCheckMarkedCompleted,
    handleMarkJobCompleted,
    handleOpenAddChargeModal,
    exactTime,
    role,
    userId,
    setSettingsOpen,
}: {
    checkMarkedCompleted: {
        open: boolean;
        id: string;
        assignments: any[];
    };
    setCheckMarkedCompleted: (checkMarkedCompleted: { open: boolean; id: string; assignments: any[] }) => void;
    role: string;
    handleMarkJobCompleted: (id: string, thanksMessage: string, sendInvoiceTo: 'client' | 'barn' | 'both') => void;
    handleOpenAddChargeModal: (assignmentId: string, adjustFn?: (id: string, name: string, amount: number) => void) => void;
    exactTime: Date;
    userId: string;
    setSettingsOpen: (page: Tab) => void;
}) => {
    // @ts-ignore
    if (!checkMarkedCompleted.id) setCheckMarkedCompleted((prev) => ({ ...prev, open: false }));
    const [invoiceInfo, setInvoiceInfo] = useState(getInvoiceInfo(checkMarkedCompleted.assignments));
    const originalThanksMessage = useRef('');
    const [thanksMessage, setThanksMessage] = useState('');
    const [loadingThanksMessage, setLoadingThanksMessage] = useState(true);
    const [thanksMessageWords, setThanksMessageWords] = useState(0);
    const originalSendInvoiceTo = useRef<'client' | 'barn' | 'both' | null>(null);
    const [sendInvoiceTo, setSendInvoiceTo] = useState<'client' | 'barn' | 'both'>('both');

    useEffect(() => {
        setInvoiceInfo(getInvoiceInfo(checkMarkedCompleted.assignments));
    }, [checkMarkedCompleted.open, checkMarkedCompleted.assignments]);

    const [loadingDetails, setLoadingDetails] = useState(true);
    const [hasPayoutInfo, setHasPayoutInfo] = useState(false);

    useEffect(() => {
        const getUserInfo = async () => {
            setLoadingDetails(true);
            setLoadingThanksMessage(true);
            const user = await getUserById(userId);

            if (user && ((user.venmo && user.venmoEnabled) || user.zelle !== 'disabled')) setHasPayoutInfo(true);
            if (user && user.thanksMessage) {
                originalThanksMessage.current = user.thanksMessage;
                setThanksMessage(user.thanksMessage);
                setThanksMessageWords(user.thanksMessage.split(' ').filter((s) => s.trim().length > 0).length);
            }
            if (user) {
                originalSendInvoiceTo.current = user.autoSendInvoiceTo;
                setSendInvoiceTo(user.autoSendInvoiceTo);
            }
            setLoadingDetails(false);
            setLoadingThanksMessage(false);
        };

        getUserInfo();
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

    const setNewAutoInvoiceSendPreferences = async () => {};

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
                <p className='font-semibold'>
                    This action will send an invoice
                    {sendInvoiceTo === 'both'
                        ? ' to the barn and related horse owners'
                        : sendInvoiceTo === 'barn'
                          ? ' to the barn'
                          : sendInvoiceTo === 'client'
                            ? ' to the related horse owners'
                            : ''}
                    .
                </p>
                <p className='mt-2'>
                    Payments occur outside of the ManeAccount platform, but we offer the ability to track them here in the <span className='font-bold'>Invoices</span> panel. Please
                    ensure that all reported services were actually completed.
                </p>

                <span className='flex items-start gap-2 mt-4 mb-2'>
                    <button
                        type='button'
                        onClick={() => setSendInvoiceTo((prev) => (prev === 'both' ? 'client' : prev === 'client' ? 'both' : prev === 'barn' ? 'barn' : 'barn'))}
                        disabled={sendInvoiceTo === 'barn'}
                        className={cn(
                            'p-px cursor-pointer border rounded-md transition-all outline-none shadow-sm disabled:cursor-not-allowed disabled:opacity-80',
                            sendInvoiceTo === 'barn' || sendInvoiceTo === 'both' ? 'bg-primary border-primary' : 'bg-background hover:bg-gray-50 border-gray-400',
                        )}
                    >
                        <Check className={cn('transition-all w-4 h-4 text-background')} strokeWidth={2.5} />
                    </button>
                    <span className={cn('text-sm -mt-px transition-all font-medium', sendInvoiceTo === 'barn' || sendInvoiceTo === 'both' ? 'text-primary' : 'text-gray-600')}>
                        Send invoice to the barn {invoiceInfo.barnOwnerName && invoiceInfo.barnOwnerName.trim().length > 0 ? ` (${invoiceInfo.barnOwnerName})` : ''}
                    </span>
                </span>
                <span className='flex items-start gap-2 mt-2 mb-4'>
                    <button
                        type='button'
                        onClick={() => setSendInvoiceTo((prev) => (prev === 'both' ? 'barn' : prev === 'barn' ? 'both' : prev === 'client' ? 'client' : 'client'))}
                        disabled={sendInvoiceTo === 'client'}
                        className={cn(
                            'p-px cursor-pointer border rounded-md transition-all outline-none shadow-sm disabled:cursor-not-allowed disabled:opacity-80',
                            sendInvoiceTo === 'client' || sendInvoiceTo === 'both' ? 'bg-primary border-primary' : 'bg-background hover:bg-gray-50 border-gray-400',
                        )}
                    >
                        <Check className={cn('transition-all w-4 h-4 text-background')} strokeWidth={2.5} />
                    </button>
                    <span className={cn('text-sm -mt-px transition-all font-medium', sendInvoiceTo === 'client' || sendInvoiceTo === 'both' ? 'text-primary' : 'text-gray-600')}>
                        Send the invoice to horse owners{' '}
                        {invoiceInfo.horseOwnerNames.length > 0 ? (
                            <>
                                <span>(</span>
                                {invoiceInfo.horseOwnerNames.map((name, index) => (
                                    <span key={name + index}>
                                        {index === invoiceInfo.horseOwnerNames.length - 1 && invoiceInfo.horseOwnerNames.length !== 1 ? 'and ' : ''}
                                        {name}
                                        {index !== invoiceInfo.horseOwnerNames.length - 1 && invoiceInfo.horseOwnerNames.length > 2
                                            ? ', '
                                            : index !== invoiceInfo.horseOwnerNames.length - 1
                                              ? ' '
                                              : ''}
                                    </span>
                                ))}
                                <span>)</span>
                            </>
                        ) : (
                            ''
                        )}
                    </span>
                </span>
                {/* <AnimatePresence>
                    {originalSendInvoiceTo.current && originalSendInvoiceTo.current !== sendInvoiceTo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setNewAutoInvoiceSendPreferences()}
                            className='text-sm uppercase ml-1 flex items-center gap-1 bg-primary/10 py-0.5 px-2 rounded-full hover:bg-primary/5 transition-colors cursor-pointer'
                        >
                            {loadingAutoSendInvoice ? <Loader2 className='animate-spin text-primary w-4 h-4' /> : <></>}
                            {loadingAutoSendInvoice ? 'Loading...' : 'Set New Send Preferences'}
                        </motion.div>
                    )}
                </AnimatePresence> */}
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
                            <div className='mx-1 @min-[290px]/check-completed:mx-3 mt-2 space-y-2'>
                                {Object.entries(invoiceInfo.horseDetails)
                                    .sort(([aName], [bName]) => aName.split('/////')[0].localeCompare(bName.split('/////')[0]))
                                    .map(([horseName, serviceDetails], i) => (
                                        <div key={horseName + i} className='p-1.5 rounded-xl border border-violet-200'>
                                            <span className='font-figtree ml-1 my-3 text-violet-400 font-bold text-[15px]'>
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
                                                            onClick={() => handleOpenAddChargeModal(invoiceInfo.horseAssignmentIds[horseName])}
                                                            className='text-amber-600 w-fit cursor-pointer hover:bg-amber-100 transition-all text-sm px-3 py-0.5 border border-amber-100 bg-amber-50 rounded-full mt-3'
                                                        >
                                                            Add Custom Expense
                                                        </li>
                                                    </ul>
                                                    <p className='text-sm px-3 py-0.5 bg-violet-50 w-fit rounded-full border border-violet-100 text-violet-900 mt-2 mb-1'>
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
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                    <div className='ml-1'>
                        <p className='font-figtree text-primary font-bold tracking-wide uppercase text-sm mt-3'>Thank-you Message (optional)</p>
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
                    onClick={() => handleMarkJobCompleted(checkMarkedCompleted.id, thanksMessage, sendInvoiceTo)}
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

export const AdjustResendModal = ({
    job,
    setJob,
    handleOpenAddChargeModal,
    exactTime,
    role,
    userId,
    setSettingsOpen,
    onClose,
    setConfirmCloseModal,
}: {
    job: any;
    setJob: (job: any) => void;
    role: string;
    handleOpenAddChargeModal: (assignmentId: string, adjustFn?: (id: string, name: string, amount: number) => void) => void;
    exactTime: Date;
    userId: string;
    setSettingsOpen: (page: Tab) => void;
    onClose: () => void;
    setConfirmCloseModal: React.Dispatch<
        React.SetStateAction<{
            open: boolean;
            callback?: () => void;
        }>
    >;
}) => {
    if (!job || !job.id) onClose();
    const [invoiceInfo, setInvoiceInfo] = useState(getInvoiceInfo(job.assignments));
    const [loadingThanksMessage, setLoadingThanksMessage] = useState(true);
    const [thanksMessageWords, setThanksMessageWords] = useState(job.thanksMessage ? job.thanksMessage.split(' ').filter((s) => s.trim().length > 0).length : 0);
    const sentTo = job.sentTo.includes('client') && job.sentTo.includes('barn') ? 'both' : job.sentTo.includes('client') ? 'client' : job.sentTo.includes('barn') ? 'barn' : 'both';
    const originalSendInvoiceTo = useRef<'client' | 'barn' | 'both'>(sentTo);
    const originalThanksMessage = useRef(job.thanksMessage && job.thanksMessage.length > 0 ? job.thanksMessage : '');
    const defaultThanksMessage = useRef('');
    const [editView, setEditView] = useState(true);

    const [thanksMessage, setThanksMessage] = useState(job.thanksMessage && job.thanksMessage.length > 0 ? job.thanksMessage : '');
    const [sendInvoiceTo, setSendInvoiceTo] = useState<'client' | 'barn' | 'both'>(sentTo);
    const [charges, setCharges] = useState<{ id: string; assignmentId: string; name: string; amount: number; horseName: string }[]>([]);
    const [removedCharges, setRemovedCharges] = useState<{ id: string; amount: number }[]>([]);
    const [removedServices, setRemovedServices] = useState<{ serviceId: string; day: Date; amount: number; horseName: string }[]>([]);

    const [loadingResend, setLoadingResend] = useState(false);

    useEffect(() => {
        setInvoiceInfo(getInvoiceInfo(job.assignments));
    }, [job]);

    const [loadingDetails, setLoadingDetails] = useState(true);
    const [hasPayoutInfo, setHasPayoutInfo] = useState(false);

    useEffect(() => {
        const getUserInfo = async () => {
            setLoadingDetails(true);
            setLoadingThanksMessage(true);
            const user = await getUserById(userId);

            if (user && ((user.venmo && user.venmoEnabled) || user.zelle !== 'disabled')) setHasPayoutInfo(true);
            if (user && user.thanksMessage) defaultThanksMessage.current = user.thanksMessage;

            console.log(invoiceInfo);

            setLoadingDetails(false);
            setLoadingThanksMessage(false);
        };

        getUserInfo();
    }, [job.id]);

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

    const handleResend = async () => {
        console.log(thanksMessage);
        console.log(removedCharges);
        console.log(charges);
        console.log(sendInvoiceTo);
        console.log(removedServices);
        setLoadingResend(true);

        const res = await resendInvoice({ jobId: job.id, sendInvoiceTo, thanksMessage, newCharges: charges, removedCharges, removedServices });

        if (res.success) {
            successToast('Successfully resent invoice');
            onClose();
        } else {
            failToast('Unable to resend invoice');
        }

        setLoadingResend(false);
    };

    const addChargeFunction = (id: string, name: string, amount: number) => {
        if (id && id.length > 0 && name && amount) {
            let horseName = '';

            Object.keys(invoiceInfo.horseAssignmentIds).forEach((key) => {
                if (invoiceInfo.horseAssignmentIds[key] === id) horseName = key;
            });

            console.log(horseName, id);

            if (horseName.length > 0) setCharges((prev) => [...prev, { id: generateId(14), assignmentId: id, name, amount, horseName }]);
        }
    };

    return loadingDetails ? (
        <div className='w-full h-48 flex items-center justify-center'>
            <span className='loader-primary'></span>
        </div>
    ) : job.id.length > 0 && role === 'braider' && hasPayoutInfo ? (
        <div>
            <h1 className='text-3xl @min-[300px]/check-completed:text-[33px] leading-[1.05] @min-[520px]/check-completed:text-4xl font-lusitana font-bold text-gray-900'>
                Adjust & Resend Invoice
            </h1>
            <div className='text-[15px] @min-[520px]/check-completed:text-[17px] text-gray-800 font-figtree mt-2'>
                <p className='font-semibold'>
                    This action will resend an invoice
                    {sendInvoiceTo === 'both'
                        ? ' to the barn and related horse owners'
                        : sendInvoiceTo === 'barn'
                          ? ' to the barn'
                          : sendInvoiceTo === 'client'
                            ? ' to the related horse owners'
                            : ''}
                    .
                </p>
                <p className='mt-2'>
                    You may resend an invoice if you have not yet received payment from the barn or their clients &ndash; please open your Venmo/Zelle to verify that you have not been
                    compensated yet.
                </p>

                <span className='flex items-start gap-2 mt-4 mb-2'>
                    <button
                        type='button'
                        onClick={() => setSendInvoiceTo((prev) => (prev === 'both' ? 'client' : prev === 'client' ? 'both' : prev === 'barn' ? 'barn' : 'barn'))}
                        disabled={sendInvoiceTo === 'barn'}
                        className={cn(
                            'p-px cursor-pointer border rounded-md transition-all outline-none shadow-sm disabled:cursor-not-allowed disabled:opacity-80',
                            sendInvoiceTo === 'barn' || sendInvoiceTo === 'both' ? 'bg-primary border-primary' : 'bg-background hover:bg-gray-50 border-gray-400',
                        )}
                    >
                        <Check className={cn('transition-all w-4 h-4 text-background')} strokeWidth={2.5} />
                    </button>
                    <span className={cn('text-sm -mt-px transition-all font-medium', sendInvoiceTo === 'barn' || sendInvoiceTo === 'both' ? 'text-primary' : 'text-gray-600')}>
                        Send invoice to the barn {invoiceInfo.barnOwnerName && invoiceInfo.barnOwnerName.trim().length > 0 ? ` (${invoiceInfo.barnOwnerName})` : ''}
                    </span>
                </span>
                <span className='flex items-start gap-2 mt-2 mb-4'>
                    <button
                        type='button'
                        onClick={() => setSendInvoiceTo((prev) => (prev === 'both' ? 'barn' : prev === 'barn' ? 'both' : prev === 'client' ? 'client' : 'client'))}
                        disabled={sendInvoiceTo === 'client'}
                        className={cn(
                            'p-px cursor-pointer border rounded-md transition-all outline-none shadow-sm disabled:cursor-not-allowed disabled:opacity-80',
                            sendInvoiceTo === 'client' || sendInvoiceTo === 'both' ? 'bg-primary border-primary' : 'bg-background hover:bg-gray-50 border-gray-400',
                        )}
                    >
                        <Check className={cn('transition-all w-4 h-4 text-background')} strokeWidth={2.5} />
                    </button>
                    <span className={cn('text-sm -mt-px transition-all font-medium', sendInvoiceTo === 'client' || sendInvoiceTo === 'both' ? 'text-primary' : 'text-gray-600')}>
                        Send the invoice to horse owners{' '}
                        {invoiceInfo.horseOwnerNames.length > 0 ? (
                            <>
                                <span>(</span>
                                {invoiceInfo.horseOwnerNames.map((name, index) => (
                                    <span key={name + index}>
                                        {index === invoiceInfo.horseOwnerNames.length - 1 && invoiceInfo.horseOwnerNames.length !== 1 ? 'and ' : ''}
                                        {name}
                                        {index !== invoiceInfo.horseOwnerNames.length - 1 && invoiceInfo.horseOwnerNames.length > 2
                                            ? ', '
                                            : index !== invoiceInfo.horseOwnerNames.length - 1
                                              ? ' '
                                              : ''}
                                    </span>
                                ))}
                                <span>)</span>
                            </>
                        ) : (
                            ''
                        )}
                    </span>
                </span>
                {/* <AnimatePresence>
                    {originalSendInvoiceTo.current && originalSendInvoiceTo.current !== sendInvoiceTo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setNewAutoInvoiceSendPreferences()}
                            className='text-sm uppercase ml-1 flex items-center gap-1 bg-primary/10 py-0.5 px-2 rounded-full hover:bg-primary/5 transition-colors cursor-pointer'
                        >
                            {loadingAutoSendInvoice ? <Loader2 className='animate-spin text-primary w-4 h-4' /> : <></>}
                            {loadingAutoSendInvoice ? 'Loading...' : 'Set New Send Preferences'}
                        </motion.div>
                    )}
                </AnimatePresence> */}
            </div>
            <div className='flex flex-col gap-2 mt-4'>
                <p className='font-figtree text-gray-500 font-bold tracking-wide uppercase text-[15.5px]'>Preview & Adjust Invoice</p>
                <div className='flex items-center gap-2'>
                    <div
                        onClick={() => setEditView((prev) => !prev)}
                        className={cn('rounded-full cursor-pointer transition-all shadow-sm w-10 px-1 py-[12px] relative', editView ? 'bg-primary-light' : 'bg-gray-300')}
                    >
                        <motion.div
                            initial={{ left: '4px', right: 'auto' }}
                            animate={editView ? { left: 'auto', right: '4px' } : { left: '4px', right: 'auto' }}
                            transition={{ duration: 0.2 }}
                            className='absolute bg-white rounded-full w-3.5 h-3.5 top-1/2 translate-y-[-50%]'
                        />
                    </div>
                    <span className={cn('font-figtree transition-all uppercase text-sm font-semibold', editView ? 'text-primary' : 'text-gray-400')}>Edit Mode</span>
                </div>
                <div className='w-full font-figtree border border-gray-50 p-1.5 shadow-sm rounded-[14px] text-primary font-bold'>
                    <div className='flex items-center gap-3 flex-wrap'>
                        <div className='font-lusitana text-3xl py-2 px-4 bg-primary-light/30 border border-primary shadow-sm rounded-[14px]'>
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                            }).format(
                                invoiceInfo.earnings +
                                    charges.reduce((acc, charge) => acc + charge.amount, 0) -
                                    removedCharges.reduce((acc, charge) => acc + charge.amount, 0) -
                                    removedServices.reduce((acc, s) => acc + s.amount, 0),
                            )}
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
                            <div className='mx-1 @min-[290px]/check-completed:mx-3 mt-2 space-y-2'>
                                {Object.entries(invoiceInfo.horseDetails)
                                    .sort(([aName], [bName]) => aName.split('/////')[0].localeCompare(bName.split('/////')[0]))
                                    .map(([horseName, serviceDetails], i) => (
                                        <div key={horseName + i} className='p-1.5 rounded-xl border border-violet-200'>
                                            <span className='font-figtree ml-1 my-3 text-violet-400 font-bold text-[15px]'>
                                                {horseName.split('/////')[0]}&nbsp;{horseName.split('/////')[1]}
                                            </span>
                                            <div>
                                                <div className='ml-2'>
                                                    <ul className='mt-1'>
                                                        {Object.entries(serviceDetails).map(([service, { days, price, serviceId }], j) => {
                                                            const updatedPrice =
                                                                price -
                                                                days.reduce(
                                                                    (acc, day) =>
                                                                        acc +
                                                                        removedServices.filter(
                                                                            (s) => s.serviceId === serviceId && s.day.getTime() === day.getTime() && s.horseName === horseName,
                                                                        ).length *
                                                                            (removedServices.find((s) => s.serviceId === serviceId)?.amount || 0),
                                                                    0,
                                                                );

                                                            return (
                                                                <Fragment key={j + service + price}>
                                                                    <li
                                                                        className={cn(
                                                                            'mb-0.5 font-normal text-violet-950 text-sm flex items-start gap-1.5',
                                                                            updatedPrice === 0 ? 'opacity-30' : '',
                                                                        )}
                                                                    >
                                                                        <CheckCircle className='min-w-3.5 h-3.5 w-fit flex mt-1' strokeWidth={2.25} />
                                                                        <span>
                                                                            <span className='font-bold'>
                                                                                {service}
                                                                                {!editView && ' - '}
                                                                            </span>
                                                                            {!editView &&
                                                                                days.map((day, k) => (
                                                                                    <span
                                                                                        key={k + day.getTime()}
                                                                                        className={
                                                                                            removedServices.some(
                                                                                                (s) =>
                                                                                                    s.serviceId === serviceId &&
                                                                                                    s.day.getTime() === day.getTime() &&
                                                                                                    s.horseName === horseName,
                                                                                            ) && updatedPrice !== 0
                                                                                                ? 'opacity-30'
                                                                                                : ''
                                                                                        }
                                                                                    >
                                                                                        {format(calendarDateToLocal(day), 'EEEE')}
                                                                                        {k === days.length - 1 ? '' : ', '}
                                                                                    </span>
                                                                                ))}{' '}
                                                                            {!editView &&
                                                                                `(${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(updatedPrice)})`}
                                                                        </span>
                                                                    </li>
                                                                    {editView && (
                                                                        <li className='pl-5 font-normal text-violet-950 text-sm'>
                                                                            {days.map((day, k) => {
                                                                                const removed = removedServices.some(
                                                                                    (s) => s.serviceId === serviceId && s.day.getTime() === day.getTime() && s.horseName === horseName,
                                                                                );
                                                                                return (
                                                                                    <div key={k + day.getTime()} className={cn('flex items-center gap-1 mb-1')}>
                                                                                        <div className={cn('transition-all', removed ? 'opacity-30' : '')}>
                                                                                            {k + 1}) {format(calendarDateToLocal(day), 'EEEE, MMM co')} (
                                                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                                                                                price / days.length,
                                                                                            )}
                                                                                            )
                                                                                        </div>

                                                                                        {removed ? (
                                                                                            <ArchiveRestore
                                                                                                onClick={() =>
                                                                                                    setRemovedServices((prev) =>
                                                                                                        prev.filter(
                                                                                                            (s) =>
                                                                                                                !(
                                                                                                                    s.serviceId === serviceId &&
                                                                                                                    s.day.getTime() === day.getTime() &&
                                                                                                                    s.horseName === horseName
                                                                                                                ),
                                                                                                        ),
                                                                                                    )
                                                                                                }
                                                                                                className='min-w-3.5 h-3.5 w-fit cursor-pointer text-primary'
                                                                                                strokeWidth={2.25}
                                                                                            />
                                                                                        ) : (
                                                                                            <Trash2
                                                                                                onClick={() =>
                                                                                                    setRemovedServices((prev) => [
                                                                                                        ...prev,
                                                                                                        { serviceId, day, amount: price / days.length, horseName },
                                                                                                    ])
                                                                                                }
                                                                                                className='min-w-3.5 h-3.5 w-fit cursor-pointer text-red-500'
                                                                                                strokeWidth={2.25}
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </li>
                                                                    )}
                                                                </Fragment>
                                                            );
                                                        })}
                                                        {invoiceInfo.horseExpenses !== undefined &&
                                                            invoiceInfo.horseExpenses[horseName] !== undefined &&
                                                            invoiceInfo.horseExpenses[horseName].length > 0 &&
                                                            invoiceInfo.horseExpenses[horseName].map(
                                                                (expense, i) =>
                                                                    !removedCharges.some((charge) => charge.id === expense.id) && (
                                                                        <li
                                                                            key={i + expense.name + expense.amount}
                                                                            className='mb-0.5 text-amber-600 font-bold text-sm flex items-center gap-1'
                                                                        >
                                                                            <MinusCircle className='min-w-3.5 h-3.5 w-fit' strokeWidth={2.25} />
                                                                            <span>
                                                                                {expense.name} -{' '}
                                                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expense.amount)}
                                                                            </span>
                                                                            {editView && (
                                                                                <Trash2
                                                                                    onClick={() => setRemovedCharges((prev) => [...prev, { id: expense.id, amount: expense.amount }])}
                                                                                    className='min-w-3.5 h-3.5 w-fit cursor-pointer text-red-500'
                                                                                    strokeWidth={2.25}
                                                                                />
                                                                            )}
                                                                        </li>
                                                                    ),
                                                            )}
                                                        {charges.filter((c) => c.horseName === horseName).length > 0 &&
                                                            charges
                                                                .filter((c) => c.horseName === horseName)
                                                                .map((expense) => (
                                                                    <li
                                                                        key={i + expense.name + expense.amount}
                                                                        className='mb-0.5 text-amber-600 font-bold text-sm flex items-center gap-1'
                                                                    >
                                                                        <MinusCircle className='min-w-3.5 h-3.5 w-fit' strokeWidth={2.25} />
                                                                        <span>
                                                                            {expense.name} -{' '}
                                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expense.amount)}
                                                                        </span>
                                                                        {editView && (
                                                                            <Trash2
                                                                                onClick={() => setCharges((prev) => prev.filter((charge) => charge.id !== expense.id))}
                                                                                className='min-w-3.5 h-3.5 w-fit cursor-pointer text-red-500'
                                                                                strokeWidth={2.25}
                                                                            />
                                                                        )}
                                                                    </li>
                                                                ))}
                                                        {editView && (
                                                            <li
                                                                onClick={() => handleOpenAddChargeModal(invoiceInfo.horseAssignmentIds[horseName], addChargeFunction)}
                                                                className='text-amber-600 w-fit cursor-pointer hover:bg-amber-100 transition-all text-sm px-3 py-0.5 border border-amber-100 bg-amber-50 rounded-full mt-3'
                                                            >
                                                                Add Custom Expense
                                                            </li>
                                                        )}
                                                    </ul>
                                                    <p className='text-sm px-3 py-0.5 bg-violet-50 w-fit rounded-full border border-violet-100 text-violet-900 mt-2 mb-1'>
                                                        Subtotal:{' '}
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                                            Object.entries(serviceDetails).reduce((acc, [service, { price }]) => acc + price, 0) +
                                                                (invoiceInfo.horseExpenses !== undefined && invoiceInfo.horseExpenses[horseName] !== undefined
                                                                    ? invoiceInfo.horseExpenses[horseName].reduce(
                                                                          (acc, expense) => acc + (removedCharges.some((charge) => charge.id === expense.id) ? 0 : expense.amount),
                                                                          0,
                                                                      ) +
                                                                      charges.filter((charge) => charge.horseName === horseName).reduce((acc, charge) => acc + charge.amount, 0) -
                                                                      removedServices.filter((s) => s.horseName === horseName).reduce((acc, s) => acc + s.amount, 0)
                                                                    : 0),
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                    <div className='ml-1'>
                        <p className='font-figtree text-primary font-bold tracking-wide uppercase text-sm mt-3'>Thank-you Message (optional)</p>
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
                                {defaultThanksMessage.current.length > 0 && defaultThanksMessage.current.trim() !== thanksMessage.trim() && (
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
                    onClick={() => {
                        if (charges.length > 0 || removedCharges.length > 0 || originalSendInvoiceTo.current !== sendInvoiceTo || removedServices.length > 0)
                            setConfirmCloseModal({ open: true, callback: onClose });
                        else onClose();
                    }}
                    className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                >
                    Cancel
                </button>
                <button
                    onClick={handleResend}
                    disabled={loadingResend}
                    className='font-figtree disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                >
                    {loadingResend ? 'Loading...' : 'Resend Invoice'}
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

export const InvoiceHistoryModal = ({ job, role, onClose }: { job: any; role: string; onClose: () => void }) => {
    const invoiceInfo = getInvoiceInfo(job.assignments);
    if (!job.sentTo || job.sentTo.length === 0) job.sentTo = ['barn', 'client'];

    return job.id && role === 'braider' && job.invoiceSentAt && invoiceInfo ? (
        <div>
            <h1 className='text-3xl @min-[300px]/check-completed:text-[33px] leading-[1.05] @min-[520px]/check-completed:text-4xl font-lusitana font-bold text-gray-900'>
                Invoice History
            </h1>
            <div className='text-[15px] @min-[520px]/check-completed:text-[17px] text-gray-800 font-figtree mt-2'>
                <p className='mt-2'>
                    This is a snapshot of the invoice sent to
                    {job.sentTo.includes('barn')
                        ? ` the barn
                    ${invoiceInfo.barnOwnerName && invoiceInfo.barnOwnerName.trim().length > 0 ? ` (${invoiceInfo.barnOwnerName})` : ''}`
                        : ''}
                    {job.sentTo.includes('barn') && job.sentTo.includes('client') ? ' and their' : ''}
                    {job.sentTo.includes('client') ? ' clients ' : ''}
                    {job.sentTo.includes('client') && invoiceInfo.horseOwnerNames.length > 0 ? (
                        <>
                            <span>(</span>
                            {invoiceInfo.horseOwnerNames.map((name, index) => (
                                <span key={name + index}>
                                    {index === invoiceInfo.horseOwnerNames.length - 1 && invoiceInfo.horseOwnerNames.length !== 1 ? 'and ' : ''}
                                    {name}
                                    {index !== invoiceInfo.horseOwnerNames.length - 1 && invoiceInfo.horseOwnerNames.length > 2
                                        ? ', '
                                        : index !== invoiceInfo.horseOwnerNames.length - 1
                                          ? ' '
                                          : ''}
                                </span>
                            ))}
                            <span>)</span>
                        </>
                    ) : (
                        ''
                    )}
                    .
                </p>
            </div>
            <div className='flex flex-col gap-2 mt-4'>
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
                                {format(job.invoiceSentAt, 'Pp')}
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
                            <div className='mx-1 @min-[290px]/check-completed:mx-3 mt-2 space-y-2'>
                                {Object.entries(invoiceInfo.horseDetails)
                                    .sort(([aName], [bName]) => aName.split('/////')[0].localeCompare(bName.split('/////')[0]))
                                    .map(([horseName, serviceDetails], i) => (
                                        <div key={horseName + i} className='p-1.5 rounded-xl border border-violet-200'>
                                            <span className='font-figtree ml-1 my-3 text-violet-400 font-bold text-[15px]'>
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
                                                                </li>
                                                            ))}
                                                    </ul>
                                                    <p className='text-sm px-3 py-0.5 bg-violet-50 w-fit rounded-full border border-violet-100 text-violet-900 mt-2 mb-1'>
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
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                    <div className='ml-1'>
                        <p className='font-figtree text-primary font-bold tracking-wide uppercase text-sm mt-3'>Thank-you Message (optional)</p>
                        <p className='font-figtree text-primary font-semibold text-[13px] mt-0.5'>Write a custom thank-you message for your clients to see in the invoice.</p>
                        <div className='w-full mt-2 font-medium text-primary-dark bg-primary/15 focus:bg-primary/5 outline-none shadow-sm border h-[90px] max-h-[90px] min-h-[42px] overflow-y-auto border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'>
                            {job.thanksMessage}
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={onClose}
                className='font-figtree mt-4 cursor-pointer w-full font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
            >
                Close
            </button>
        </div>
    ) : (
        <></>
    );
};

const getInvoiceInfo = (assignments: any[]) => {
    const validAssignments = assignments
        .filter((a) => !a.canceledAt && (a.status === 'completed' || a.status === 'accepted') && a.services.length !== a.canceledServiceIds.length)
        .sort((a, b) => a.assignmentDate.getTime() - b.assignmentDate.getTime());

    const horseOwnerNames: string[] = [];
    let barnOwnerName: string = '';
    const horseDetails: Record<string, Record<string, { days: Date[]; price: number; serviceId: string }>> = {};
    const horseExpenses: Record<string, { name: string; id: string; amount: number }[]> = {};
    const horseAssignmentIds: Record<string, string> = {};
    for (const horse of validAssignments) {
        if (horse && horse.horse && horse.horse.client && horse.horse.client.name && !horseOwnerNames.includes(horse.horse.client.name)) horseOwnerNames.push(horse.horse.client.name);
        if (barnOwnerName === '' && horse && horse.job && horse.job.barn && horse.job.barn.name) barnOwnerName = horse.job.barn.name;

        const showName = horse.horse.showName;
        const barnName = horse.horse.barnName;
        const nameKey = `${showName}/////(${barnName})`;

        if (!horseExpenses[nameKey]) horseExpenses[nameKey] = [];
        if (horse.customCharges.length > 0) horseExpenses[nameKey].push(...horse.customCharges.map((c: any) => ({ name: c.name, amount: c.amount, id: c.id })));

        horseAssignmentIds[nameKey] = horse.id;

        if (!horseDetails[nameKey]) horseDetails[nameKey] = {};

        for (const service of horse.services) {
            if (!horse.canceledServiceIds.includes(service.id)) {
                const serviceName = service.name;
                if (!horseDetails[nameKey][serviceName]) horseDetails[nameKey][serviceName] = { days: [], price: 0, serviceId: '' };

                horseDetails[nameKey][serviceName].days.push(horse.assignmentDate);
                horseDetails[nameKey][serviceName].days.sort((a, b) => a.getTime() - b.getTime());
                horseDetails[nameKey][serviceName].price += service.priceUSD;
                if (horseDetails[nameKey][serviceName].serviceId.length === 0) horseDetails[nameKey][serviceName].serviceId = service.id;
            }
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
        horseAssignmentIds,
        horseOwnerNames: horseOwnerNames.filter((name) => name !== null && name !== undefined && name.trim() !== ''),
        barnOwnerName,
    };
};
