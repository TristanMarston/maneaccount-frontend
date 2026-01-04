'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    Bell,
    BellOff,
    ChevronRight,
    MapPin,
    Clock,
    List,
    Grid3X3,
    Columns,
    X,
    Trash2,
    PlusCircle,
    MoreHorizontal,
    Ellipsis,
    Pencil,
    Info,
    Check,
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO,
    startOfWeek as startOfWeekFns,
    addDays,
    isEqual,
} from 'date-fns';
import { deleteShow, getInvites, getShows, respondToShowInvite } from '@/app/actions/calendar';
import { cn } from '@/lib/utils';
import Modal from '../../Modal';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { failToast, successToast, usaStates } from '@/app/context';
import AddShowForm, { getParts } from './AddShowForm';
import { getJobs } from '@/app/actions/jobs';
import { JobDetailView, HorseDetailView } from '../_tasks/Tasks';
import Image from 'next/image';

type CalendarViewType = 'month' | 'week' | 'list';

export interface Show {
    id: string;
    name: string;
    city: string;
    state?: string | null;
    country: string;
    startDate: Date;
    endDate: Date;
    days: { date: Date; startTime: string; endTime: string; skipped: boolean }[];
    type?: 'show' | 'job';
    jobData?: any;
    isOwner?: boolean;
    inviteStatus?: string | null;
    inviterName?: string | null;
    inviteId?: string;
}

const ShowDetailsModal = ({
    show,
    onClose,
    onEdit,
    onDelete,
    handleInviteResponse,
    showDetailsRef,
}: {
    show: Show;
    onClose: () => void;
    onEdit: (show: Show) => void;
    onDelete: (show: Show) => void;
    handleInviteResponse: (showId: string, status: 'accepted' | 'declined') => void;
    showDetailsRef?: React.RefObject<HTMLDivElement | null>;
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(modalRef, [], () => onClose());

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='absolute inset-0 z-70 flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-4'
                    onClick={onClose}
                    ref={showDetailsRef}
                >
                    <motion.div
                        initial={{ scale: 0, rotate: '12.5deg' }}
                        animate={{ scale: 1, rotate: '0deg' }}
                        exit={{ scale: 0, rotate: '0deg' }}
                        onClick={(e) => e.stopPropagation()}
                        ref={modalRef}
                        className='bg-white w-full font-figtree max-w-sm overflow-hidden rounded-[18px] primary-border max-h-[90dvh] overflow-y-auto @container/show-details'
                    >
                        <div className='p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50'>
                            <div className='min-w-0 w-full'>
                                <h3 className='text-2xl font-bold font-lusitana text-gray-900 truncate' title={show.name}>
                                    {show.name}
                                </h3>
                                <div className='flex items-center gap-1 mt-1 text-sm text-gray-500 font-figtree'>
                                    <MapPin size={16} className='text-primary flex-none' />
                                    <span className='truncate'>
                                        {show.city}, {show.state || show.country}
                                    </span>
                                </div>
                                {show.inviteStatus === 'pending' ? (
                                    <div className='mt-2 w-full'>
                                        <div className='px-4 min-w-0 flex items-center justify-between gap-2 relative py-2 bg-yellow-50 w-full text-yellow-700 rounded-lg text-[15px] font-semibold border border-yellow-200/50'>
                                            <span className='truncate'>Invited by {show.inviterName || 'User'}</span>
                                            <div className='flex items-center gap-2 right-3 -top-3'>
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        handleInviteResponse(show.id, 'accepted');
                                                    }}
                                                    className='p-1 bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100 w-fit text-xs font-semibold flex gap-1 rounded-lg cursor-pointer transition-all'
                                                >
                                                    <Check className='w-4 h-4' />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        handleInviteResponse(show.id, 'declined');
                                                    }}
                                                    className='p-1 bg-red-50 text-red-700 border border-red-200/50 hover:bg-red-100 w-fit text-xs font-semibold flex gap-1 rounded-lg cursor-pointer transition-all'
                                                >
                                                    <X className='w-4 h-4' />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='flex gap-2 items-center'>
                                        {show.isOwner && (
                                            <>
                                                <div
                                                    onClick={() => onEdit(show)}
                                                    className='text-gray-500 flex gap-2 mt-2 cursor-pointer items-center font-figtree text-sm hover:bg-gray-100 rounded-lg w-fit px-2 py-0.5 -ml-2 transition-all'
                                                >
                                                    <Pencil size={14} />
                                                    Edit
                                                </div>
                                                <div
                                                    onClick={() => {
                                                        onClose();
                                                        onDelete(show);
                                                    }}
                                                    className='text-gray-500 flex gap-2 mt-2 cursor-pointer items-center font-figtree text-sm hover:bg-gray-100 rounded-lg w-fit px-2 py-0.5 -ml-2 transition-all'
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </div>
                                            </>
                                        )}
                                        {!show.isOwner && show.inviteStatus === 'accepted' && (
                                            <div
                                                onClick={() => {
                                                    onClose();
                                                    onDelete(show);
                                                }}
                                                className='text-gray-500 flex gap-2 mt-2 cursor-pointer items-center font-figtree text-sm hover:bg-gray-100 rounded-lg w-fit px-2 py-0.5 -ml-2 transition-all'
                                            >
                                                <Trash2 size={14} />
                                                Remove
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <X onClick={onClose} className='text-gray-500 min-w-6 cursor-pointer hover:scale-105 transition-all' />
                        </div>
                        <div className='p-5 font-figtree space-y-4'>
                            <div className='flex items-center gap-3 p-3 bg-primary-extra-light/50 rounded-xl border border-primary/10'>
                                <div className='p-2 bg-white rounded-lg shadow-sm text-primary'>
                                    <CalendarIcon size={18} />
                                </div>
                                <div>
                                    <p className='text-xs font-bold text-primary uppercase tracking-wide'>Dates</p>
                                    <p className='text-sm font-medium text-gray-900'>
                                        {format(new Date(show.startDate), 'MMM d')} - {format(new Date(show.endDate), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-2'>Schedule</p>
                                <div className='space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar'>
                                    {show.days.map((day, idx) => {
                                        const startParts = getParts(day.startTime);
                                        const endParts = getParts(day.endTime);

                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    'flex items-center justify-between text-sm p-2 rounded-lg',
                                                    day.skipped ? 'bg-gray-50 text-gray-400' : 'bg-white border border-gray-100'
                                                )}
                                            >
                                                <div className={cn('flex items-center justify-between gap-2', day.skipped ? 'w-full' : 'w-auto')}>
                                                    <span className={cn('font-bold', day.skipped ? 'text-gray-400' : 'text-gray-700')}>{format(new Date(day.date), 'MMM d')}</span>
                                                    {day.skipped && <span className='text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full font-medium'>Skipped</span>}
                                                </div>
                                                {!day.skipped && (
                                                    <div className='flex items-center gap-1.5 text-gray-600 font-medium'>
                                                        <Clock size={12} className='text-primaryh hidden @min-[270px]/show-details:block' />
                                                        <span>
                                                            {format(new Date().setHours(startParts.hour, startParts.minute), 'h:mm a')} -{' '}
                                                            {format(new Date().setHours(endParts.hour, endParts.minute), 'h:mm a')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const DayDetailsModal = ({
    day,
    onClose,
    onEventClick,
    getShowsForDay,
}: {
    day: Date | null;
    onClose: () => void;
    onEventClick: (show: Show) => void;
    getShowsForDay: (day: Date) => Show[];
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(modalRef, [], () => onClose());

    return (
        <AnimatePresence>
            {day && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className='absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px] p-4'
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0, rotate: '-12.5deg' }}
                        animate={{ scale: 1, rotate: '0deg' }}
                        exit={{ scale: 0, rotate: '0deg' }}
                        onClick={(e) => e.stopPropagation()}
                        ref={modalRef}
                        className='bg-white w-full max-w-sm overflow-hidden rounded-[18px] primary-border max-h-[90dvh] overflow-y-auto @container/day-details'
                    >
                        <div className='p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50'>
                            <h3 className='text-2xl font-bold font-lusitana text-gray-900 truncate min-w-0'>{format(day, 'MMMM d, yyyy')}</h3>
                            <X onClick={onClose} className='text-gray-500 min-w-6 cursor-pointer hover:scale-105 transition-all' />
                        </div>
                        <div className='p-5 font-figtree'>
                            <p className='text-xs font-bold text-gray-400 uppercase tracking-wide mb-3'>Events</p>
                            <div className='space-y-2 max-h-[300px] overflow-y-auto pb-1 pr-1 custom-scrollbar'>
                                {getShowsForDay(day).length > 0 ? (
                                    getShowsForDay(day).map((show) => (
                                        <button
                                            key={show.id}
                                            onClick={() => onEventClick(show)}
                                            className={cn(
                                                'w-full cursor-pointer text-left flex flex-col gap-1 p-3 bg-white border border-gray-100 rounded-xl hover:border-primary/30 shadow-sm transition-all group',
                                                show.type === 'job' ? 'bg-blue-50 border-blue-200 hover:border-blue-200' : ''
                                            )}
                                        >
                                            <div className='flex justify-between items-start gap-2 w-full'>
                                                <span
                                                    className={cn(
                                                        'font-bold text-gray-900 group-hover:text-primary transition-colors truncate min-w-0',
                                                        show.type === 'job' ? 'group-hover:text-blue-500' : ''
                                                    )}
                                                >
                                                    {show.name}
                                                </span>
                                                {show.type === 'job' && (
                                                    <span>
                                                        <div className='font-figtree font-bold text-xs px-2 py-0.5 border text-blue-500 bg-blue-100 shadow-sm uppercase border-blue-200 rounded-lg'>
                                                            JOB
                                                        </div>
                                                    </span>
                                                )}
                                                {/* <div className='px-2 py-0.5 rounded-full bg-primary-extra-light text-primary text-[10px] font-bold uppercase'>Show</div> */}
                                            </div>
                                            <div className='flex items-center gap-4 text-xs text-gray-500 min-w-0'>
                                                <span className='flex items-center gap-1 truncate min-w-0'>
                                                    <MapPin size={12} /> {show.city}, {show.state || show.country}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className='text-center py-8 text-gray-400 text-sm'>No events scheduled for this day.</div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

import { getDashboardData } from '@/app/actions/dashboard';

const Calendar = ({ role, userEmail, setSelectedPage }: { role: string; userEmail: string; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const [view, setView] = useState<CalendarViewType>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shows, setShows] = useState<Show[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isDeleting, setIsDeleting] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
    const [editingShow, setEditingShow] = useState<Show | null>(null);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [viewingShow, setViewingShow] = useState<Show | null>(null);
    const [selectedHorse, setSelectedHorse] = useState<any | null>(null);
    const showDetailsRef = useRef<HTMLDivElement>(null);

    const loadShows = async () => {
        setLoading(true);
        const result = await getDashboardData(role);

        if (result.error) {
            console.error(result.error);
            setLoading(false);
            return;
        }

        const { shows: showsData, jobs: jobsData } = result;

        const mappedJobs: Show[] = (jobsData as any[])
            .map((job) => {
                if (!job.scheduledStartTime) return null;

                const start = new Date(job.scheduledStartTime);
                const end = job.scheduledEndTime ? new Date(job.scheduledEndTime) : new Date(start.getTime() + 60 * 60 * 1000);

                return {
                    id: job.id,
                    name: job.show?.name || 'Job',
                    city: job.show?.city || '',
                    state: job.show?.state || '',
                    country: 'USA',
                    startDate: start,
                    endDate: end,
                    days: [
                        {
                            date: start,
                            startTime: format(start, 'HH:mm'),
                            endTime: format(end, 'HH:mm'),
                            skipped: false,
                        },
                    ],
                    type: 'job' as 'show' | 'job',
                    jobData: job,
                    isOwner: true,
                };
            })
            .filter((item) => item !== null);

        // @ts-ignore
        setShows([...showsData, ...mappedJobs]);
        setLoading(false);
    };

    useEffect(() => {
        loadShows();
    }, [userEmail]);

    const navigate = (direction: 'prev' | 'next') => {
        if (view === 'month') {
            setCurrentDate((curr) => (direction === 'prev' ? subMonths(curr, 1) : addMonths(curr, 1)));
        } else if (view === 'week') {
            setCurrentDate((curr) => (direction === 'prev' ? addDays(curr, -7) : addDays(curr, 7)));
        }
    };

    const handleShowClick = (show: Show) => {
        if (show.type === 'job') {
            setSelectedJob(show.jobData);
        } else {
            setViewingShow(show);
        }
    };

    const handleInviteResponse = async (showId: string, status: 'accepted' | 'declined') => {
        if (!showId) return;

        const res = await respondToShowInvite(showId, status);
        if (res.success) {
            successToast(status === 'accepted' ? 'Accepted invitation!' : 'Declined invitation');
            loadShows();
        } else {
            failToast(status === 'accepted' ? 'Failed to accept invitation' : 'Failed to decline invitation');
        }
    };

    const handleEdit = (show: Show) => {
        if (show.type === 'job') return;
        setEditingShow(show);
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        const result = await deleteShow(id);

        if (result.success) {
            loadShows();
            successToast('Successfully deleted!');
        } else failToast('Failed to delete. Please try again.');

        setIsDeleting({ open: false, id: '', name: '' });
    };

    return (
        <>
            <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-8 h-full @container/calendar'>
                <header className='flex gap-6 mb-4 justify-between items-start'>
                    <div className='space-y-2 w-full @min-[400px]/calendar:w-auto'>
                        <h1 className='text-3xl @min-[280px]/calendar:text-[33px] @min-[310px]/calendar:text-4xl font-lusitana font-bold text-gray-900'>Calendar</h1>
                        <div className='flex justify-between w-full mb-3 @min-[550px]/calendar:hidden'>
                            <div className='flex gap-2 items-center'>
                                {role.toLowerCase() !== 'braider' && (
                                    <Notifications
                                        email={userEmail}
                                        handleInviteResponse={handleInviteResponse}
                                        setSelectedShow={setViewingShow}
                                        showDetailsRef={showDetailsRef}
                                        className='flex @min-[550px]/calendar:hidden'
                                    />
                                )}
                                <ViewSwitcher view={view} setView={setView} className='grid @min-[550px]/calendar:hidden' />
                            </div>
                            {role.toLowerCase() === 'braider' && (
                                <button
                                    onClick={() => {
                                        setEditingShow(null);
                                        setIsAdding(true);
                                    }}
                                    className='h-full font-figtree cursor-pointer font-bold flex @min-[400px]/calendar:hidden gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] p-[7px] @min-[320px]/calendar:px-4 @min-[320px]/calendar:py-[5px] bg-primary-light text-background primary-border-hover'
                                >
                                    <PlusCircle className='w-6 h-6' strokeWidth={2.5} />
                                    <span className='hidden @min-[320px]/calendar:block'>Add Show</span>
                                </button>
                            )}
                        </div>
                        {view !== 'list' && <MonthNavigation navigate={navigate} currentDate={currentDate} className='flex @min-[400px]/calendar:hidden py-[5px] w-full' />}
                    </div>

                    <div className='hidden @min-[400px]/calendar:flex items-start gap-3 h-full'>
                        {role.toLowerCase() !== 'braider' && (
                            <Notifications
                                email={userEmail}
                                handleInviteResponse={handleInviteResponse}
                                setSelectedShow={setViewingShow}
                                showDetailsRef={showDetailsRef}
                                anchor={view === 'list' ? 'right' : 'left'}
                                className='hidden @min-[550px]/calendar:flex'
                            />
                        )}
                        <ViewSwitcher view={view} setView={setView} className='hidden @min-[550px]/calendar:grid' />
                        {view !== 'list' && <MonthNavigation navigate={navigate} currentDate={currentDate} className='hidden @min-[400px]/calendar:flex' />}

                        {role.toLowerCase() === 'braider' && (
                            <button
                                onClick={() => {
                                    setEditingShow(null);
                                    setIsAdding(true);
                                }}
                                className='h-full font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] @min-[670px]/calendar:rounded-[10px] p-2.5 @min-[670px]/calendar:py-2 @min-[670px]/calendar:px-6 bg-primary-light text-background primary-border-hover'
                            >
                                <PlusCircle className='w-6 h-6' strokeWidth={2.5} />
                                <span className='hidden @min-[670px]/calendar:block'>Add Show</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className='flex-1 bg-white h-[calc(100%-146px)] @min-[400px]/calendar:h-[calc(100%-116px)] @min-[550px]/calendar:h-[calc(100%-64px)] rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative'>
                    {loading ? (
                        <div className='absolute inset-0 flex items-center justify-center'>
                            <span className='loader-primary'></span>
                        </div>
                    ) : (
                        <>
                            {view === 'month' && (
                                <MonthView
                                    currentDate={currentDate}
                                    shows={shows}
                                    onEdit={handleEdit}
                                    onDelete={(id, name) => setIsDeleting({ open: true, id, name })}
                                    onShowClick={handleShowClick}
                                    role={role}
                                />
                            )}
                            {view === 'week' && (
                                <WeekView
                                    currentDate={currentDate}
                                    shows={shows}
                                    onEdit={handleEdit}
                                    onDelete={(id, name) => setIsDeleting({ open: true, id, name })}
                                    onShowClick={handleShowClick}
                                    role={role}
                                />
                            )}
                            {view === 'list' && (
                                <ListView shows={shows} onEdit={handleEdit} onDelete={(id, name) => setIsDeleting({ open: true, id, name })} onShowClick={handleShowClick} role={role} />
                            )}
                        </>
                    )}
                </div>
            </div>
            <Modal
                isOpen={isAdding}
                setIsOpen={(val: boolean) => {
                    setIsAdding(val);
                    if (!val) setEditingShow(null);
                }}
                closeOnOutsideClick={false}
                className='max-w-2xl p-7 rounded-[18px] primary-border-bold relative overflow-visible!'
            >
                <AddShowForm
                    onClose={() => {
                        setIsAdding(false);
                        setEditingShow(null);
                    }}
                    onSuccess={() => {
                        setIsAdding(false);
                        setEditingShow(null);
                        loadShows();
                    }}
                    initialData={editingShow || undefined}
                    userEmail={userEmail}
                />
            </Modal>
            <Modal
                isOpen={isDeleting.open}
                setIsOpen={(val: boolean) => setIsDeleting({ open: val, id: '', name: '' })}
                closeOnOutsideClick={false}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative @container/check-team'
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                        This will delete <span className='font-bold'>{isDeleting.name}</span> from your calendar.
                    </p>
                    <div className='grid @min-[300px]/check-team:grid-cols-2 gap-3 mt-4'>
                        <button
                            onClick={() => setIsDeleting({ open: false, id: '', name: '' })}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleDelete(isDeleting.id)}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
            <ShowDetailsModal
                show={viewingShow!}
                onClose={() => setViewingShow(null)}
                onEdit={(show) => {
                    setViewingShow(null);
                    setEditingShow(show);
                    setIsAdding(true);
                }}
                onDelete={(show) => {
                    setViewingShow(null);
                    setIsDeleting({ open: true, id: show.id, name: show.name });
                }}
                handleInviteResponse={handleInviteResponse}
                showDetailsRef={showDetailsRef}
            />
            <Modal isOpen={!!selectedJob} setIsOpen={() => setSelectedJob(null)} className='max-w-xl p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                {selectedJob && (
                    <JobDetailView
                        job={selectedJob}
                        role={role}
                        userEmail={userEmail}
                        onClose={() => setSelectedJob(null)}
                        refresh={loadShows}
                        handleCancelJobModal={() => {
                            setSelectedJob(null);
                            setSelectedPage(role === 'client' ? 'Services' : 'Tasks');
                        }}
                        setSelectedHorse={setSelectedHorse}
                        setCheckMarkedCompleted={() => {}}
                        type='calendar'
                    />
                )}
            </Modal>
            <Modal isOpen={!!selectedHorse} setIsOpen={() => setSelectedHorse(null)} className='max-w-xl p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                {selectedHorse && <HorseDetailView horse={selectedHorse} onClose={() => setSelectedHorse(null)} />}
            </Modal>
        </>
    );
};

const Notifications = ({
    email,
    handleInviteResponse,
    setSelectedShow,
    showDetailsRef,
    className = '',
    anchor = 'left',
}: {
    email: string;
    handleInviteResponse: (showId: string, status: 'accepted' | 'declined') => void;
    setSelectedShow: React.Dispatch<React.SetStateAction<Show | null>>;
    showDetailsRef: React.RefObject<HTMLDivElement | null>;
    className?: string;
    anchor?: 'left' | 'right';
}) => {
    const [invites, setInvites] = useState<any[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(bellRef, [showDetailsRef], () => setNotificationsOpen(false));

    useEffect(() => {
        const getCalendarInvites = async () => {
            const inv = await getInvites(email);
            setInvites([...inv]);
        };

        getCalendarInvites();
    }, [notificationsOpen]);

    return (
        <div ref={bellRef} className={cn('h-full my-auto flex items-center justify-center relative', className)}>
            <Bell
                className='w-10 min-h-10 text-primary p-2 h-full rounded-full hover:bg-primary-extra-light transition-all cursor-pointer'
                onClick={() => setNotificationsOpen((prev) => !prev)}
            />
            {invites.filter((i) => i.status === 'pending').length > 0 && (
                <div className='absolute right-2.5 top-2 bg-red-400 shadow-sm p-1 text-background font-figtree rounded-full w-2 h-2' />
            )}

            <AnimatePresence>
                {notificationsOpen && (
                    <motion.div
                        variants={{
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
                        }}
                        initial='closed'
                        animate={notificationsOpen ? 'open' : 'closed'}
                        exit='closed'
                        className={cn(
                            'absolute top-[calc(100%+24px)] w-[80vw] dashboard-sm:w-[50vw] @min-[550px]/calendar:w-[380px] @min-[730px]/calendar:w-[440px] primary-border font-figtree bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 z-40',
                            anchor === 'left' ? 'left-0' : 'right-0'
                        )}
                    >
                        <div className='p-5 @container/calendar-invites'>
                            <h1 className='font-lusitana font-bold text-gray-900 text-3xl mb-2'>Calendar Invites</h1>
                            <div className='flex flex-col gap-2 overflow-y-auto max-h-[340px] pr-1 pb-1'>
                                {invites.filter((i) => i.status === 'pending').length === 0 ? (
                                    <div className='bg-gray-50/50 rounded-2xl p-4 border border-dashed border-gray-200 grid place-items-center'>
                                        <BellOff className='p-3 rounded-full text-gray-400 w-16 h-16' />
                                        <p className='text-gray-500'>You have no invites.</p>
                                    </div>
                                ) : (
                                    invites
                                        .filter((i) => i.status === 'pending')
                                        .map((invite) => (
                                            <div key={invite.id} className='rounded-xl border border-gray-200 shadow-sm p-4'>
                                                <div onClick={() => setSelectedShow(invite.show)} className='flex justify-between items-center group cursor-pointer'>
                                                    <div className='min-w-0'>
                                                        <p className='text-gray-900 truncate font-lusitana font-bold text-[19px] group-hover:text-primary transition-all leading-[1.15]'>
                                                            {invite.show.name}
                                                        </p>
                                                        <p className='text-gray-500 min-w-0 truncate text-sm flex items-center gap-1 mt-0.5'>
                                                            <MapPin className='min-w-3.5 h-3.5' />{' '}
                                                            <span className='truncate'>
                                                                {invite.show.city}, {invite.show.state}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <Info className='min-w-10 h-10 rounded-full p-2 text-gray-400 group-hover:text-primary-light group-hover:bg-primary-extra-light transition-all' />
                                                </div>
                                                <div className='w-full rounded-full h-[0.4px] bg-gray-200 px-2 my-3' />
                                                <div className='flex flex-col gap-2 @min-[320px]/calendar-invites:gap-0 @min-[320px]/calendar-invites:flex-row @min-[320px]/calendar-invites:justify-between @min-[320px]/calendar-invites:items-center'>
                                                    <div className='flex items-center gap-3 min-w-0'>
                                                        <div className='min-w-9 h-9 relative'>
                                                            {invite.show.user.image ? (
                                                                <Image src={invite.show.user.image} alt={invite.show.user.name} fill className='rounded-full object-cover' />
                                                            ) : (
                                                                <div className='rounded-full bg-primary-extra-light flex items-center justify-center text-primary font-bold text-[13px]'>
                                                                    {invite.show.user.name.substring(0, 1).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className='flex flex-col justify-center min-w-0'>
                                                            <p className='text-gray-900 font-semibold text-sm leading-[1.15] truncate'>{invite.show.user.name}</p>
                                                            <p className='text-gray-500 text-xs flex items-center gap-1 capitalize leading-none'>{invite.show.user.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className='flex flex-col @min-[260px]/calendar-invites:grid grid-cols-2 @min-[320px]/calendar-invites:flex @min-[320px]/calendar-invites:flex-row gap-2 font-figtree font-semibold'>
                                                        <button
                                                            onClick={() => {
                                                                setNotificationsOpen(false);
                                                                handleInviteResponse(invite.show.id, 'declined');
                                                            }}
                                                            className='flex cursor-pointer gap-1 items-center justify-center py-1 px-3 @min-[320px]/calendar-invites:p-2.5 rounded-[10px] @min-[320px]/calendar-invites:rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors'
                                                        >
                                                            <X className='min-w-5 h-5' strokeWidth={3} />
                                                            <span className='block @min-[320px]/calendar-invites:hidden'>Decline</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setNotificationsOpen(false);
                                                                handleInviteResponse(invite.show.id, 'accepted');
                                                            }}
                                                            className='flex cursor-pointer gap-1 items-center justify-center py-1 px-3 @min-[320px]/calendar-invites:p-2.5 rounded-[10px] @min-[320px]/calendar-invites:rounded-xl bg-primary-light text-white hover:bg-primary transition-colors shadow-sm'
                                                        >
                                                            <Check className='min-w-5 h-5' strokeWidth={3} />
                                                            <span className='block @min-[320px]/calendar-invites:hidden'>Accept</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MonthNavigation = ({ navigate, currentDate, className = '' }: { navigate: (direction: 'prev' | 'next') => void; currentDate: Date; className?: string }) => {
    return (
        <div
            className={cn(
                'h-full font-figtree w-auto font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] @min-[670px]/calendar:rounded-[10px] px-2 py-2 bg-background text-primary primary-border',
                className
            )}
        >
            <button onClick={() => navigate('prev')} className='p-1 cursor-pointer hover:bg-gray-50 rounded-lg text-gray-600'>
                <ChevronLeft className='w-5 h-5' strokeWidth={2.5} />
            </button>
            <span className='font-bold w-[140px] text-gray-700 text-center select-none block @min-[400px]/calendar:hidden @min-[730px]/calendar:block'>
                {format(currentDate, 'MMMM yyyy')}
            </span>
            <span className='font-bold w-20 text-gray-700 text-center select-none hidden @min-[400px]/calendar:block @min-[730px]/calendar:hidden'>
                {format(currentDate, 'MMM yyyy')}
            </span>
            <button onClick={() => navigate('next')} className='p-1 cursor-pointer hover:bg-gray-50 rounded-lg text-gray-600'>
                <ChevronRight className='w-5 h-5' strokeWidth={2.5} />
            </button>
        </div>
    );
};

const ViewSwitcher = ({ view, setView, className = '' }: { view: CalendarViewType; setView: React.Dispatch<React.SetStateAction<CalendarViewType>>; className?: string }) => {
    return (
        <div className={cn('relative h-full grid grid-cols-3 w-fit items-center rounded-[14px] bg-primary-extra-light p-2 font-figtree', className)}>
            <button
                className={cn(
                    'cursor-pointer py-0 @min-[550px]/calendar:py-[3px] font-medium grid place-items-center pl-2 pr-3 transition-all relative w-full h-full',
                    view === 'month' ? 'text-background' : 'text-primary'
                )}
                onClick={() => setView('month')}
            >
                <Grid3X3 className='relative z-10' />
            </button>
            <button
                className={cn(
                    'cursor-pointer py-0 @min-[550px]/calendar:py-[3px] font-medium grid place-items-center px-2 transition-all relative w-full h-full',
                    view === 'week' ? 'text-background' : 'text-primary'
                )}
                onClick={() => setView('week')}
            >
                <Columns className='relative z-10' />
            </button>
            <button
                className={cn(
                    'cursor-pointer py-0 @min-[550px]/calendar:py-[3px] font-medium grid place-items-center pr-2 pl-3 transition-all relative w-full h-full',
                    view === 'list' ? 'text-background' : 'text-primary'
                )}
                onClick={() => setView('list')}
            >
                <List className='relative z-10' />
            </button>
            <div className={`absolute p-1 inset-0 z-0 flex ${view === 'list' ? 'justify-end' : view === 'month' ? 'justify-start' : 'justify-center'}`}>
                <motion.span layout transition={{ type: 'spring', damping: 22, stiffness: 250 }} className='h-full w-1/3 rounded-[14px] bg-primary' />
            </div>
        </div>
    );
};

const MonthView = ({
    currentDate,
    shows,
    onEdit,
    onDelete,
    onShowClick,
    role,
}: {
    currentDate: Date;
    shows: Show[];
    onEdit: (show: Show) => void;
    onDelete: (id: string, name: string) => void;
    onShowClick: (show: Show) => void;
    role: string;
}) => {
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);

    const getEndDate = () => {
        const days = eachDayOfInterval({ start: startDate, end: endOfWeek(monthEnd) });

        if (days.length / 7 < 6) {
            let tempDay = endOfWeek(addDays(monthEnd, 7));

            while (true) {
                const tempDays = eachDayOfInterval({ start: startDate, end: tempDay });
                if (tempDays.length / 7 === 6) return tempDay;
                tempDay = endOfWeek(addDays(tempDay, 7));
            }
        }
        return endOfWeek(monthEnd);
    };

    const endDate = getEndDate();
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getShowsForDay = (day: Date) => {
        return shows.filter((show) => show.days.some((d) => isSameDay(new Date(d.date), day) && !d.skipped));
    };

    return (
        <>
            <div className='h-full flex flex-col font-figtree relative overflow-hidden'>
                <div className='grid grid-cols-7 border-b border-gray-100 bg-primary-extra-light flex-none z-10'>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className='py-3 text-center text-xs font-bold text-primary uppercase tracking-wider'>
                            {day}
                        </div>
                    ))}
                </div>
                <div className='flex-1 overflow-y-auto min-h-0 @container/month-calendar'>
                    <div className='grid grid-cols-7 grid-rows-[repeat(6,minmax(100px,1fr))] min-h-full'>
                        {days.map((day, i) => {
                            let dayShows = getShowsForDay(day);
                            if (dayShows.length > 1) {
                                dayShows = dayShows.sort((a, b) => {
                                    const aDay = a.days.find((d) => isEqual(d.date.setHours(0, 0, 0, 0), day.setHours(0, 0, 0, 0)));
                                    const bDay = b.days.find((d) => isEqual(d.date.setHours(0, 0, 0, 0), day.setHours(0, 0, 0, 0)));

                                    if (!aDay || !bDay) return 0;
                                    return aDay.startTime.localeCompare(bDay.startTime);
                                });
                            }

                            return (
                                <div
                                    key={i}
                                    className={cn('border-r border-b border-gray-50 p-2 relative transition-colors', !isSameMonth(day, monthStart) && 'bg-gray-50/80 text-gray-300')}
                                >
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDay(day);
                                        }}
                                        className={cn(
                                            'text-sm cursor-pointer relative left-[50%] translate-x-[-50%] font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1',
                                            isToday(day) ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </span>

                                    {/* Small screen indicator */}
                                    <div className='flex @min-[550px]/month-calendar:hidden justify-center mt-1'>
                                        {dayShows.length > 0 && (
                                            <Ellipsis
                                                className='w-6 h-4 text-primary-light bg-primary-extra-light rounded-full px-1.5 py-0.5 cursor-pointer hover:brightness-[1.02] transition-colors'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDay(day);
                                                }}
                                                strokeWidth={3}
                                            />
                                        )}
                                    </div>

                                    {/* Large screen list */}
                                    <div className='flex-col gap-[3px] hidden @min-[550px]/month-calendar:flex'>
                                        {dayShows.slice(0, dayShows.length > 3 ? 2 : 3).map((show) => (
                                            <button
                                                key={show.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onShowClick(show);
                                                }}
                                                className={cn(
                                                    'text-[10px] w-full text-left cursor-pointer hover:bg-[#dae3de] transition-colors font-figtree px-1.5 py-0.5 rounded border truncate font-medium',
                                                    show.type === 'job'
                                                        ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                                        : 'bg-primary-extra-light text-primary border-[#dae3de]',
                                                    show.inviteStatus === 'pending' ? 'text-primary border-[#dae3de] bg-background opacity-80' : '',
                                                    show.jobData &&
                                                        (show.jobData.status === 'completed' ||
                                                            show.jobData.status === 'denied' ||
                                                            show.jobData.status === 'canceled' ||
                                                            show.jobData.status === 'sub_declined')
                                                        ? 'opacity-50'
                                                        : '',
                                                    show.jobData && show.jobData.status === 'sub_requested' && role === 'subcontractor' && show.jobData.subcontractorId
                                                        ? 'bg-background hover:bg-blue-50 opacity-80'
                                                        : ''
                                                )}
                                            >
                                                {show.name}
                                            </button>
                                        ))}
                                        {dayShows.length > 3 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDay(day);
                                                }}
                                                className='text-[10px] w-full flex items-center gap-1 justify-start cursor-pointer hover:bg-gray-100 transition-colors font-figtree bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-semibold'
                                            >
                                                <MoreHorizontal size={12} />
                                                <span>{dayShows.length - 2} more</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <DayDetailsModal
                day={selectedDay}
                onClose={() => setSelectedDay(null)}
                onEventClick={(show) => {
                    setSelectedDay(null);
                    onShowClick(show);
                }}
                getShowsForDay={getShowsForDay}
            />
        </>
    );
};

const WeekView = ({
    currentDate,
    shows,
    onEdit,
    onDelete,
    onShowClick,
    role,
}: {
    currentDate: Date;
    shows: Show[];
    onEdit: (show: Show) => void;
    onDelete: (id: string, name: string) => void;
    onShowClick: (show: Show) => void;
    role: string;
}) => {
    const startDate = startOfWeek(currentDate);
    const days = eachDayOfInterval({ start: startDate, end: addDays(startDate, 6) });
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollWidthRef = useRef<HTMLDivElement>(null);

    const getShowsForDay = (day: Date) => {
        return shows.filter((show) => show.days.some((d) => isSameDay(new Date(d.date), day) && !d.skipped));
    };

    const getEventStyle = (startTime: string, endTime: string) => {
        const start = getParts(startTime);
        const end = getParts(endTime);
        const startMinutes = start.hour * 60 + start.minute;
        const endMinutes = end.hour * 60 + end.minute;
        const top = (startMinutes / 1440) * 100;
        const height = ((endMinutes - startMinutes) / 1440) * 100;

        return {
            top: `${top}%`,
            height: `${height}%`,
        };
    };

    useEffect(() => {
        let index = -1;
        days.forEach((day, i) => (index = isToday(day) ? i : index));
        const container = containerRef.current;
        const scrollContainer = scrollWidthRef.current;

        if (container && index !== -1 && scrollContainer) {
            const width = container.clientWidth;
            let daysVisible = 7;

            if (width >= 850) return;
            else if (width >= 550) daysVisible = 5;
            else if (width >= 450) daysVisible = 4;
            else if (width >= 330) daysVisible = 3;
            else daysVisible = 2;

            if (daysVisible < index + 1 && scrollRef.current) {
                scrollRef.current.scrollLeft = (scrollContainer.clientWidth / 7) * index;
            }
        }
    }, []);

    return (
        <div ref={containerRef} className='h-full flex flex-col overflow-hidden relative @container/week-calendar'>
            <div ref={scrollRef} className='flex-1 overflow-auto relative font-figtree'>
                <div className='relative @min-[850px]/week-calendar:w-full @min-[550px]/week-calendar:w-[140%] @min-[450px]/week-calendar:w-[175%] @min-[330px]/week-calendar:w-[233.33%] w-[350%] min-h-full'>
                    <div className='flex sticky top-0 z-30 bg-primary-extra-light border-b-2 border-gray-100 h-[70px] uppercase'>
                        <div className='w-14 sticky left-0 top-0 z-40 bg-primary-extra-light border-r border-gray-100 flex-none' />

                        <div ref={scrollWidthRef} className='flex-1 flex'>
                            {days.map((day, i) => (
                                <div key={i} className='flex-1 py-3 text-center border-r border-gray-100 last:border-r-0'>
                                    <p className='text-xs font-bold text-primary tracking-wider mb-0.5'>{format(day, 'EEE')}</p>
                                    <div
                                        className={cn(
                                            'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mx-auto cursor-pointer transition-colors',
                                            isToday(day) ? 'bg-primary text-white' : 'text-gray-900'
                                        )}
                                        onClick={() => setSelectedDay(day)}
                                    >
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='flex relative min-h-[1440px]'>
                        <div className='w-14 flex-none border-r border-gray-100 bg-white sticky left-0 z-20'>
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className='h-[60px] relative border-b border-gray-50'>
                                    <span className='absolute -top-2.5 text-xs text-gray-400 font-medium bg-white px-1 w-full h-full flex justify-center'>
                                        {i === 0 ? '' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className='flex-1 flex'>
                            {days.map((day, i) => {
                                let dayShows = getShowsForDay(day);
                                if (dayShows.length > 1) {
                                    dayShows = dayShows.sort((a, b) => {
                                        const aDay = a.days.find((d) => isSameDay(new Date(d.date), day));
                                        const bDay = b.days.find((d) => isSameDay(new Date(d.date), day));

                                        if (!aDay || !bDay) return 0;
                                        return aDay.startTime.localeCompare(bDay.startTime);
                                    });
                                }

                                const overlap = Array.from({ length: dayShows.length }, () => false);
                                for (let i = 0; i < dayShows.length; i++) {
                                    const dayA = dayShows[i].days.find((d) => isSameDay(new Date(d.date), day));
                                    if (!dayA) continue;
                                    if (i + 1 > dayShows.length - 1) continue;
                                    const dayB = dayShows[i + 1].days.find((d) => isSameDay(new Date(d.date), day));
                                    if (!dayB) continue;

                                    const aParts = getParts(dayA.endTime);
                                    const bParts = getParts(dayB.startTime);

                                    if (new Date().setHours(aParts.hour, aParts.minute) > new Date().setHours(bParts.hour, bParts.minute)) overlap[i + 1] = true;
                                }

                                return (
                                    <div key={i} className='flex-1 border-r border-gray-100 last:border-r-0 relative h-full bg-white/50 even:bg-white'>
                                        {Array.from({ length: 24 }).map((_, h) => (
                                            <div key={h} className='h-[60px] border-b-2 border-gray-50/50 w-full' />
                                        ))}

                                        {dayShows.map((show, index) => {
                                            const daySchedule = show.days.find((d) => isSameDay(new Date(d.date), day));
                                            if (!daySchedule) return null;

                                            const style = getEventStyle(daySchedule.startTime, daySchedule.endTime);

                                            return (
                                                <button
                                                    key={show.id}
                                                    style={style}
                                                    onClick={() => onShowClick(show)}
                                                    className={cn(
                                                        'absolute inset-x-1 rounded-lg cursor-pointer bg-primary-extra-light border border-primary/20 p-1.5 overflow-hidden hover:brightness-95 transition-all text-left group z-10',
                                                        show.type === 'job' ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100' : '',
                                                        show.inviteStatus === 'pending' ? 'text-primary border-[#dae3de] bg-background opacity-80' : '',
                                                        show.jobData &&
                                                            (show.jobData.status === 'completed' ||
                                                                show.jobData.status === 'denied' ||
                                                                show.jobData.status === 'canceled' ||
                                                                show.jobData.status === 'sub_declined')
                                                            ? 'opacity-50'
                                                            : '',
                                                        index - 1 >= 0 && overlap[index - 1] && overlap[index] ? 'ml-8' : overlap[index] ? 'ml-4' : '',
                                                        show.jobData && show.jobData.status === 'sub_requested' && role === 'subcontractor' && show.jobData.subcontractorId
                                                            ? 'bg-background opacity-80 hover:bg-blue-50'
                                                            : ''
                                                    )}
                                                >
                                                    <div className='flex flex-col h-full'>
                                                        <span
                                                            className={cn(
                                                                'text-[11.5px] font-bold text-primary truncate group-hover:whitespace-normal leading-tight',
                                                                show.type === 'job' ? 'text-blue-500' : ''
                                                            )}
                                                        >
                                                            {show.name}
                                                        </span>
                                                        <span className='text-[10.5px] text-gray-500 truncate'>
                                                            {format(parseISO(`2000-01-01T${daySchedule.startTime}`), 'h:mm')} -{' '}
                                                            {format(parseISO(`2000-01-01T${daySchedule.endTime}`), 'h:mm a')}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <DayDetailsModal
                day={selectedDay}
                onClose={() => setSelectedDay(null)}
                onEventClick={(show) => {
                    setSelectedDay(null);
                    onShowClick(show);
                }}
                getShowsForDay={getShowsForDay}
            />
        </div>
    );
};

const ListView = ({
    shows,
    onEdit,
    onDelete,
    onShowClick,
    role,
}: {
    shows: Show[];
    onEdit: (show: Show) => void;
    onDelete: (id: string, name: string) => void;
    onShowClick: (show: Show) => void;
    role: string;
}) => {
    const allOccurrences = shows.flatMap((show) =>
        show.days
            .filter((day) => !day.skipped)
            .map((day) => ({
                ...show,
                occurrenceDate: new Date(day.date),
                startTime: day.startTime,
                endTime: day.endTime,
            }))
    );

    const groupedByDate: { [key: string]: typeof allOccurrences } = {};
    allOccurrences.forEach((occ) => {
        const dateKey = format(occ.occurrenceDate, 'yyyy-MM-dd');
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(occ);
    });

    const todayKey = format(new Date().setHours(0, 0, 0, 0), 'yyyy-MM-dd');
    if (Object.keys(groupedByDate).length > 0 && !groupedByDate[todayKey]) groupedByDate[todayKey] = [];

    const sortedDates = Object.keys(groupedByDate).sort();

    if (sortedDates.length === 0) return <div className='flex items-center justify-center h-full text-gray-400 font-figtree'>No upcoming events.</div>;

    useLayoutEffect(() => {
        const todayDate = new Date().setHours(0, 0, 0, 0);
        const todayKey = format(todayDate, 'yyyy-MM-dd');
        const todayElement = document.getElementById(todayKey);

        if (todayElement) {
            todayElement.scrollIntoView();
        }
    }, []);

    return (
        <div className='h-full overflow-y-auto custom-scrollbar bg-white @min-[700px]/calendar:grid grid-cols-[2fr_1fr] @container/list-calendar'>
            <div className='h-full p-5 @min-[350px]/list-calendar:p-6 @min-[550px]/list-calendar:p-8 space-y-4 w-full @min-[700px]/list-calendar:min-w-[520px] max-w-4xl font-figtree'>
                {sortedDates.map((dateKey, index) => {
                    const dayOccurrences = [...groupedByDate[dateKey]].sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const [year, month, day] = dateKey.split('-').map(Number);
                    const date = new Date(year, month - 1, day);

                    return (
                        <div className='space-y-4' id={dateKey} key={dateKey}>
                            <div className={cn('flex items-center gap-4 sticky top-0 bg-white z-10 pb-2', index === 0 ? 'pt-0' : 'pt-6')}>
                                <div
                                    className={cn(
                                        'flex flex-col items-center justify-center rounded-xl p-2 min-w-16 h-16 transition-all',
                                        isToday(date) ? 'bg-primary text-white shadow-lg scale-105' : 'bg-gray-50 text-gray-900 border border-gray-100'
                                    )}
                                >
                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', isToday(date) ? 'text-primary-extra-light' : 'text-gray-400')}>
                                        {format(date, 'MMM')}
                                    </span>
                                    <span className='text-2xl font-bold leading-none'>{format(date, 'd')}</span>
                                    <span className={cn('text-[9px] font-medium uppercase mt-0.5', isToday(date) ? 'text-primary-extra-light' : 'text-gray-400')}>
                                        {format(date, 'EEE')}
                                    </span>
                                </div>
                                <div className='h-px flex-1 bg-linear-to-r from-gray-100 to-white'></div>
                            </div>

                            <div className='grid gap-4 pl-2 @min-[550px]/list-calendar:pl-4 max-w-full'>
                                {dayOccurrences.length > 0 ? (
                                    dayOccurrences.map((occ, idx) => (
                                        <button
                                            key={`${occ.id}-${idx}`}
                                            onClick={() => onShowClick(occ)}
                                            className={cn(
                                                'w-full cursor-pointer overflow-hidden text-left flex flex-col @min-[600px]/list-calendar:flex-row @min-[600px]/list-calendar:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group',
                                                index === sortedDates.length - 1 && idx === dayOccurrences.length - 1 ? 'mb-7 @min-[350px]/list-calendar:mb-8' : '',
                                                occ.type === 'job' ? 'border-blue-200 bg-blue-50 hover:border-blue-200' : '',
                                                occ.inviteStatus === 'pending' ? 'opacity-70' : '',
                                                occ.jobData &&
                                                    (occ.jobData.status === 'completed' ||
                                                        occ.jobData.status === 'denied' ||
                                                        occ.jobData.status === 'canceled' ||
                                                        occ.jobData.status === 'sub_declined')
                                                    ? 'opacity-50'
                                                    : '',
                                                occ.jobData && occ.jobData.status === 'sub_requested' && role === 'subcontractor' && occ.jobData.subcontractorId ? 'opacity-70' : ''
                                            )}
                                        >
                                            <div className='flex-1 min-w-0'>
                                                <div className='flex justify-between items-start gap-3 min-w-0'>
                                                    <div className='flex items-center gap-2'>
                                                        <h3
                                                            className={cn(
                                                                'text-xl min-w-0 font-bold text-gray-900 font-lusitana group-hover:text-primary transition-colors truncate',
                                                                occ.type === 'job' ? 'group-hover:text-blue-500' : ''
                                                            )}
                                                        >
                                                            {occ.name}
                                                        </h3>
                                                        {occ.jobData && occ.jobData.status === 'sub_requested' && role === 'subcontractor' && occ.jobData.subcontractorId ? (
                                                            <span>
                                                                <div className='font-figtree font-bold text-xs px-2 py-0.5 border text-blue-500 bg-blue-100 shadow-sm uppercase border-blue-200 rounded-lg'>
                                                                    REQUESTED
                                                                </div>
                                                            </span>
                                                        ) : (
                                                            occ.type === 'job' && (
                                                                <span>
                                                                    <div className='font-figtree font-bold text-xs px-2 py-0.5 border text-blue-500 bg-blue-100 shadow-sm uppercase border-blue-200 rounded-lg'>
                                                                        JOB
                                                                    </div>
                                                                </span>
                                                            )
                                                        )}
                                                        {occ.inviteStatus === 'pending' && (
                                                            <span>
                                                                <div className='font-figtree font-bold text-xs px-2 py-0.5 border text-primary bg-primary-extra-light shadow-sm uppercase border-primary/10 rounded-lg'>
                                                                    INVITED
                                                                </div>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-500 font-figtree'>
                                                    <span className='flex items-center gap-2 font-medium'>
                                                        <MapPin size={16} className='text-primary/50' />
                                                        <span className='truncate'>
                                                            {occ.city}, {occ.state || occ.country}
                                                        </span>
                                                    </span>
                                                    <span className='flex items-center gap-2 font-medium'>
                                                        <Clock size={16} className='text-primary/50' />
                                                        {format(parseISO(`2000-01-01T${occ.startTime}`), 'h:mm a')} - {format(parseISO(`2000-01-01T${occ.endTime}`), 'h:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='flex-none opacity-0 group-hover:opacity-100 transition-opacity hidden @min-[600px]/calendar:block'>
                                                <div
                                                    className={cn(
                                                        'w-10 h-10 rounded-full bg-primary-extra-light flex items-center justify-center text-primary',
                                                        occ.type === 'job' ? 'bg-blue-100 text-blue-400' : ''
                                                    )}
                                                >
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className='flex items-center justify-center h-full text-gray-400 font-figtree'>No events for today.</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="w-full h-full hidden @min-[700px]/list-calendar:block bg-primary-light border-b border-gray-100 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]">
                <div className='absolute hidden @min-[700px]/list-calendar:block inset-0 top-0 left-0 h-full w-12 sudden-gradient'></div>
            </div>
        </div>
    );
};

export default Calendar;
