'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus,
    Calendar,
    Clock,
    User,
    MessageCircle,
    Check,
    ChevronDown,
    X,
    MapPin,
    PlusCircle,
    MinusCircle,
    CircleArrowRight,
    Calendar as CalendarIcon,
    Play,
    Trash2,
    ChevronRight,
    CheckCircle2,
    CalendarCheck,
    Info,
    ChevronsRight,
    Square,
    CheckSquare,
    CircleCheck,
    Mail,
    Phone,
    Copy,
    BadgeDollarSign,
    Send,
    Loader2,
    Loader,
    CloudCheck,
    CloudBackup,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    getJobs,
    createJob,
    addNote,
    cancelJob,
    getBraiderUsageAction,
    deleteJob,
    getBraiderData,
    toggleServiceCompletion,
    submitJob,
    markJobCompleted,
    getUserByEmail,
    markJobReview,
    revertJobReview,
} from '@/app/actions/jobs';
import { getRelations } from '@/app/actions/barn-relations';
import Modal from '../../Modal';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format, eachDayOfInterval, isSameDay, addHours } from 'date-fns';
import { JobDetailSubpage } from './JobDetailSubpage';
import { ViewShowDetailsModal } from './RequestWorkModals';
import { createPortal } from 'react-dom';
import { getTeamMembers } from '@/app/actions/team';
import { failToast, successToast, scrollVariants, loadingToast } from '@/app/context';
import { markAllMessagesAsRead, markAllTypeAsRead } from '@/app/actions/notifications';
import { NotificationType, SubscriptionTier } from '@prisma/client';
import { useNotifications } from '@/app/NotificationContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { addShowToCalendar } from '@/app/actions/calendar';
import DatePicker from '../DatePicker';
import { getIDByEmail } from '@/app/actions/join';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { formatPhoneNumber } from '../_settings/Settings';
import RequestWorkSubpage from './RequestWorkSubpage';
import { parseUTCToLocal } from '@/lib/date-utils';
import { Tab } from '../_braider/BraiderDashboard';
import { changeThanksMessage } from '@/app/actions/settings';

export type Job = {
    id: string;
    status: 'editing' | 'submitted' | 'reviewing' | 'completed';
    braider: { name: string; image?: string; email: string; id: string; services: { id: string; name: string; priceUSD: number; duration: number }[] };
    barn: { name: string; image?: string; email: string; id: string };
    subcontractors: { name: string; image?: string; email: string; id: string }[];
    show: { id: string; name: string; city: string; state: string; country: string; startDate: Date; endDate: Date; invites: any[] };
    assignments: {
        id: string;
        horse: {
            id: string;
            showName: string;
            barnName: string;
            profileImage: string;
            gender: string;
            notes: string;
            color: string;
            client: { name: string; email: string; phoneNumber?: string };
        };
        client: { name: string; email: string; phoneNumber?: string };
        services: { id: string; name: string; priceUSD: number }[];
        completedServiceIds: string[];
        canceledServiceIds: string[];
        canceledAt?: Date;
        subcontractor: { name: string; image?: string; email: string; id: string } | null;
        status: 'pending' | 'accepted' | 'denied' | 'canceled' | 'completed';
        subcontractorStatus: 'braider_control' | 'delegated' | 'pending' | 'redirected';
        paidAt: Date;
        assignmentDate: Date;
    }[];
    notes: { id: string; content: string; createdAt: Date; author: { name: string; image?: string } }[];
    invoiceSentAt?: Date;
    assignedAt: Date;
    createdAt: Date;
};

export const statusColors = {
    editing: 'bg-gray-100 text-gray-700 border-gray-200',
    submitted: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    accepted: 'bg-blue-100 text-blue-700 border-blue-200',
    denied: 'bg-red-100 text-red-700 border-red-200',
    canceled: 'bg-gray-100 text-gray-700 border-gray-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    reviewing: 'bg-purple-100 text-purple-700 border-purple-200',
};

const Tasks = ({
    role,
    userEmail,
    setSelectedPage,
    subscriptionTier,
    requestingJob,
    setRequestingJob,
    selectedBraider,
    setSelectedBraider,
    setSettingsOpen,
    setUnsavedRequest,
}: {
    role: string;
    userEmail: string;
    setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
    subscriptionTier?: SubscriptionTier;
    requestingJob?: Job | null | 'creating';
    setRequestingJob?: React.Dispatch<React.SetStateAction<Job | null | 'creating'>>;
    selectedBraider?: any;
    setSelectedBraider?: React.Dispatch<React.SetStateAction<any>>;
    setSettingsOpen?: (page: Tab) => void;
    setUnsavedRequest?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [notesJob, setNotesJob] = useState<Job | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<{ open: boolean; show: any | null; onSelect: () => void }>({ open: false, show: null, onSelect: () => {} });
    const [cancelJobModal, setCancelJobModal] = useState(false);
    const [showCanceledEvents, setShowCanceledEvents] = useState(false);
    const [showCompletedEvents, setShowCompletedEvents] = useState(false);
    const [checkMarkedCompleted, setCheckMarkedCompleted] = useState<{ open: boolean; id: string; assignments: any[] }>({ open: false, id: '', assignments: [] });
    const [selectedHorse, setSelectedHorse] = useState<any | null>(null);
    const [exactTime, setExactTime] = useState(new Date());
    const [braiderUsage, setBraiderUsage] = useState<{ count: number; limit: number; period: string } | null>(null);

    useEffect(() => {
        const getUsages = async () => {
            const res = await getBraiderUsageAction(userEmail, new Date().getTimezoneOffset());
            if (res) setBraiderUsage(res);
        };

        if (role === 'braider') getUsages();
    }, [userEmail, role, jobs]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!checkMarkedCompleted.open) return;
            setExactTime(new Date());
        }, 60000);

        return () => {
            clearInterval(interval);
        };
    }, [checkMarkedCompleted]);

    const loadJobs = useCallback(async () => {
        const data = await getJobs(userEmail, role);

        setJobs(data as any);
        setLoading(false);
    }, [userEmail, role]);

    useAutoRefresh(loadJobs);

    const handleCancelJob = async (id: string) => {
        const res = await cancelJob(id, role);

        if (res.success) {
            successToast('Job canceled!');
            setCancelJobModal(false);
            setSelectedJob(null);
            const updated = await getJobs(userEmail, role);
            setJobs(updated as any);
        } else {
            failToast(res.error || 'Failed to cancel job');
        }
    };

    const handleCancelJobModal = () => {
        setCancelJobModal(true);
    };

    const { refreshCounts, unreadCounts } = useNotifications();

    useEffect(() => {
        const markRead = async () => {
            await markAllTypeAsRead(NotificationType.job_request);
            await markAllTypeAsRead(NotificationType.job_status_change);
            await markAllTypeAsRead(NotificationType.job_completed);
            await markAllTypeAsRead(NotificationType.horse_status_change);
            await markAllTypeAsRead(NotificationType.horse_sub_completed);
            refreshCounts();
        };

        markRead();
    }, [refreshCounts]);

    useEffect(() => {
        const markAsRead = async (id: string) => {
            await markAllMessagesAsRead(id);
            refreshCounts();
        };

        if (notesJob) markAsRead(notesJob.id);
    }, [notesJob]);

    useEffect(() => {
        const markAsRead = async (id: string) => {
            await markAllMessagesAsRead(id);
            refreshCounts();
        };

        if (selectedJob) markAsRead(selectedJob.id);
    }, [selectedJob]);

    const refreshJobs = async () => {
        const updated = await getJobs(userEmail, role);
        setJobs(updated as any);

        if (notesJob) {
            const updatedJob = (updated as any).find((j: Job) => j.id === notesJob.id);
            if (updatedJob) setNotesJob(updatedJob);
        }

        if (selectedJob) {
            const updatedJob = (updated as any).find((j: Job) => j.id === selectedJob.id);
            if (updatedJob) setSelectedJob(updatedJob);
        }
    };

    const handleMarkJobCompleted = async (jobID: string, thanksMessage: string) => {
        const res = await markJobCompleted(jobID, thanksMessage);
        if (res.success) {
            successToast('Invoice sent!');
            setCheckMarkedCompleted((prev) => ({ ...prev, open: false }));
            setSelectedJob(null);
            refreshJobs();
        } else {
            failToast('Failed to mark job as completed.');
        }
    };

    return (
        <>
            <div className='w-full font-figtree'>
                <AnimatePresence mode='wait'>
                    {!selectedJob && !requestingJob ? (
                        <motion.div
                            key='list'
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ type: 'spring', bounce: 0.4, duration: jobs.length > 0 ? 0.5 : 0 }}
                            className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-6 @container/tasks'
                        >
                            <header className='flex flex-col gap-4 @min-[400px]/tasks:gap-0 @min-[400px]/tasks:flex-row @min-[400px]/tasks:justify-between @min-[400px]/tasks:items-center'>
                                <div>
                                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>{role === 'barn' ? 'Services' : 'Tasks'}</h1>
                                    <p className='text-gray-500 font-figtree mt-1 @min-[400px]/tasks:mt-1.5'>Manage your braiding schedule and requests.</p>
                                </div>
                                {role === 'barn' && requestingJob !== undefined && setRequestingJob !== undefined && (
                                    <button
                                        onClick={() => setRequestingJob('creating')}
                                        className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-2 px-6 @min-[400px]/tasks:rounded-[20px] @min-[400px]/tasks:p-3 @min-[560px]/tasks:rounded-[10px] @min-[560px]/tasks:py-2 @min-[560px]/tasks:px-6 bg-primary-light text-background primary-border-hover'
                                    >
                                        <PlusCircle className='w-6 h-6' strokeWidth={2.5} />
                                        <span className='block @min-[400px]/tasks:hidden @min-[560px]/tasks:block'>Request Work</span>
                                    </button>
                                )}
                            </header>
                            {braiderUsage && braiderUsage.period !== 'unlimited' && (
                                <div className='w-full bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4'>
                                    <div className='flex justify-between items-end mb-2'>
                                        <div>
                                            <h3 className='font-bold text-gray-900'>Service Limit</h3>
                                            <p className='text-xs font-semibold text-gray-500'>
                                                {braiderUsage.count} / {braiderUsage.limit} horses serviced{' '}
                                                {braiderUsage.period === 'week' ? 'this week' : braiderUsage.period === 'day' ? 'today' : 'this week'}
                                            </p>
                                        </div>
                                        <span className='font-bold text-primary text-lg'>{Math.round((braiderUsage.count / braiderUsage.limit) * 100)}%</span>
                                    </div>
                                    <div className='w-full bg-gray-100 rounded-full h-3 overflow-hidden'>
                                        <motion.div
                                            className='bg-primary h-full rounded-full'
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((braiderUsage.count / braiderUsage.limit) * 100, 100)}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>
                            )}
                            {loading ? (
                                <div className='grid grid-cols-1 gap-4 animate-pulse'>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className='h-40 bg-gray-100 rounded-3xl' />
                                    ))}
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className='grid grid-cols-1'>
                                    {role === 'barn' && requestingJob !== undefined && setRequestingJob !== undefined ? (
                                        <div
                                            onClick={() => setRequestingJob('creating')}
                                            className='grid place-items-center text-center p-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                                        >
                                            <PlusCircle className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                                            <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-[17px] @min-[340px]/tasks:text-lg mt-2'>
                                                Request services from braiders.
                                            </p>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setSelectedPage(role === 'braider' ? 'Barns' : 'Team')}
                                            className='grid place-items-center text-center p-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                                        >
                                            <CircleArrowRight className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                                            <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-[17px] @min-[340px]/tasks:text-lg mt-2'>
                                                No upcoming jobs. Connect with {role === 'braider' ? 'barns' : 'braiders'} to get started.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className='grid grid-cols-1 gap-4'>
                                    {jobs.filter(
                                        (j) =>
                                            j.assignments.length > 0 &&
                                            !j.assignments.every((a) => a.status === 'canceled' || a.status === 'denied') &&
                                            !j.assignments.every((a) => a.paidAt),
                                    ).length === 0 &&
                                        (role === 'barn' && requestingJob !== undefined && setRequestingJob !== undefined ? (
                                            <div
                                                onClick={() => setRequestingJob('creating')}
                                                className='grid place-items-center text-center p-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                                            >
                                                <PlusCircle className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                                                <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-[17px] @min-[340px]/tasks:text-lg mt-2'>
                                                    Request services from braiders.
                                                </p>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => setSelectedPage(role === 'braider' ? 'Barns' : 'Team')}
                                                className='grid place-items-center text-center p-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                                            >
                                                <CircleArrowRight className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                                                <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-[17px] @min-[340px]/tasks:text-lg mt-2'>
                                                    No upcoming jobs. Connect with {role === 'braider' ? 'barns' : 'braiders'} to start getting paid.
                                                </p>
                                            </div>
                                        ))}
                                    {jobs
                                        .filter(
                                            (j) =>
                                                !j.assignments.every((a) => a.paidAt) &&
                                                (j.assignments.length === 0 || !j.assignments.every((a) => a.status === 'canceled' || a.status === 'denied')),
                                        )
                                        .sort(
                                            (a, b) =>
                                                Math.min(
                                                    ...a.assignments.map(
                                                        (assignment) => parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                    ),
                                                ) -
                                                Math.min(
                                                    ...b.assignments.map(
                                                        (assignment) => parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                    ),
                                                ),
                                        )
                                        .map((job) => (
                                            <JobCard
                                                key={job.id}
                                                job={job}
                                                role={role}
                                                userEmail={userEmail}
                                                setSelectedJob={setSelectedJob}
                                                setNotesJob={setNotesJob}
                                                refresh={refreshJobs}
                                                setSelectedPage={setSelectedPage}
                                                setCheckMarkedCompleted={setCheckMarkedCompleted}
                                                unreadCount={unreadCounts.byType[`new_message_${job.id}`]}
                                                setRequestingJob={setRequestingJob}
                                            />
                                        ))}
                                    {jobs.filter((j) => j.assignments.every((a) => a.paidAt)).length > 0 && jobs.filter((j) => !j.assignments.every((a) => a.paidAt)).length > 0 && (
                                        <div className='h-[0.5px] bg-gray-200 rounded-full' />
                                    )}
                                    {jobs
                                        .sort(
                                            (a, b) =>
                                                Math.min(
                                                    ...b.assignments.map(
                                                        (assignment) => parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                    ),
                                                ) -
                                                Math.min(
                                                    ...a.assignments.map(
                                                        (assignment) => parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                    ),
                                                ),
                                        )
                                        .filter((j) => j.assignments.every((a) => a.paidAt)).length > 0 && (
                                        <>
                                            <span
                                                onClick={() => setShowCompletedEvents((prev) => !prev)}
                                                className='font-figtree uppercase text-gray-400 font-semibold cursor-pointer hover:text-gray-500 transition-all flex items-center gap-2'
                                            >
                                                <div>Completed & Paid Services</div>{' '}
                                                <motion.div
                                                    initial={{ rotate: 0 }}
                                                    animate={showCompletedEvents ? { rotate: 180 } : { rotate: 0 }}
                                                    transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                                                >
                                                    <ChevronDown />
                                                </motion.div>
                                            </span>
                                            <AnimatePresence>
                                                {showCompletedEvents && (
                                                    <motion.div
                                                        className='grid grid-cols-1 gap-4'
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
                                                        animate={showCompletedEvents ? 'visible' : 'hidden'}
                                                        exit='hidden'
                                                    >
                                                        {jobs
                                                            .filter((j) => j.assignments.every((a) => a.paidAt))
                                                            .sort(
                                                                (a, b) =>
                                                                    Math.min(
                                                                        ...a.assignments.map(
                                                                            (assignment) =>
                                                                                parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                                        ),
                                                                    ) -
                                                                    Math.min(
                                                                        ...b.assignments.map(
                                                                            (assignment) =>
                                                                                parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                                        ),
                                                                    ),
                                                            )
                                                            .map((job) => (
                                                                <JobCard
                                                                    key={job.id}
                                                                    job={job}
                                                                    role={role}
                                                                    userEmail={userEmail}
                                                                    completed={true}
                                                                    setSelectedJob={setSelectedJob}
                                                                    setNotesJob={setNotesJob}
                                                                    refresh={refreshJobs}
                                                                    setSelectedPage={setSelectedPage}
                                                                    setCheckMarkedCompleted={setCheckMarkedCompleted}
                                                                    unreadCount={unreadCounts.byType[`new_message_${job.id}`]}
                                                                />
                                                            ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                    {jobs.filter((j) => j.assignments.length > 0 && j.assignments.every((a) => a.status === 'canceled' || a.status === 'denied')).length > 0 && (
                                        <>
                                            <span
                                                onClick={() => setShowCanceledEvents((prev) => !prev)}
                                                className='font-figtree uppercase text-gray-400 font-semibold cursor-pointer hover:text-gray-500 transition-all flex items-center gap-2'
                                            >
                                                <div>Canceled Events</div>{' '}
                                                <motion.div
                                                    initial={{ rotate: 0 }}
                                                    animate={showCanceledEvents ? { rotate: 180 } : { rotate: 0 }}
                                                    transition={{ duration: 0.5, type: 'spring', bounce: 0.5 }}
                                                >
                                                    <ChevronDown />
                                                </motion.div>
                                            </span>
                                            <AnimatePresence>
                                                {showCanceledEvents && (
                                                    <motion.div
                                                        className='grid grid-cols-1 gap-4'
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
                                                        animate={showCanceledEvents ? 'visible' : 'hidden'}
                                                        exit='hidden'
                                                    >
                                                        {jobs
                                                            .filter((j) => j.assignments.length > 0 && j.assignments.every((a) => a.status === 'canceled' || a.status === 'denied'))
                                                            .sort(
                                                                (a, b) =>
                                                                    Math.min(
                                                                        ...a.assignments.map(
                                                                            (assignment) =>
                                                                                parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                                        ),
                                                                    ) -
                                                                    Math.min(
                                                                        ...b.assignments.map(
                                                                            (assignment) =>
                                                                                parseUTCToLocal(assignment.assignmentDate)?.getTime() || new Date(assignment.assignmentDate).getTime(),
                                                                        ),
                                                                    ),
                                                            )
                                                            .map((job) => (
                                                                <JobCard
                                                                    key={job.id}
                                                                    job={job}
                                                                    canceled={true}
                                                                    userEmail={userEmail}
                                                                    role={role}
                                                                    setSelectedJob={setSelectedJob}
                                                                    setNotesJob={setNotesJob}
                                                                    refresh={refreshJobs}
                                                                    setSelectedPage={setSelectedPage}
                                                                    setCheckMarkedCompleted={setCheckMarkedCompleted}
                                                                    unreadCount={unreadCounts.byType[`new_message_${job.id}`]}
                                                                />
                                                            ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : requestingJob !== null &&
                      role === 'barn' &&
                      requestingJob !== undefined &&
                      setRequestingJob !== undefined &&
                      selectedBraider !== undefined &&
                      setSelectedBraider !== undefined &&
                      setUnsavedRequest !== undefined ? (
                        <motion.div
                            key='requesting'
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
                            className='w-full h-full'
                        >
                            <RequestWorkSubpage
                                job={requestingJob}
                                setSelectedHorse={setSelectedHorse}
                                role={role}
                                userEmail={userEmail}
                                onBack={() => setRequestingJob(null)}
                                refresh={refreshJobs}
                                selectedBraider={selectedBraider}
                                setSelectedBraider={setSelectedBraider}
                                setUnsavedRequest={setUnsavedRequest}
                            />
                        </motion.div>
                    ) : (
                        selectedJob && (
                            <motion.div
                                key='details'
                                initial={{ x: 100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -100, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
                                className='w-full h-full'
                            >
                                <JobDetailSubpage
                                    job={selectedJob}
                                    role={role}
                                    userEmail={userEmail}
                                    onBack={() => setSelectedJob(null)}
                                    refresh={refreshJobs}
                                    handleCancelJobModal={handleCancelJobModal}
                                    setSelectedHorse={setSelectedHorse}
                                    setCheckMarkedCompleted={setCheckMarkedCompleted}
                                    subscriptionTier={subscriptionTier}
                                />
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </div>

            <Modal
                isOpen={showDetailsModal.open}
                setIsOpen={(open: boolean) => setShowDetailsModal({ open: false, show: null, onSelect: () => {} })}
                className='bg-white p-0 w-full max-w-sm overflow-hidden rounded-[18px] primary-border-bold overflow-y-auto @container/show-details'
            >
                {showDetailsModal.show !== null && <ViewShowDetailsModal show={showDetailsModal.show} setShowDetailsModal={setShowDetailsModal} onSelect={showDetailsModal.onSelect} />}
            </Modal>

            <Modal isOpen={!!selectedHorse} setIsOpen={() => setSelectedHorse(null)} className='max-w-xl p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                {selectedHorse && <HorseDetailView horse={selectedHorse} onClose={() => setSelectedHorse(null)} />}
            </Modal>

            <Modal
                isOpen={cancelJobModal}
                setIsOpen={setCancelJobModal}
                closeOnOutsideClick={false}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative @container/check-request'
            >
                {selectedJob && (
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                        <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                            This action will cancel this job. Are you sure you want to proceed?
                            {role === 'barn' && ' However, you may request from the same show again if you change your mind.'}
                        </p>
                        <div className='grid @min-[325px]/check-request:grid-cols-2 @min-[325px]/check-request:gap-3 gap-2 mt-4'>
                            <button
                                onClick={() => setCancelJobModal(false)}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => handleCancelJob(selectedJob.id)}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                            >
                                Cancel Job
                            </button>
                        </div>
                    </div>
                )}
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
                    exactTime={exactTime}
                    role={role}
                    userEmail={userEmail}
                    setSettingsOpen={setSettingsOpen || ((page: Tab) => {})}
                />
            </Modal>

            <Modal isOpen={!!notesJob} setIsOpen={() => setNotesJob(null)} className='max-w-lg p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                {notesJob && <JobNotesModal job={notesJob} role={role} onClose={() => setNotesJob(null)} refresh={refreshJobs} />}
            </Modal>
        </>
    );
};

const getInvoiceInfo = (assignments: any[]) => {
    return {
        earnings: assignments.reduce((acc: number, a: any) => {
            const servicesTotal = a.services.filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).reduce((sAcc: number, s: any) => sAcc + s.priceUSD, 0);
            const customTotal = a.customCharges?.reduce((cAcc: number, c: any) => cAcc + c.amount, 0) || 0;
            return a.canceledAt ? acc : acc + servicesTotal + customTotal;
        }, 0),
        horses: assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length,
        // @ts-ignore
        services: assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0),
        clientBreakdown: assignments.reduce((acc: any, a: any) => {
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
    };
};

const CheckMarkedCompletedModal = ({
    checkMarkedCompleted,
    setCheckMarkedCompleted,
    handleMarkJobCompleted,
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
    }, [checkMarkedCompleted.open]);

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

    return loadingDetails ? (
        <div className='w-full h-48 flex items-center justify-center'>
            <span className='loader-primary'></span>
        </div>
    ) : checkMarkedCompleted.id.length > 0 && role === 'braider' && hasPayoutInfo ? (
        <div>
            <h1 className='text-3xl @min-[300px]/check-completed:text-[33px] leading-[1.05] @min-[520px]/check-completed:text-4xl font-lusitana font-bold text-gray-900'>
                Have you completed this service?
            </h1>
            <div className='text-[15px] @min-[520px]/check-completed:text-[17px] text-gray-800 font-figtree mt-2'>
                <p className='font-semibold'>This action will send an invoice to the barn and related horse owners.</p>
                <p className='mt-2'>
                    Payments occur outside of the ManeAccount platform, but we offer the ability to track them in the <span className='font-bold'>Invoices</span> panel. Please ensure
                    that all reported services were actually completed.
                </p>
            </div>
            <div className='flex flex-col gap-2 mt-4'>
                <p className='font-figtree text-gray-500 font-bold tracking-wide uppercase'>Invoice Preview</p>
                <div className='p-4 w-full font-figtree bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px] text-primary font-bold'>
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
                    <div className='ml-1'>
                        <p className='font-figtree text-purple-600 font-bold tracking-wide uppercase text-sm mt-3'>Client Breakdown</p>
                        {Object.values(invoiceInfo.clientBreakdown)
                            .sort((aGroup: any, bGroup: any) => aGroup.name.localeCompare(bGroup.name))
                            .map((group: any) => {
                                const groupTotal = group.assignments.reduce((acc: number, a: any) => {
                                    const servicesTotal = a.services
                                        .filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt)
                                        .reduce((acc: number, s: any) => acc + s.priceUSD, 0);
                                    const customTotal = a.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0);
                                    return acc + servicesTotal + customTotal;
                                }, 0);

                                if (groupTotal === 0) return null;

                                return (
                                    <div key={group.id} className='flex items-center py-2 pl-1 @min-[380px]/check-completed:p-3 gap-1 rounded-lg flex-wrap'>
                                        <div className='font-lusitana text-2xl py-1.5 px-3.5 bg-purple-200 border border-purple-400 text-purple-600 shadow-sm rounded-[14px]'>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(groupTotal)}
                                        </div>
                                        <div className='pl-1 w-[101%] @min-[315px]/check-completed:w-fit'>
                                            <p className='font-semibold text-[15px] text-purple-600'>{group.name}</p>
                                            <p className='text-[13px] font-normal text-purple-600'>{group.assignments.length} Horses</p>
                                        </div>
                                    </div>
                                );
                            })}
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

const JobCard = ({
    job,
    role,
    userEmail,
    setSelectedJob,
    setNotesJob,
    canceled = false,
    completed = false,
    refresh,
    setSelectedPage,
    setCheckMarkedCompleted,
    unreadCount,
    setRequestingJob,
}: {
    job: Job;
    role: string;
    userEmail: string;
    setSelectedJob: (j: Job) => void;
    setNotesJob: (j: Job) => void;
    canceled?: boolean;
    completed?: boolean;
    refresh: () => void;
    setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
    setCheckMarkedCompleted: React.Dispatch<React.SetStateAction<{ open: boolean; id: string; assignments: any[] }>>;
    unreadCount: number;
    setRequestingJob?: (j: Job | 'creating' | null) => void;
}) => {
    const completedNotPaid = !!job.invoiceSentAt && !job.assignments.every((a) => a.paidAt);

    const reviewingJob = job.status === 'reviewing';
    const isJobPending = job.assignments.some((a) => a.status === 'pending');
    const isJobAccepted = job.assignments.length > 0 && job.assignments.every((a) => a.status === 'accepted' || a.status === 'completed');
    const isJobDenied = job.assignments.length > 0 && job.assignments.every((a) => a.status === 'denied');
    const isJobCanceled = job.assignments.length > 0 && job.assignments.every((a) => a.status === 'canceled');
    const horsesCompleted = job.assignments
        .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
        .filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length && a.completedServiceIds.length === a.services.length - a.canceledServiceIds.length).length;

    // const handleMarkCompleted = (e: React.MouseEvent) => {
    //     e.stopPropagation();
    //     setCheckMarkedCompleted({
    //         open: true,
    //         id: job.id,
    //         assignments: job.assignments,
    //     });
    // };

    const handleSaveAndReview = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const loadingId = loadingToast('Saving job for review...');

        const res = await markJobReview(job.id);
        if (res.success) {
            successToast('Job saved for review!', loadingId);
            refresh();
        } else {
            failToast(res.error || 'Failed to save job for review', loadingId);
        }
    };

    const handleRevertReviewStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const loadingId = loadingToast('Reverting job review status...');

        const res = await revertJobReview(job.id);
        if (res.success) {
            successToast('Reverted job review! You are free to make changes again.', loadingId);
            refresh();
        } else {
            failToast(res.error || 'Failed to revert job review status', loadingId);
        }
    };

    const sendRequest = async () => {
        if (job.status !== 'editing' || setRequestingJob === undefined) return;

        const submitRes = await submitJob(job.id, new Date().getTimezoneOffset());
        if (submitRes.success) {
            successToast('Request submitted successfully');
            refresh();
        } else {
            failToast(submitRes.error || 'Failed to submit request');
        }
    };

    return (
        <div
            onClick={() => {
                if (job.status === 'editing' && setRequestingJob !== undefined) {
                    setRequestingJob(job);
                } else {
                    setSelectedJob(job);
                }
            }}
            className={cn(
                'bg-white p-5 @min-[450px]/tasks:p-6 relative rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col @min-[600px]/tasks:flex-row gap-4 justify-between items-start @min-[600px]/tasks:items-center @container/job-card',
                canceled
                    ? 'opacity-50'
                    : completed
                      ? 'opacity-60'
                      : completedNotPaid
                        ? 'bg-[#f2fcf7] border-primary-extra-light mt-2'
                        : job.status === 'editing'
                          ? 'opacity-70 border-red-200'
                          : reviewingJob
                            ? 'border-[1.5px] border-amber-200 bg-primary-extra-light mt-2'
                            : '',
            )}
        >
            <div className={cn('flex items-start gap-4 w-full @min-[600px]/tasks:w-auto', completedNotPaid ? 'opacity-60' : '', reviewingJob ? 'opacity-70' : '')}>
                <div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-figtree'>
                    {role === 'barn' ? (
                        job.braider?.image ? (
                            <Image src={job.braider.image} alt='Braider' width={48} height={48} className='rounded-full object-cover w-full h-full' />
                        ) : (
                            <div className='w-full h-full bg-primary/80 text-background flex items-center justify-center text-xl font-bold rounded-full'>{job.braider.name[0]}</div>
                        )
                    ) : job.barn?.image ? (
                        <Image src={job.barn.image} alt='Barn' width={48} height={48} className='rounded-full object-cover w-full h-full' />
                    ) : (
                        <div className='w-full h-full bg-primary/80 text-background flex items-center justify-center text-xl font-bold rounded-full'>
                            {job.barn?.name?.charAt(0) || '?'}
                        </div>
                    )}
                </div>
                <div className='flex flex-col gap-1 min-w-0 flex-1 font-figtree'>
                    <div className='flex items-center gap-x-2 flex-wrap min-w-0'>
                        <h3 className='font-bold text-lg text-gray-900 truncate min-w-0'>{job.show.name}</h3>
                        <span
                            className={cn(
                                'text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide my-1',
                                statusColors[
                                    job.assignments.every((a) => a.paidAt)
                                        ? 'paid'
                                        : job.status === 'reviewing'
                                          ? 'reviewing'
                                          : horsesCompleted > 0 ||
                                              (role === 'subcontractor' &&
                                                  job.assignments.filter((a) => a.subcontractor?.email === userEmail && a.subcontractorStatus === 'pending').length === 0)
                                            ? 'accepted'
                                            : job.status
                                ],
                            )}
                        >
                            {role !== 'subcontractor'
                                ? job.assignments.every((a) => a.paidAt)
                                    ? 'paid'
                                    : job.status === 'editing'
                                      ? 'drafting'
                                      : job.status === 'reviewing'
                                        ? 'under review'
                                        : isJobPending
                                          ? `${job.assignments.filter((a) => a.status === 'pending').length}/${job.assignments.filter((a) => a.status !== 'denied' && a.status !== 'canceled').length} horses pending`
                                          : isJobAccepted && horsesCompleted === 0 && job.assignments.some((a) => !a.canceledAt)
                                            ? 'all accepted'
                                            : horsesCompleted > 0
                                              ? `${horsesCompleted}/${job.assignments.filter((a) => !a.canceledAt && (a.status === 'accepted' || a.status === 'completed') && a.services.length !== a.canceledServiceIds.length).length} horses completed`
                                              : isJobDenied || job.assignments.every((a) => a.canceledAt || a.status === 'canceled' || a.status === 'denied')
                                                ? 'denied'
                                                : isJobCanceled
                                                  ? 'canceled'
                                                  : job.status === 'submitted'
                                                    ? 'all accepted'
                                                    : job.status
                                : job.assignments.every((a) => a.paidAt)
                                  ? 'paid'
                                  : isJobDenied
                                    ? 'denied'
                                    : isJobCanceled
                                      ? 'canceled'
                                      : job.assignments.filter((a) => a.subcontractor?.email === userEmail && a.subcontractorStatus === 'pending').length > 0
                                        ? `${job.assignments.filter((a) => a.subcontractor?.email === userEmail && a.subcontractorStatus === 'pending').length}/${job.assignments.filter((a) => a.subcontractor?.email === userEmail).length} horses pending`
                                        : `${horsesCompleted}/${job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length && a.subcontractor?.email === userEmail).length} horses completed`}
                        </span>
                    </div>
                    <p className='text-gray-500 text-sm -mt-[3px]'>{role === 'barn' ? `With ${job.braider.name}` : `Barn: ${job.barn.name}`}</p>

                    <div className='flex items-center gap-1 flex-wrap'>
                        <div className='flex mr-1 items-center gap-x-2 gap-y-0.5 text-sm text-gray-500 font-medium flex-wrap'>
                            <span className='flex items-center gap-1'>
                                <Calendar className='w-4 h-4' />
                                {job.assignments.length > 0 ? (
                                    <>
                                        {(() => {
                                            const dates = job.assignments.map((a) => parseUTCToLocal(a.assignmentDate)?.getTime() || new Date(a.assignmentDate).getTime());
                                            const min = Math.min(...dates);
                                            const max = Math.max(...dates);
                                            return (
                                                <>
                                                    {format(new Date(min), 'MMM d')}
                                                    {min !== max && ` - ${format(new Date(max), 'MMM d')}`}
                                                    {', '}
                                                    {format(new Date(min), 'yyyy')}
                                                </>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    'No dates selected'
                                )}
                            </span>
                        </div>
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                            .reduce(
                                (acc, a) =>
                                    acc +
                                    a.services.filter(
                                        (s) => !a.canceledServiceIds.includes(s.id) && (a.status === 'completed' || a.status === 'accepted' || a.status === 'pending') && !a.canceledAt,
                                    ).length,
                                0,
                            ) > 0 && (
                            <div
                                className={cn(
                                    'flex items-center gap-x-2 gap-y-0.5 text-sm font-medium flex-wrap',
                                    job.assignments
                                        .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                        .reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) ===
                                        job.assignments
                                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                            .reduce(
                                                (acc, a) =>
                                                    acc +
                                                    a.services.filter(
                                                        (s) =>
                                                            !a.canceledServiceIds.includes(s.id) &&
                                                            (a.status === 'completed' || a.status === 'accepted' || a.status === 'pending') &&
                                                            !a.canceledAt,
                                                    ).length,
                                                0,
                                            )
                                        ? 'text-primary-light'
                                        : 'text-gray-500',
                                )}
                            >
                                <span className='flex items-center gap-1'>
                                    <CircleCheck className='w-4 h-4' />
                                    {`${job.assignments
                                        .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                        .reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0)}/${job.assignments
                                        .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                        .reduce(
                                            (acc, a) =>
                                                acc +
                                                a.services.filter(
                                                    (s) =>
                                                        !a.canceledServiceIds.includes(s.id) &&
                                                        (a.status === 'completed' || a.status === 'accepted' || a.status === 'pending') &&
                                                        !a.canceledAt,
                                                ).length,
                                            0,
                                        )} Completed`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    'flex whitespace-nowrap flex-row-reverse @min-[600px]/tasks:flex-row min-w-0 items-center gap-2 @min-[350px]/job-card:gap-4 w-full @min-[600px]/tasks:w-auto justify-between @min-[600px]/tasks:justify-end mt-2 @min-[600px]/tasks:mt-0',
                    completedNotPaid ? 'opacity-60' : '',
                )}
            >
                <div className='flex items-center gap-2'>
                    {role === 'braider' &&
                        job.status === 'submitted' &&
                        job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) > 0 &&
                        job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) ===
                            job.assignments.reduce(
                                (acc, a) =>
                                    acc +
                                    a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && (a.status === 'completed' || a.status === 'accepted') && !a.canceledAt).length,
                                0,
                            ) && (
                            <button
                                onClick={handleSaveAndReview}
                                className='p-2 rounded-full flex justify-center items-center cursor-pointer hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all border border-transparent hover:border-green-200'
                                title='Save & Review'
                            >
                                <CloudCheck size={28} />
                            </button>
                        )}
                    {role === 'braider' && reviewingJob && (
                        <button
                            onClick={handleRevertReviewStatus}
                            className='p-2 rounded-full flex justify-center items-center cursor-pointer hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all border border-transparent hover:border-green-200'
                            title='Go Back & Edit'
                        >
                            <CloudBackup size={28} />
                        </button>
                    )}
                    {job.status === 'editing' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                sendRequest();
                            }}
                            title='Submit Request'
                            className='pt-2.5 pr-2.5 pb-1.5 pl-1.5 rounded-full flex justify-center items-center cursor-pointer hover:bg-primary-extra-light text-gray-400 hover:text-primary border border-transparent hover:border-[#dae3de] transition-all relative'
                        >
                            <Send size={28} />
                        </button>
                    )}
                    {!completed && !canceled && job.status !== 'editing' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setNotesJob(job);
                            }}
                            title='Open Notes'
                            className='p-2 rounded-full flex justify-center items-center cursor-pointer hover:bg-primary-extra-light text-gray-400 hover:text-primary border border-transparent hover:border-[#dae3de] transition-all relative'
                        >
                            <MessageCircle size={28} />
                            {unreadCount > 0 && <span className='absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white' />}
                        </button>
                    )}
                </div>
                <div className='flex flex-col items-center gap-0.5'>
                    <span className='text-2xl font-bold font-lusitana text-primary'>
                        {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                        }).format(
                            job.assignments
                                .filter((a: any) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                .reduce((acc: number, a: any) => {
                                    const servicesTotal = a.services
                                        .filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt)
                                        .reduce((sAcc: number, s: any) => sAcc + s.priceUSD, 0);
                                    const customTotal = a.customCharges?.reduce((cAcc: number, c: any) => cAcc + c.amount, 0) || 0;
                                    return a.canceledAt || !(a.status === 'accepted' || a.status === 'accepted' || a.status === 'pending') ? acc : acc + servicesTotal + customTotal;
                                }, 0),
                        )}
                    </span>
                    <span className='text-xs text-gray-400 font-figtree whitespace-nowrap'>
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                            .reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0)}{' '}
                        Service
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                            .reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0) !== 1
                            ? 's'
                            : ''}
                    </span>
                    <span className='text-xs text-gray-400 font-figtree whitespace-nowrap'>
                        {
                            job.assignments
                                .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                .filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length
                        }{' '}
                        Horse
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                            .filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length !== 1
                            ? 's'
                            : ''}
                    </span>
                </div>
            </div>
            {completedNotPaid && (
                <div
                    onClick={() => {
                        if (role === 'braider') setSelectedPage('Invoices');
                    }}
                    className={cn(
                        'cursor-pointer flex items-center gap-2 font-figtree uppercase font-bold absolute -top-3 right-2 text-[15px] tracking-wide px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 shadow-sm text-amber-700 hover:bg-amber-200 transition-all',
                        role !== 'braider' ? 'pointer-events-none' : '',
                    )}
                >
                    Invoices Sent
                    {role === 'braider' && <ChevronsRight className='w-5 h-5' />}
                </div>
            )}
            {reviewingJob && (
                <div
                    onClick={() => {
                        if (role === 'braider') setSelectedPage('Invoices');
                    }}
                    className={cn(
                        'cursor-pointer flex items-center gap-2 font-figtree uppercase font-bold absolute -top-3 right-2 text-[15px] tracking-wide px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 shadow-sm text-amber-700 hover:bg-amber-200 transition-all',
                        role !== 'braider' ? 'pointer-events-none' : '',
                    )}
                >
                    {role === 'braider' ? 'Review Invoice' : 'Under Review'}
                    {role === 'braider' && <ChevronsRight className='w-5 h-5' />}
                </div>
            )}
        </div>
    );
};

const JobNotesModal = ({ job, role, onClose, refresh }: { job: Job; role: string; onClose: () => void; refresh: () => void }) => {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [job.notes]);

    const handleSendNote = async () => {
        if (!note.trim()) return;
        setLoading(true);
        await addNote(job.id, note);
        setNote('');
        refresh();
        setLoading(false);
    };

    return (
        <div className='flex flex-col h-[70vh] bg-gray-50 font-figtree'>
            <div className='p-6 pb-4 border-b border-gray-200 bg-white flex justify-between items-center'>
                <h3 className='font-bold text-gray-900 flex items-center gap-2 font-lusitana text-3xl'>Job Notes</h3>
                <button onClick={onClose} className='p-2 cursor-pointer text-gray-500 hover:scale-105 transition-all'>
                    <X size={20} />
                </button>
            </div>

            <div className='flex-1 overflow-y-auto p-6 pb-0 space-y-4'>
                {job.notes.length === 0 && <p className='text-center text-gray-400 text-sm mt-10'>No notes yet.</p>}
                {job.notes
                    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((note) => (
                        <div
                            key={note.id}
                            className={cn(
                                'flex flex-col',
                                note.author.name ===
                                    (role === 'barn'
                                        ? job.barn.name
                                        : role === 'subcontractor'
                                          ? job.subcontractors.find((s) => s.name === note.author.name)?.name || ''
                                          : job.braider.name)
                                    ? 'self-end items-end'
                                    : 'self-start items-start',
                            )}
                        >
                            <div
                                className={cn(
                                    'p-3 rounded-2xl text-sm font-figtree shadow-sm',
                                    note.author.name ===
                                        (role === 'barn'
                                            ? job.barn.name
                                            : role === 'subcontractor'
                                              ? job.subcontractors.find((s) => s.name === note.author.name)?.name || ''
                                              : job.braider.name)
                                        ? 'bg-primary text-white rounded-tr-sm'
                                        : 'bg-white text-gray-800 rounded-tl-sm',
                                )}
                            >
                                {note.content}
                            </div>
                            <span className='text-[10px] text-gray-400 mt-1 px-1'>
                                {new Date(note.createdAt).toLocaleString()} • {note.author.name}
                            </span>
                        </div>
                    ))}
                <div ref={messagesEndRef} />
            </div>
            <div className='p-4 bg-white border-t border-gray-100'>
                <div className='flex gap-2'>
                    <input
                        type='text'
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
                        placeholder='Add a note...'
                        className='flex-1 p-2 px-3 rounded-xl border border-gray-200 shadow-sm outline-none focus:border-primary transition-colors font-figtree text-sm'
                    />
                    <button
                        onClick={handleSendNote}
                        disabled={loading || !note}
                        className='p-2.5 rounded-xl cursor-pointer shadow-sm bg-primary text-white hover:bg-primary-light disabled:opacity-50 disabled:pointer-events-none transition-all font-bold'
                    >
                        {loading ? <Loader size={18} className='animate-spin' /> : <Check size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const wrapperVariants = {
    open: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            when: 'beforeChildren',
            staggerChildren: 0.1,
        },
    },
    closed: {
        opacity: 0,
        y: -15,
        scale: 0.95,
        transition: {
            when: 'afterChildren',
            staggerChildren: 0.1,
        },
    },
};

const genderStyles = {
    mare: 'bg-pink-50 text-pink-700 border-pink-100',
    filly: 'bg-pink-50 text-pink-700 border-pink-100',
    gelding: 'bg-blue-50 text-blue-700 border-blue-100',
    colt: 'bg-blue-50 text-blue-700 border-blue-100',
    stallion: 'bg-red-50 text-red-700 border-red-100',
    null: 'bg-gray-50 text-gray-700 border-gray-100',
    undefined: 'bg-gray-50 text-gray-700 border-gray-100',
};

export const HorseDetailView = ({ horse, onClose }: { horse: any; onClose: () => void }) => {
    const [phoneNumberVisible, setPhoneNumberVisible] = useState(false);
    const phoneNumberRef = useRef<HTMLDivElement>(null);
    const [emailVisible, setEmailVisible] = useState(false);
    const emailRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(phoneNumberRef, [], () => setPhoneNumberVisible(false));
    useOnClickOutside(emailRef, [], () => setEmailVisible(false));

    return (
        <div className={cn('flex flex-col overflow-y-auto @container/horse-detail', horse.profileImage ? 'bg-primary-extra-light' : 'bg-white')}>
            {horse.profileImage && (
                <div className='w-full bg-primary-extra-light flex justify-center p-4'>
                    <Image src={horse.profileImage} alt={horse.barnName} fill className='object-cover static! rounded-full w-full h-full max-w-48 max-h-48 shadow-lg' />
                </div>
            )}
            <div className='p-8 font-figtree rounded-t-4xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)]'>
                <div className='space-y-6'>
                    <div>
                        <h2 className='text-3xl @min-[380px]/horse-detail:text-4xl font-lusitana font-bold text-gray-900 leading-tight truncate' title={horse.barnName}>
                            {horse.barnName}
                        </h2>
                        <div className='text-gray-500 font-figtree text-[17px] @min-[380px]/horse-detail:text-lg font-medium truncate' title={horse.showName}>
                            Show Name • {horse.showName}
                        </div>
                    </div>

                    <div className='p-3 rounded-2xl mb-2 @min-[425px]/horse-detail:mb-4 border flex justify-between items-center transition-all bg-primary-light/10 text-primary border-primary-light/20'>
                        <div className='flex flex-col min-w-0'>
                            <span className='text-[13px] uppercase font-bold tracking-wide opacity-60'>Owner</span>
                            <span className='text-lg font-bold font-figtree capitalize truncate'>{horse.client?.name || 'Unknown Owner'}</span>
                        </div>
                        <div className='flex gap-3 items-center pr-1'>
                            <div
                                onClick={() => setEmailVisible((prev) => !prev)}
                                ref={emailRef}
                                className={cn(
                                    'bg-primary-light/15 relative p-2 rounded-full cursor-pointer transition-all hover:bg-primary-light/10',
                                    !horse.client?.email && 'opacity-20 pointer-events-none',
                                )}
                            >
                                <Mail className='w-5 h-5' strokeWidth={2.5} />
                                <AnimatePresence>
                                    {emailVisible && horse.client?.email && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ duration: 0.2 }}
                                            key={emailVisible ? 'visible' : 'hidden'}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(horse.client.email);
                                                successToast('Copied email!');
                                            }}
                                            className='absolute font-figtree flex text-sm -top-9 right-0 w-fit text-nowrap gap-2 items-center bg-[#F0F5F3] border-primary-light/20 shadow-sm border text-primary px-4 py-1 rounded-xl'
                                        >
                                            <Copy className='w-4 h-4' />
                                            {horse.client.email}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            {horse.client?.phoneNumber && (
                                <div
                                    onClick={() => setPhoneNumberVisible((prev) => !prev)}
                                    ref={phoneNumberRef}
                                    className='bg-primary-light/15 relative p-2 rounded-full cursor-pointer transition-all hover:bg-primary-light/10'
                                >
                                    <Phone className='w-5 h-5' strokeWidth={2.5} />
                                    <AnimatePresence>
                                        {phoneNumberVisible && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                transition={{ duration: 0.2 }}
                                                key={phoneNumberVisible ? 'visible' : 'hidden'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(horse.client.phoneNumber);
                                                    successToast('Copied phone number!');
                                                }}
                                                className='absolute font-figtree flex text-sm -top-9 right-0 w-fit text-nowrap gap-2 items-center bg-[#F0F5F3] border-primary-light/20 shadow-sm border text-primary px-4 py-1 rounded-xl'
                                            >
                                                <Copy className='w-4 h-4' />
                                                {formatPhoneNumber(horse.client.phoneNumber)}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-2 @min-[425px]/horse-detail:grid-cols-2 @min-[425px]/horse-detail:gap-4'>
                        <div className={cn('p-3 rounded-2xl border flex flex-col transition-all', genderStyles[horse.gender as keyof typeof genderStyles] || genderStyles.undefined)}>
                            <span className='text-[13px] uppercase font-bold tracking-wide opacity-60'>Gender</span>
                            <span className='text-lg font-bold font-figtree capitalize truncate'>{horse.gender || 'Not Specified'}</span>
                        </div>
                        <div className='p-3 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col transition-all text-gray-700'>
                            <span className='text-[13px] uppercase font-bold tracking-wide text-gray-400'>Color</span>
                            <span className='text-lg font-bold font-figtree capitalize truncate'>{horse.color || 'Not Specified'}</span>
                        </div>
                    </div>

                    {horse.notes && (
                        <div className='space-y-3'>
                            <div className='flex items-center gap-2 text-gray-400'>
                                <Info size={16} strokeWidth={2.5} />
                                <h3 className='text-[13px] font-bold uppercase tracking-wide'>Horse Notes</h3>
                            </div>
                            <div className='p-5 rounded-2xl bg-amber-50/50 border border-amber-100/50 relative overflow-hidden'>
                                <div className='absolute top-0 left-0 w-1 h-full bg-amber-200/50' />
                                <p className='text-amber-900 font-figtree leading-relaxed'>"{horse.notes}"</p>
                            </div>
                        </div>
                    )}

                    <div onClick={onClose} className='py-2 px-4 grid place-items-center primary-border-hover text-primary rounded-[10px] font-bold text-lg cursor-pointer'>
                        Close View
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tasks;
