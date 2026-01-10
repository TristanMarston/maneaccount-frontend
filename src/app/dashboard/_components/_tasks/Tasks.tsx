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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createJob, cancelJob, getJobs, updateJobStatus, addNote, getBraiderData, reRequestJob, deleteJob, markJobCompleted, toggleServiceCompletion } from '@/app/actions/jobs';
import { getRelations } from '@/app/actions/barn-relations';
import Modal from '../../Modal';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format, eachDayOfInterval, isSameDay, addHours } from 'date-fns';
import { RequestWorkModal, ViewShowDetailsModal } from './RequestWorkModals';
import { createPortal } from 'react-dom';
import { getTeamMembers } from '@/app/actions/team';
import { failToast, successToast, scrollVariants } from '@/app/context';
import { markAllTypeAsRead } from '@/app/actions/notifications';
import { NotificationType } from '@prisma/client';
import { useNotifications } from '@/app/NotificationContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { addShowToCalendar } from '@/app/actions/calendar';
import DatePicker from '../DatePicker';
import { getIDByEmail } from '@/app/actions/join';

type Job = {
    id: string;
    status: 'pending' | 'accepted' | 'denied' | 'canceled' | 'delegated' | 'sub_requested' | 'sub_declined' | 'completed';
    braider: { name: string; image?: string; email: string };
    barn: { name: string; image?: string; email: string };
    paidAt?: Date;
    subcontractor?: { name: string; image?: string; email: string };
    show: { id: string; name: string; city: string; state: string; startDate: Date; endDate: Date; invites: any[] };
    assignments: {
        id: string;
        horse: { id: string; showName: string; barnName: string; profileImage: string; gender: string; notes: string; color: string };
        services: { id: string; name: string; priceUSD: number }[];
        completedServiceIds: string[];
    }[];
    notes: { id: string; content: string; createdAt: Date; author: { name: string; image?: string } }[];
    scheduledDate?: Date;
    createdAt: Date;
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    accepted: 'bg-blue-100 text-blue-700 border-blue-200',
    denied: 'bg-red-100 text-red-700 border-red-200',
    canceled: 'bg-orange-100 text-orange-700 border-orange-200',
    delegated: 'bg-purple-100 text-purple-700 border-purple-200',
    sub_requested: 'bg-teal-100 text-teal-700 border-teal-200',
    sub_declined: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    paid: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const Tasks = ({ role, userEmail, setSelectedPage }: { role: string; userEmail: string; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [notesJob, setNotesJob] = useState<Job | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState<{ open: boolean; show: any | null; onSelect: () => void }>({ open: false, show: null, onSelect: () => {} });
    const [cancelJobModal, setCancelJobModal] = useState(false);
    const [showCanceledEvents, setShowCanceledEvents] = useState(false);
    const [showCompletedEvents, setShowCompletedEvents] = useState(false);
    const [checkMarkedCompleted, setCheckMarkedCompleted] = useState({ open: false, id: '' });
    const [selectedHorse, setSelectedHorse] = useState<any | null>(null);

    const loadJobs = useCallback(async () => {
        const data = await getJobs(userEmail, role);
        setJobs(data as any);
        setLoading(false);
    }, [userEmail, role]);

    useAutoRefresh(loadJobs);

    const handleCreateJob = async (data: any) => {
        const res = await createJob(data);
        if (res.success) {
            successToast('Request sent!');
            setRequestModalOpen(false);
            const updated = await getJobs(userEmail, role);
            setJobs(updated as any);
        } else {
            failToast(res.error || 'Failed to send request');
        }
    };

    const handleCancelJob = async (id: string) => {
        const res = await cancelJob(id);

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

    const { refreshCounts } = useNotifications();

    useEffect(() => {
        const markRead = async () => {
            await markAllTypeAsRead(NotificationType.job_request);
            await markAllTypeAsRead(NotificationType.job_status_change);
            await markAllTypeAsRead(NotificationType.job_completed);
            await markAllTypeAsRead(NotificationType.job_paid);
            refreshCounts();
        };
        markRead();
    }, [refreshCounts]);

    useEffect(() => {
        if (notesJob) {
            markAllTypeAsRead(NotificationType.new_message, notesJob.id).then(() => {
                refreshCounts();
            });
        }
    }, [notesJob, refreshCounts]);

    const refreshJobs = async () => {
        const updated = await getJobs(userEmail, role);
        setJobs(updated as any);

        if (notesJob) {
            const updatedJob = (updated as any).find((j: Job) => j.id === notesJob.id);
            if (updatedJob) setNotesJob(updatedJob);
        }
    };

    const handleMarkJobCompleted = async (jobID: string) => {
        const res = await markJobCompleted(jobID);
        if (res.success) {
            successToast('Job marked as completed');
            setCheckMarkedCompleted((prev) => ({ ...prev, open: false }));
            setSelectedJob(null);
            refreshJobs();
        } else {
            failToast('Failed to mark job as completed.');
        }
    };

    return (
        <>
            <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-6 @container/tasks'>
                <header className='flex flex-col gap-4 @min-[400px]/tasks:gap-0 @min-[400px]/tasks:flex-row @min-[400px]/tasks:justify-between @min-[400px]/tasks:items-center'>
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>{role === 'barn' ? 'Services' : 'Tasks'}</h1>
                        <p className='text-gray-500 font-figtree mt-1 @min-[400px]/tasks:mt-1.5'>Manage your braiding schedule and requests.</p>
                    </div>
                    {role === 'barn' && (
                        <button
                            onClick={() => setRequestModalOpen(true)}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-2 px-6 @min-[400px]/tasks:rounded-[20px] @min-[400px]/tasks:p-3 @min-[560px]/tasks:rounded-[10px] @min-[560px]/tasks:py-2 @min-[560px]/tasks:px-6 bg-primary-light text-background primary-border-hover'
                        >
                            <PlusCircle className='w-6 h-6' strokeWidth={2.5} />
                            <span className='block @min-[400px]/tasks:hidden @min-[560px]/tasks:block'>Request Work</span>
                        </button>
                    )}
                </header>

                {loading ? (
                    <div className='grid grid-cols-1 gap-4 animate-pulse'>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className='h-40 bg-gray-100 rounded-3xl' />
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className='grid grid-cols-1'>
                        {role === 'barn' ? (
                            <div
                                onClick={() => setRequestModalOpen(true)}
                                className='grid place-items-center text-center p-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                            >
                                <PlusCircle className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                                <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-[17px] @min-[340px]/tasks:text-lg mt-2'>
                                    Request services from braiders.
                                </p>
                            </div>
                        ) : (
                            <div
                                onClick={() => setSelectedPage('Barns')}
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
                        {jobs.filter((j) => j.status !== 'canceled' && j.status !== 'denied' && j.status !== 'completed').length === 0 &&
                            (role === 'barn' ? (
                                <div
                                    onClick={() => setRequestModalOpen(true)}
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
                            .filter((j) => j.status !== 'canceled' && j.status !== 'denied' && (j.status !== 'completed' || !j.paidAt))
                            .map((job) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    role={role}
                                    setSelectedJob={setSelectedJob}
                                    setNotesJob={setNotesJob}
                                    refresh={refreshJobs}
                                    setCheckMarkedCompleted={setCheckMarkedCompleted}
                                    setSelectedPage={setSelectedPage}
                                />
                            ))}
                        {jobs.filter((j) => (j.status === 'completed' && j.paidAt) || j.status === 'canceled' || j.status === 'denied').length > 0 &&
                            jobs.filter((j) => j.status !== 'canceled' && j.status !== 'denied' && (j.status !== 'completed' || !j.paidAt)).length > 0 && (
                                <div className='h-[0.5px] bg-gray-200 rounded-full' />
                            )}
                        {jobs.filter((j) => j.status === 'completed' && j.paidAt).length > 0 && (
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
                                                .filter((j) => j.status === 'completed' && j.paidAt)
                                                .map((job) => (
                                                    <JobCard
                                                        key={job.id}
                                                        job={job}
                                                        role={role}
                                                        completed={true}
                                                        setSelectedJob={setSelectedJob}
                                                        setNotesJob={setNotesJob}
                                                        refresh={refreshJobs}
                                                        setCheckMarkedCompleted={setCheckMarkedCompleted}
                                                        setSelectedPage={setSelectedPage}
                                                    />
                                                ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                        {jobs.filter((j) => j.status === 'canceled' || j.status === 'denied').length > 0 && (
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
                                                .filter((j) => j.status === 'canceled' || j.status === 'denied')
                                                .map((job) => (
                                                    <JobCard
                                                        key={job.id}
                                                        job={job}
                                                        canceled={true}
                                                        role={role}
                                                        setSelectedJob={setSelectedJob}
                                                        setNotesJob={setNotesJob}
                                                        refresh={refreshJobs}
                                                        setCheckMarkedCompleted={setCheckMarkedCompleted}
                                                        setSelectedPage={setSelectedPage}
                                                    />
                                                ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </div>
                )}
            </div>
            <Modal isOpen={requestModalOpen} setIsOpen={setRequestModalOpen} className='max-w-2xl p-7 rounded-[18px] primary-border-bold relative overflow-y-auto'>
                <RequestWorkModal userEmail={userEmail} onClose={() => setRequestModalOpen(false)} setShowDetailsModal={setShowDetailsModal} onSubmit={handleCreateJob} />
            </Modal>

            <Modal
                isOpen={showDetailsModal.open}
                setIsOpen={(open: boolean) => setShowDetailsModal({ open: false, show: null, onSelect: () => {} })}
                className='bg-white p-0 w-full max-w-sm overflow-hidden rounded-[18px] primary-border-bold overflow-y-auto @container/show-details'
            >
                {showDetailsModal.show !== null && <ViewShowDetailsModal show={showDetailsModal.show} setShowDetailsModal={setShowDetailsModal} onSelect={showDetailsModal.onSelect} />}
            </Modal>

            <Modal isOpen={!!selectedJob} setIsOpen={() => setSelectedJob(null)} className='max-w-xl p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                {selectedJob && (
                    <JobDetailView
                        job={selectedJob}
                        setJob={setSelectedJob}
                        role={role}
                        userEmail={userEmail}
                        onClose={() => setSelectedJob(null)}
                        refresh={refreshJobs}
                        handleCancelJobModal={handleCancelJobModal}
                        setSelectedHorse={setSelectedHorse}
                        setCheckMarkedCompleted={setCheckMarkedCompleted}
                        canMarkCompleted={true}
                    />
                )}
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
                            This action will cancel this request. However, you may still request it again if you change your mind.
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
                                Cancel Request
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
                {checkMarkedCompleted.id.length > 0 && (
                    <div>
                        <h1 className='text-3xl @min-[300px]/check-completed:text-[33px] leading-[1.05] @min-[520px]/check-completed:text-4xl font-lusitana font-bold text-gray-900'>
                            Have you completed this service?
                        </h1>
                        <p className='text-[15px] @min-[520px]/check-completed:text-[17px] text-gray-800 font-figtree mt-2'>
                            {role === 'braider' && (
                                <span>
                                    This action will mark this request as completed. An invoice will be sent to the barn, and they will pay for the service. Payments occur outside of
                                    the ManeAccount platform, but it is advised to track them in the <span className='font-bold'>Invoices</span> panel.
                                </span>
                            )}
                            {role === 'subcontractor' && (
                                <span>
                                    This action will mark this request as completed. An invoice will be sent to the barn, and they will pay the braider for the service. Payments occur
                                    outside of the platform, so you must connect with the braider outside of the ManeAccount platform to receive your share of the earnings.
                                </span>
                            )}
                        </p>
                        <div className='grid @min-[415px]/check-completed:grid-cols-2 @min-[415px]/check-completed:gap-3 gap-2 mt-4'>
                            <button
                                onClick={() => setCheckMarkedCompleted((prev) => ({ ...prev, open: false }))}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleMarkJobCompleted(checkMarkedCompleted.id)}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                            >
                                Mark as Completed
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!notesJob} setIsOpen={() => setNotesJob(null)} className='max-w-lg p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                {notesJob && <JobNotesModal job={notesJob} role={role} onClose={() => setNotesJob(null)} refresh={refreshJobs} />}
            </Modal>
        </>
    );
};

const JobCard = ({
    job,
    role,
    setSelectedJob,
    setNotesJob,
    canceled = false,
    completed = false,
    refresh,
    setCheckMarkedCompleted,
    setSelectedPage,
}: {
    job: Job;
    role: string;
    setSelectedJob: (j: Job) => void;
    setNotesJob: (j: Job) => void;
    canceled?: boolean;
    completed?: boolean;
    refresh: () => void;
    setCheckMarkedCompleted: React.Dispatch<React.SetStateAction<{ open: boolean; id: string }>>;
    setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
}) => {
    const completedNotPaid = job.status === 'completed' && !job.paidAt;

    const handleMarkCompleted = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCheckMarkedCompleted({ open: true, id: job.id });
    };

    return (
        <div
            onClick={() => setSelectedJob(job)}
            className={cn(
                'bg-white p-5 @min-[450px]/tasks:p-6 relative rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col @min-[600px]/tasks:flex-row gap-4 justify-between items-start @min-[600px]/tasks:items-center @container/job-card',
                canceled ? 'opacity-50' : completed ? 'opacity-60' : completedNotPaid ? 'bg-[#f2fcf7] border-primary-extra-light mt-2' : ''
            )}
        >
            <div className={cn('flex items-start gap-4 w-full @min-[600px]/tasks:w-auto', completedNotPaid ? 'opacity-60' : '')}>
                <div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-figtree'>
                    {role === 'barn' ? (
                        job.braider?.image ? (
                            <Image src={job.braider.image} alt='Braider' width={48} height={48} className='rounded-full object-cover w-full h-full' />
                        ) : (
                            <div className='w-full h-full bg-primary/20 rounded-full flex items-center justify-center text-primary text-lg font-bold'>{job.braider.name[0]}</div>
                        )
                    ) : job.barn?.image ? (
                        <Image src={job.barn.image} alt='Barn' width={48} height={48} className='rounded-full object-cover w-full h-full' />
                    ) : (
                        <div className='w-full h-full bg-primary/20 rounded-full flex items-center justify-center text-primary text-lg font-bold'>
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
                                statusColors[job.paidAt ? 'paid' : role === 'subcontractor' && job.status === 'delegated' ? 'accepted' : job.status]
                            )}
                        >
                            {job.paidAt
                                ? 'paid'
                                : job.status === 'delegated' && role === 'subcontractor'
                                  ? 'accepted'
                                  : role === 'subcontractor' && job.status.startsWith('sub')
                                    ? job.status.replace('sub_', '')
                                    : job.status.replace('_', ' ')}
                        </span>
                    </div>
                    <p className='text-gray-500 text-sm -mt-[3px]'>{role === 'barn' ? `With ${job.braider.name}` : `Barn: ${job.barn.name}`}</p>

                    {job.scheduledDate && (
                        <div className='flex gap-2 items-center'>
                            <div className='flex items-center gap-x-2 gap-y-0.5 text-sm text-gray-500 font-medium flex-wrap'>
                                <span className='flex items-center gap-1'>
                                    <Calendar className='w-4 h-4' />
                                    {format(new Date(job.scheduledDate), 'MMM d, yyyy')}
                                </span>
                            </div>
                            <div className='flex items-center gap-x-2 gap-y-0.5 text-sm text-gray-500 font-medium flex-wrap'>
                                <span className='flex items-center gap-1'>
                                    <CircleCheck className='w-4 h-4' />
                                    {`${job.assignments.reduce((acc, a) => acc + a.completedServiceIds.length, 0)}/${job.assignments.reduce((acc, a) => acc + a.services.length, 0)} Completed`}
                                </span>
                            </div>
                        </div>
                    )}
                    {job.subcontractor && role !== 'subcontractor' && (
                        <span className='flex items-center w-fit gap-1 mt-[3px] text-blue-600 bg-blue-50 px-2 py-[3px] rounded-full text-xs font-bold'>
                            <User size={12} />
                            {job.subcontractor.name}
                        </span>
                    )}
                </div>
            </div>

            <div
                className={cn(
                    'flex whitespace-nowrap flex-row-reverse @min-[600px]/tasks:flex-row min-w-0 items-center gap-2 @min-[350px]/job-card:gap-4 w-full @min-[600px]/tasks:w-auto justify-between @min-[600px]/tasks:justify-end mt-2 @min-[600px]/tasks:mt-0',
                    completedNotPaid ? 'opacity-60' : ''
                )}
            >
                <div className='flex items-center gap-2'>
                    {(role === 'braider' || role === 'subcontractor') &&
                        (job.status === 'accepted' || job.status === 'delegated') &&
                        !(job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.completedServiceIds.includes(s.id)).length, 0) > 0) && (
                            <button
                                onClick={handleMarkCompleted}
                                className='p-2 rounded-full cursor-pointer hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all border border-transparent hover:border-green-200'
                                title='Mark as Completed'
                            >
                                <CheckCircle2 size={28} />
                            </button>
                        )}
                    {!completed && !canceled && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setNotesJob(job);
                            }}
                            title='Open Notes'
                            className='p-2 rounded-full cursor-pointer hover:bg-primary-extra-light text-gray-400 hover:text-primary border border-transparent hover:border-[#dae3de] transition-all relative'
                        >
                            <MessageCircle size={28} />
                            {/* {job.notes.length > 0 && <span className='absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white' />} */}
                        </button>
                    )}
                </div>
                <div className='flex flex-col items-center gap-0.5'>
                    <span className='text-2xl font-bold font-lusitana text-primary'>
                        ${job.assignments.reduce((acc, assignment) => acc + assignment.services.reduce((sum, s) => sum + s.priceUSD, 0), 0)}
                    </span>
                    <span className='text-xs text-gray-400 font-figtree whitespace-nowrap'>
                        {job.assignments.reduce((acc, a) => acc + a.services.length, 0)} Service{job.assignments.reduce((acc, a) => acc + a.services.length, 0) !== 1 ? 's' : ''}
                    </span>
                    <span className='text-xs text-gray-400 font-figtree whitespace-nowrap'>
                        {job.assignments.length} Horse{job.assignments.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
            {completedNotPaid && (
                <div
                    onClick={() => {
                        if (role !== 'subcontractor') setSelectedPage('Invoices');
                    }}
                    className={cn(
                        'cursor-pointer flex items-center gap-2 font-figtree uppercase font-bold absolute -top-3 right-2 text-[15px] tracking-wide px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 shadow-sm text-amber-700 hover:bg-amber-200 transition-all',
                        role === 'subcontractor' ? 'pointer-events-none' : ''
                    )}
                >
                    {role === 'barn' ? 'Payment Required' : 'Invoice Sent to Barn'}
                    {role !== 'subcontractor' && <ChevronsRight className='w-5 h-5' />}
                </div>
            )}
        </div>
    );
};

export const JobDetailView = ({
    job,
    setJob,
    role,
    userEmail,
    onClose,
    refresh,
    handleCancelJobModal,
    setSelectedHorse,
    setCheckMarkedCompleted,
    canMarkCompleted = true,
    type = 'tasks',
}: {
    job: Job;
    setJob: React.Dispatch<React.SetStateAction<Job | null>>;
    role: string;
    userEmail: string;
    onClose: () => void;
    refresh: () => void;
    handleCancelJobModal: () => void;
    setSelectedHorse: React.Dispatch<React.SetStateAction<any | null>>;
    setCheckMarkedCompleted: React.Dispatch<React.SetStateAction<{ open: boolean; id: string }>>;
    canMarkCompleted?: boolean;
    type?: 'tasks' | 'calendar';
}) => {
    const [date, setDate] = useState<Date | null>(job.scheduledDate ? new Date(job.scheduledDate) : null);
    const [team, setTeam] = useState<any[]>([]);
    const [selectedSub, setSelectedSub] = useState('');
    const [userId, setUserId] = useState('');

    useEffect(() => {
        const getTeam = async () => {
            const relations = await getTeamMembers(userEmail);
            setTeam(relations.filter((r) => r.role === 'subcontractor'));
        };

        const getUserId = async () => {
            const res = await getIDByEmail(userEmail);
            if (res.success) setUserId(res.success.id);
        };

        if (role === 'braider') getTeam();
        else getUserId();
    }, [role, userEmail]);

    const handleAction = async (status: 'accepted' | 'delegated' | 'denied' | 'sub_requested' | 'sub_declined', subId?: string) => {
        const res = await updateJobStatus(job.id, status, {
            scheduledDate: date || undefined,
            subcontractorId: subId || selectedSub || undefined,
        });

        if (res.success) {
            successToast(`Job ${status === 'sub_requested' ? 'requested' : status === 'sub_declined' || status === 'denied' ? 'declined' : status}`);
            refresh();
            onClose();
        } else {
            failToast('Failed to update');
        }
    };

    const handleToggleService = async (e: React.MouseEvent, assignmentId: string, serviceId: string) => {
        e.stopPropagation();
        const res = await toggleServiceCompletion(assignmentId, serviceId);
        if (res.success) {
            setJob((prev) => {
                if (!prev) return null;

                return {
                    ...prev,
                    assignments: prev.assignments.map((assignment) => {
                        if (assignment.id !== assignmentId) return assignment;

                        const hasService = assignment.completedServiceIds.includes(serviceId);
                        const newServices = hasService ? assignment.completedServiceIds.filter((id) => id !== serviceId) : [...assignment.completedServiceIds, serviceId];

                        return { ...assignment, completedServiceIds: newServices };
                    }),
                };
            });

            refresh();
        } else {
            failToast('Failed to update');
        }
    };

    const handleReRequestJob = async () => {
        const res = await reRequestJob(job.id);

        if (res.success) {
            successToast(`Job updated`);
            refresh();
            onClose();
        } else {
            failToast('Failed to update');
        }
    };

    const handleDeleteJob = async () => {
        const res = await deleteJob(job.id);

        if (res.success) {
            successToast(`Job deleted`);
            refresh();
            onClose();
        } else {
            failToast('Failed to delete');
        }
    };

    const handleAddToCalendar = async () => {
        const res = await addShowToCalendar(job.show.id);

        if (res.success) {
            successToast(`Event added to calendar!`);
            refresh();
        } else {
            failToast('Failed to add to calendar');
        }
    };

    return (
        <div className='flex flex-col bg-white'>
            <div className='flex justify-between items-start p-7 pb-2 border-b border-gray-50'>
                <div className='min-w-0'>
                    <h2 className='text-3xl font-lusitana font-bold text-gray-900 truncate'>{job.show.name}</h2>
                    <span className='text-gray-500 flex gap-1 items-center mt-0.5'>
                        <MapPin className='min-w-5 w-5' />
                        <p className='font-figtree truncate'>
                            {job.show.city}, {job.show.state}
                        </p>
                    </span>
                </div>
                <button onClick={onClose} className='p-2 cursor-pointer text-gray-500 hover:scale-105 transition-all'>
                    <X size={20} />
                </button>
            </div>

            <div className='flex-1 overflow-y-auto px-7 py-5 space-y-4 font-figtree @container/job-detail'>
                <div className='flex items-center gap-3 p-4 bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px] relative'>
                    <div className='relative min-w-12 h-12 rounded-full overflow-hidden bg-primary-light/15 grid place-items-center'>
                        {role === 'barn' ? (
                            job.braider.image ? (
                                <Image src={job.braider.image} alt='Braider' fill className='object-cover' />
                            ) : (
                                <h4 className='uppercase font-bold text-lg text-primary-dark w-full h-full grid place-items-center'>{job.braider.name[0]}</h4>
                            )
                        ) : job.barn.image ? (
                            <Image src={job.barn.image} alt='Barn' fill className='object-cover' />
                        ) : (
                            <h4 className='uppercase font-bold text-lg text-primary-dark w-full h-full grid place-items-center'>{job.barn.name[0]}</h4>
                        )}
                    </div>
                    <div className='min-w-0'>
                        <p className='font-bold text-primary-dark truncate'>{role === 'barn' ? job.braider.name : job.barn.name}</p>
                        <p className='text-[13px] text-primary uppercase font-bold'>{role === 'barn' ? 'Braider' : 'Barn'}</p>
                    </div>
                    <span
                        className={cn(
                            'text-xs absolute -top-3 right-2 font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide my-1',
                            statusColors[job.paidAt ? 'paid' : role === 'subcontractor' && job.status === 'delegated' ? 'accepted' : job.status]
                        )}
                    >
                        {job.paidAt
                            ? 'paid'
                            : job.status === 'delegated' && role === 'subcontractor'
                              ? 'accepted'
                              : role === 'subcontractor' && job.status.startsWith('sub')
                                ? job.status.replace('sub_', '')
                                : job.status.replace('_', ' ')}
                    </span>
                </div>

                {job.scheduledDate && (
                    <div className='flex flex-col @min-[450px]/job-detail:flex-row @min-[450px]/job-detail:items-center gap-2 w-full justify-between p-4 bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px]'>
                        <div>
                            <p className='font-bold text-primary-dark'>Expected Completion Date</p>
                            <h3 className='text-[13px] font-bold text-primary uppercase'>{format(job.scheduledDate, 'PPPP')}</h3>
                        </div>
                        {role !== 'braider' && job.show.invites.filter((invite) => invite && invite.inviteeId === userId && invite.status === 'accepted').length === 0 && (
                            <div
                                onClick={handleAddToCalendar}
                                className='bg-primary-light/30 flex items-center gap-2 px-4 py-1 rounded-[10px] cursor-pointer hover:bg-primary-light/40 transition-all text-primary shadow-sm text-sm font-semibold border border-primary'
                            >
                                <Calendar className='w-4 h-4' />
                                Add to Calendar
                            </div>
                        )}
                        {role !== 'braider' && job.show.invites.filter((invite) => invite && invite.inviteeId === userId && invite.status === 'accepted').length === 1 && (
                            <div className='bg-primary-light/30 flex items-center gap-2 px-4 py-1 rounded-[10px] cursor-pointer transition-all text-primary shadow-sm text-sm font-semibold border border-primary'>
                                <CalendarCheck className='w-4 h-4' />
                                Added to Calendar
                            </div>
                        )}
                    </div>
                )}

                {job.subcontractor && role !== 'subcontractor' ? (
                    <div className='flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 shadow-sm rounded-[14px]'>
                        <div className='relative min-w-10 h-10 rounded-full overflow-hidden bg-blue-100'>
                            {job.subcontractor.image ? (
                                <Image src={job.subcontractor.image} alt='Sub' fill className='object-cover' />
                            ) : (
                                <User className='w-full h-full p-2 text-blue-300' />
                            )}
                        </div>
                        <div className='min-w-0'>
                            <p className='text-xs text-blue-500 uppercase font-bold'>Assigned To</p>
                            <p className='font-bold text-blue-900 truncate'>{job.subcontractor.name}</p>
                        </div>
                    </div>
                ) : (
                    job.subcontractor &&
                    role === 'subcontractor' && (
                        <div className='flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 shadow-sm rounded-[14px]'>
                            <div className='relative min-w-10 h-10 rounded-full overflow-hidden bg-blue-100'>
                                {job.braider.image ? <Image src={job.braider.image} alt='Sub' fill className='object-cover' /> : <User className='w-full h-full p-2 text-blue-300' />}
                            </div>
                            <div className='min-w-0'>
                                <p className='text-xs text-blue-500 uppercase font-bold'>Assigned By</p>
                                <p className='font-bold text-blue-900 truncate'>{job.braider.name}</p>
                            </div>
                        </div>
                    )
                )}

                <div>
                    <h3 className='text-sm font-bold text-gray-500 uppercase mb-3'>Assignments • {format(job.createdAt, 'P')}</h3>
                    <div className='space-y-4 px-2'>
                        {job.assignments
                            .sort((a, b) => a.horse.barnName.localeCompare(b.horse.barnName.toUpperCase()))
                            .map((assignment, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'bg-white rounded-2xl border border-gray-200 p-4 shadow-sm',
                                        assignment.services.length === [...new Set(assignment.completedServiceIds)].length ? 'bg-primary-extra-light border-primary/20' : ''
                                    )}
                                >
                                    <div onClick={() => setSelectedHorse(assignment.horse)} className='flex justify-between items-center gap-1 cursor-pointer group mb-3'>
                                        <div className='flex items-center gap-3 min-w-0'>
                                            <div className='min-w-10 min-h-10 grid place-items-center rounded-full bg-gray-100 overflow-hidden relative'>
                                                {assignment.horse.profileImage ? (
                                                    <Image src={assignment.horse.profileImage} alt={assignment.horse.barnName} fill className='object-cover' />
                                                ) : (
                                                    <div className='w-full h-full flex items-center justify-center bg-primary/5 text-primary font-bold text-xs font-figtree'>
                                                        {assignment.horse.barnName[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className='flex flex-col min-w-0 flex-1'>
                                                <span className='font-bold text-gray-900 truncate group-hover:text-primary transition-colors'>{assignment.horse.barnName}</span>
                                                <span className='text-gray-500 text-[13px] truncate -mt-0.5'>{assignment.horse.showName}</span>
                                            </div>
                                        </div>
                                        <div className='rounded-full p-1.5 transition-all text-gray-400 group-hover:bg-primary-extra-light group-hover:text-primary'>
                                            <Info size={20} />
                                        </div>
                                    </div>

                                    <div className='space-y-2 pl-1'>
                                        {assignment.services.map((service, idx) => {
                                            const isCompleted = assignment.completedServiceIds?.includes(service.id);
                                            const isBraiderOrSub = role === 'braider' || (role === 'subcontractor' && job.status === 'delegated');
                                            const canEdit = isBraiderOrSub && job.status !== 'completed' && job.status !== 'canceled';

                                            return (
                                                <div key={idx} className='flex justify-between items-center text-sm min-w-0 py-1'>
                                                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                        {job.scheduledDate &&
                                                            (isBraiderOrSub ? (
                                                                <button
                                                                    type='button'
                                                                    disabled={!canMarkCompleted}
                                                                    onClick={(e) => canMarkCompleted && canEdit && handleToggleService(e, assignment.id, service.id)}
                                                                    className={cn(
                                                                        'min-w-5 h-5 rounded border flex items-center justify-center transition-all disabled:hover:border-black/15 disabled:opacity-50 disabled:cursor-not-allowed',
                                                                        canEdit ? 'cursor-pointer hover:border-primary' : 'opacity-50',
                                                                        isCompleted ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300'
                                                                    )}
                                                                >
                                                                    {isCompleted && <CheckSquare size={14} strokeWidth={3} />}
                                                                </button>
                                                            ) : (
                                                                isCompleted && <CheckCircle2 size={16} className='text-primary' />
                                                            ))}
                                                        <span
                                                            className={cn(
                                                                'text-gray-700 font-medium truncate',
                                                                isCompleted && 'text-gray-400 line-through',
                                                                assignment.services.length === [...new Set(assignment.completedServiceIds)].length ? 'text-primary-light/80' : ''
                                                            )}
                                                        >
                                                            {service.name}
                                                        </span>
                                                    </div>
                                                    <span className='font-bold font-lusitana text-primary pl-2'>${service.priceUSD}</span>
                                                </div>
                                            );
                                        })}
                                        <div className='border-t border-dashed border-gray-200 my-2' />
                                        <div className='flex justify-between items-center'>
                                            <span
                                                className={cn(
                                                    'text-xs font-bold text-gray-400 uppercase tracking-wider',
                                                    assignment.services.length === [...new Set(assignment.completedServiceIds)].length ? 'text-primary-light' : ''
                                                )}
                                            >
                                                Subtotal
                                            </span>
                                            <span className='font-bold text-gray-900 font-lusitana'>${assignment.services.reduce((a, b) => a + b.priceUSD, 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        <div className='flex justify-between items-center px-3 pt-2 mt-4 border-t border-gray-100'>
                            <span className='font-bold text-gray-700 text-lg'>Total</span>
                            <span className='font-bold text-xl text-primary font-lusitana'>
                                ${job.assignments.reduce((acc, a) => acc + a.services.reduce((sAcc, s) => sAcc + s.priceUSD, 0), 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {role === 'braider' && job.status === 'pending' && (
                    <div className='p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-sm font-figtree mb-0'>
                        <h3 className='text-sm font-bold text-primary mb-3 uppercase'>Schedule & Assign</h3>

                        {type === 'tasks' && (
                            <div className='mb-6 flex flex-col gap-1.5 min-w-0'>
                                <label className='text-xs font-bold text-gray-500 uppercase'>Assign To</label>
                                <SelectSubcontractorDropdown value={selectedSub} onChange={setSelectedSub} team={team} />
                            </div>
                        )}

                        <div className='mb-4 flex flex-col gap-1.5 w-full'>
                            <label className='text-xs font-bold text-gray-500 uppercase'>When will {selectedSub ? 'they' : 'you'} be finished?</label>
                            <DatePicker
                                onDateSelect={(d) => setDate(d)}
                                noDateBefore={new Date()}
                                selectedDate={date}
                                showStartDate={new Date(job.show.startDate)}
                                showEndDate={new Date(job.show.endDate)}
                                size='big'
                            />
                        </div>

                        {type === 'tasks' && (
                            <div className='flex flex-col @min-[320px]/job-detail:flex-row gap-2'>
                                <button
                                    onClick={() => handleAction('denied')}
                                    className='flex-1 py-2 cursor-pointer rounded-[10px] bg-background red-border-hover text-red-600 font-bold'
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={() => handleAction(selectedSub ? 'sub_requested' : 'accepted')}
                                    disabled={!date}
                                    className='flex-1 py-2 cursor-pointer rounded-[10px] bg-primary-light primary-border-hover text-background font-bold disabled:opacity-50 disabled:pointer-events-none'
                                >
                                    {selectedSub ? 'Assign to Sub' : 'Accept Request'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {role === 'subcontractor' && job.status === 'sub_requested' && type === 'tasks' && (
                    <div className='p-4 rounded-xl bg-primary/5 border border-primary/10 text-center mb-0'>
                        <p className='text-sm font-medium text-gray-700 mb-3'>
                            You have been assigned this job by <span className='font-bold'>{job.braider.name}</span>.
                        </p>
                        <div className='flex flex-col @min-[265px]/job-detail:flex-row gap-2'>
                            <button
                                onClick={() => handleAction('sub_declined')}
                                className='flex-1 py-2 cursor-pointer rounded-[10px] bg-background red-border-hover text-red-600 font-bold'
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => handleAction('delegated')}
                                className='flex-1 py-2 cursor-pointer rounded-[10px] bg-primary-light primary-border-hover text-background font-bold disabled:opacity-50 disabled:pointer-events-none'
                            >
                                Accept Job
                            </button>
                        </div>
                    </div>
                )}

                {type === 'tasks' && (
                    <div className='flex items-center gap-3 flex-col @min-[450px]/job-detail:flex-row'>
                        {((role !== 'subcontractor' &&
                            job.status !== 'canceled' &&
                            job.status !== 'denied' &&
                            job.status !== 'completed' &&
                            ((role === 'barn' && job.status === 'pending') || job.status !== 'pending')) ||
                            (role === 'subcontractor' && job.status === 'delegated')) && (
                            <div
                                onClick={handleCancelJobModal}
                                className='w-full grid place-items-center font-figtree font-bold text-red-500 red-border-hover rounded-[10px] py-1.5 text-lg cursor-pointer'
                            >
                                Cancel Request
                            </div>
                        )}
                        {((role === 'subcontractor' && job.status === 'delegated') || (role === 'braider' && job.status === 'accepted')) && (
                            <button
                                disabled={job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.completedServiceIds.includes(s.id)).length, 0) > 0}
                                onClick={() => {
                                    setCheckMarkedCompleted({ open: true, id: job.id });
                                }}
                                className='w-full grid place-items-center font-figtree font-bold text-background bg-primary-light primary-border-hover rounded-[10px] py-1.5 text-lg cursor-pointer disabled:opacity-50 disabled:pointer-events-none'
                            >
                                Mark Complete
                            </button>
                        )}
                    </div>
                )}

                {(job.status === 'canceled' || job.status === 'denied') && type === 'tasks' && (
                    <div className='flex items-center gap-3 flex-col @min-[450px]/job-detail:flex-row'>
                        <div
                            onClick={handleDeleteJob}
                            className='w-full grid place-items-center font-figtree font-bold text-red-500 red-border-hover rounded-[10px] py-1.5 text-[17px] @min-[240px]/job-detail:text-lg cursor-pointer'
                        >
                            Delete Request
                        </div>
                        {role === 'barn' && (
                            <div
                                onClick={handleReRequestJob}
                                className='w-full grid place-items-center font-figtree font-bold text-primary primary-border-hover rounded-[10px] py-1.5 text-[17px] @min-[240px]/job-detail:text-lg cursor-pointer'
                            >
                                Re-Request Service{job.assignments.reduce((acc, a) => acc + a.services.length, 0) > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                )}

                {type === 'calendar' && (
                    <div
                        onClick={handleCancelJobModal}
                        className='w-full grid place-items-center font-figtree font-bold text-primary bg-background primary-border-hover rounded-[10px] py-1.5 text-lg cursor-pointer'
                    >
                        Go to {role === 'barn' ? 'Services' : 'Tasks'}
                    </div>
                )}
            </div>
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
                                    (role === 'barn' ? job.barn.name : role === 'subcontractor' ? (job.subcontractor ? job.subcontractor.name : job.braider.name) : job.braider.name)
                                    ? 'self-end items-end'
                                    : 'self-start items-start'
                            )}
                        >
                            <div
                                className={cn(
                                    'p-3 rounded-2xl text-sm font-figtree shadow-sm',
                                    note.author.name ===
                                        (role === 'barn'
                                            ? job.barn.name
                                            : role === 'subcontractor'
                                              ? job.subcontractor
                                                  ? job.subcontractor.name
                                                  : job.braider.name
                                              : job.braider.name)
                                        ? 'bg-primary text-white rounded-tr-sm'
                                        : 'bg-white text-gray-800 rounded-tl-sm'
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
                        <Check size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const SelectDateDropdown = ({ value, onChange, showStart, showEnd }: { value: Date | null; onChange: (d: Date) => void; showStart: Date; showEnd: Date }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    // Generate dates
    const days = eachDayOfInterval({ start: showStart, end: showEnd });

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (portalRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setAnchorRect(null);
            return;
        }
        const updateRect = () => {
            const rect = buttonRef.current?.getBoundingClientRect() ?? null;
            if (rect) rect.width = rect.width; // Maintain width
            setAnchorRect(rect);
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [isOpen]);

    const handleSelect = (day: Date) => {
        onChange(day);
        setIsOpen(false);
    };

    return (
        <div className='relative w-full'>
            <button
                ref={buttonRef}
                type='button'
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between outline-none shadow-sm border px-3 cursor-pointer rounded-xl transition-all ${
                    isOpen ? 'border-primary/50' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
            >
                <div className='flex items-center gap-2 text-sm'>
                    <Calendar className={cn('w-4 h-4', value ? 'text-black' : 'text-gray-400')} />
                    <span className={cn('truncate min-w-0 pb-[7px] pt-[9px]', value ? 'text-gray-900' : 'text-gray-400')}>{value ? format(value, 'EEE, MMM d') : 'Select Date'}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen &&
                anchorRect &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            ref={portalRef}
                            initial={wrapperVariants.closed}
                            variants={wrapperVariants}
                            animate={isOpen ? 'open' : 'closed'}
                            exit='closed'
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'fixed',
                                top: anchorRect.bottom + 4,
                                left: anchorRect.left,
                                width: anchorRect.width,
                                zIndex: 9999,
                            }}
                            className='max-h-56 overflow-y-auto bg-white rounded-xl border border-gray-100 shadow-xl'
                        >
                            {days.map((day) => (
                                <button
                                    key={day.toISOString()}
                                    type='button'
                                    onClick={() => handleSelect(day)}
                                    className='w-full text-left cursor-pointer px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors font-medium font-figtree'
                                >
                                    <span>{format(day, 'EEE, MMM d')}</span>
                                    {value && isSameDay(value, day) && <Check size={14} className='text-primary' />}
                                </button>
                            ))}
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
};

const SelectSubcontractorDropdown = ({ value, onChange, team }: { value: string; onChange: (val: string) => void; team: any[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (portalRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setAnchorRect(null);
            return;
        }
        const updateRect = () => {
            const rect = buttonRef.current?.getBoundingClientRect() ?? null;
            if (rect) rect.width = rect.width; // Maintain width
            setAnchorRect(rect);
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [isOpen]);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
    };

    const selectedMember = team.find((t) => t.id === value);

    return (
        <div className='relative w-full'>
            <button
                ref={buttonRef}
                type='button'
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between gap-1 outline-none shadow-sm border px-3 py-2 rounded-xl transition-all ${
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
            >
                <div className='flex items-center gap-2 text-sm min-w-0'>
                    <div className='w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100'>
                        {value && selectedMember?.image ? (
                            <Image src={selectedMember.image} alt='Sub' width={20} height={20} className='w-full h-full object-cover' />
                        ) : (
                            <User size={12} className='text-gray-400' />
                        )}
                    </div>
                    <span className={cn('truncate min-w-0', value ? 'text-gray-900' : 'text-gray-500 font-medium')}>{value ? selectedMember?.name || 'Unknown' : 'Myself'}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen &&
                anchorRect &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            ref={portalRef}
                            initial={wrapperVariants.closed}
                            variants={wrapperVariants}
                            animate={isOpen ? 'open' : 'closed'}
                            exit='closed'
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'fixed',
                                top: anchorRect.bottom + 4,
                                left: anchorRect.left,
                                width: anchorRect.width,
                                zIndex: 9999,
                            }}
                            className='max-h-56 overflow-y-auto bg-white rounded-xl border border-gray-100 shadow-xl'
                        >
                            <button
                                type='button'
                                onClick={() => handleSelect('')}
                                className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors font-medium font-figtree'
                            >
                                <div className='flex items-center gap-2'>
                                    <div className='w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center'>
                                        <User size={12} className='text-primary' />
                                    </div>
                                    <span>Myself</span>
                                </div>
                                {value === '' && <Check size={14} className='text-primary' />}
                            </button>
                            {team.map((member) => (
                                <button
                                    key={member.id}
                                    type='button'
                                    onClick={() => handleSelect(member.id)}
                                    className='w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors font-medium font-figtree'
                                >
                                    <div className='flex items-center gap-2'>
                                        <div className='w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100'>
                                            {member.image ? (
                                                <Image src={member.image} alt='Sub' width={20} height={20} className='w-full h-full object-cover' />
                                            ) : (
                                                <div className='w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500'>{member.name[0]}</div>
                                            )}
                                        </div>
                                        <span>{member.name}</span>
                                    </div>
                                    {value === member.id && <Check size={14} className='text-primary' />}
                                </button>
                            ))}
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
};

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ITEM_HEIGHT = 48;

const getParts = (value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    return { hour, minute };
};

const SelectTime = ({ value, onChange, startTime, disabled }: { value: string; onChange: (val: string) => void; startTime: { hour: number; minute: number }; disabled: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [parts, setParts] = useState<{ hour: number; minute: number }>(getParts(value || '08:00'));
    const buttonRef = useRef<HTMLButtonElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);

    const hoursContainerRef = useCallback(
        (ref: HTMLDivElement) => {
            if (ref) ref.scrollTop = ITEM_HEIGHT * ((parts.hour % 12 === 0 ? 12 : parts.hour % 12) - 1);
        },
        [parts]
    );
    const minutesContainerRef = useCallback(
        (ref: HTMLDivElement) => {
            if (ref) ref.scrollTop = ITEM_HEIGHT * MINUTES.indexOf(parts.minute);
        },
        [parts]
    );

    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (buttonRef.current?.contains(target)) return;
            if (portalRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setAnchorRect(null);
            return;
        }
        const updateRect = () => {
            const rect = buttonRef.current?.getBoundingClientRect() ?? null;
            if (rect) rect.width = 161;
            setAnchorRect(rect);
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [isOpen]);

    const partsToString = (parts: { hour: number; minute: number }) => {
        const period = parts.hour >= 12 ? 'PM' : 'AM';
        const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
        return `${hour12.toString().padStart(2, '0')}:${parts.minute.toString().padStart(2, '0')} ${period}`;
    };

    useEffect(() => {
        if (value) {
            const newParts = getParts(value);
            if (newParts.hour !== parts.hour || newParts.minute !== parts.minute) {
                setParts(newParts);
            }
        }
    }, [value]);

    const handleTimeChange = (newParts: { hour: number; minute: number }) => {
        setParts(newParts);
        onChange(`${newParts.hour.toString().padStart(2, '0')}:${newParts.minute.toString().padStart(2, '0')}`);
    };

    return (
        <div className={cn('relative w-full', disabled ? 'opacity-30 pointer-events-none' : '')}>
            <button
                ref={buttonRef}
                type='button'
                onClick={() => setIsOpen((s) => !s)}
                className={`w-full text-sm cursor-pointer flex items-center justify-between gap-2 outline-none shadow-sm border px-3 py-2 rounded-xl transition-all ${
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
            >
                <div className='flex items-center gap-2'>
                    <Clock size={16} className={cn(value ? 'text-black' : 'text-gray-400')} />
                    <span className={cn('truncate', value ? 'text-gray-900' : 'text-gray-400')}>{value ? partsToString(parts) : 'Select Time'}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen &&
                !disabled &&
                anchorRect &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            ref={portalRef}
                            initial={wrapperVariants.closed}
                            variants={wrapperVariants}
                            animate={isOpen ? 'open' : 'closed'}
                            exit='closed'
                            transition={{ duration: 0.15 }}
                            style={{
                                position: 'fixed',
                                top: anchorRect.bottom + 4,
                                left: anchorRect.left,
                                width: anchorRect.width,
                                zIndex: 9999,
                            }}
                            className='max-w-41 h-45 grid grid-cols-3 gap-1 pr-1 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden'
                        >
                            <div className='relative h-full overflow-y-auto'>
                                <div
                                    ref={hoursContainerRef}
                                    className='overflow-y-auto flex flex-col gap-1 w-full h-full scrollbar-hide'
                                    style={{
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                    }}
                                >
                                    {HOURS.map((item, index) => (
                                        <button
                                            key={`${item}-${index}`}
                                            onClick={() => {
                                                handleTimeChange({ ...parts, hour: parts.hour <= 12 ? (item === 12 && parts.hour !== 12 ? 0 : item) : item + 12 });
                                            }}
                                            className={cn(
                                                'font-figtree font-semibold text-lg rounded-xl cursor-pointer hover:bg-primary-extra-light transition-all h-11 aspect-square shrink-0 snap-center flex items-center justify-center',
                                                (parts.hour % 12 === 0 ? 12 : parts.hour % 12) === item ? 'bg-primary-extra-light' : '',
                                                (parts.hour > 12 ? item + 12 : item) < startTime.hour ? 'opacity-50 pointer-events-none' : ''
                                            )}
                                        >
                                            {item}
                                        </button>
                                    ))}

                                    <div className='h-[calc(50%-20px)]' />
                                </div>
                            </div>

                            <div className='relative h-full overflow-y-auto'>
                                <div
                                    ref={minutesContainerRef}
                                    className='overflow-y-auto flex flex-col gap-1 w-full h-full scrollbar-hide'
                                    style={{
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                    }}
                                >
                                    {MINUTES.map((item, index) => (
                                        <button
                                            key={`${item}-${index}`}
                                            onClick={() => {
                                                handleTimeChange({ ...parts, minute: item });
                                            }}
                                            className={cn(
                                                'font-figtree font-semibold text-lg rounded-xl cursor-pointer hover:bg-primary-extra-light transition-all h-11 aspect-square shrink-0 snap-center flex items-center justify-center',
                                                parts.minute === item ? 'bg-primary-extra-light' : '',
                                                (parts.hour === startTime.hour && item <= startTime.minute) || parts.hour < startTime.hour ? 'opacity-50 pointer-events-none' : ''
                                            )}
                                        >
                                            {MINUTES[MINUTES.length - 1] === 55 ? item.toString().padStart(2, '0') : item}
                                        </button>
                                    ))}

                                    <div className='h-[calc(50%-20px)]' />
                                </div>
                            </div>

                            <div className='overflow-y-auto flex flex-col justify-start gap-1 w-full h-auto snap-y snap-mandatory' style={{ scrollbarWidth: 'none' }}>
                                <button
                                    onClick={() => {
                                        if (parts.hour >= 12) {
                                            handleTimeChange({ ...parts, hour: parts.hour - 12 });
                                        }
                                    }}
                                    className={cn(
                                        'font-figtree cursor-pointer font-semibold text-lg rounded-xl hover:bg-primary-extra-light transition-all h-11 shrink-0 snap-center flex items-center justify-center',
                                        parts.hour < 12 ? 'bg-primary-extra-light' : ''
                                    )}
                                >
                                    AM
                                </button>
                                <button
                                    onClick={() => {
                                        if (parts.hour < 12) {
                                            handleTimeChange({ ...parts, hour: parts.hour + 12 });
                                        }
                                    }}
                                    className={cn(
                                        'font-figtree cursor-pointer font-semibold text-lg rounded-xl hover:bg-primary-extra-light transition-all h-11 shrink-0 snap-center flex items-center justify-center',
                                        parts.hour >= 12 ? 'bg-primary-extra-light' : ''
                                    )}
                                >
                                    PM
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
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

export const HorseDetailView = ({ horse, onClose }: { horse: any; onClose: () => void }) => {
    const genderStyles = {
        mare: 'bg-pink-50 text-pink-700 border-pink-100',
        filly: 'bg-pink-50 text-pink-700 border-pink-100',
        gelding: 'bg-blue-50 text-blue-700 border-blue-100',
        colt: 'bg-blue-50 text-blue-700 border-blue-100',
        stallion: 'bg-red-50 text-red-700 border-red-100',
        null: 'bg-gray-50 text-gray-700 border-gray-100',
        undefined: 'bg-gray-50 text-gray-700 border-gray-100',
    };

    return (
        <div className='flex flex-col bg-primary-extra-light overflow-y-auto @container/horse-detail'>
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
