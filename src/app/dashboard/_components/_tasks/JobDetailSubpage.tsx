'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { MapPin, X, User, Info, CheckSquare, CheckCircle2, Calendar, CalendarCheck, ChevronLeft, Check, ChevronDown, CircleAlert, Loader, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { Job, statusColors } from './Tasks';
import {
    updateJobStatus,
    addNote,
    reRequestJob,
    deleteJob,
    markJobCompleted,
    toggleServiceCompletion,
    assignSubcontractorToAssignment,
    cancelAssignment,
    cancelAssignmentService,
} from '@/app/actions/jobs';
import { getTeamMembers } from '@/app/actions/team';
import { getIDByEmail } from '@/app/actions/join';
import { addShowToCalendar } from '@/app/actions/calendar';
import { successToast, failToast } from '@/app/context';
import Modal from '../../Modal';
import { AnimatePresence, motion, Variants } from 'motion/react';
import DatePicker from '../DatePicker';
import useScreenWidth from '@/hooks/useScreenWidth';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

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
                                              ? job.subcontractors.find((s) => s.name === note.author.name)?.name || ''
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

const SelectSubcontractorDropdown = ({
    value,
    subImage,
    onChange,
    loading,
    team,
    disabled,
    completed,
}: {
    value: string;
    subImage: string;
    onChange: (val: string) => void;
    loading: boolean;
    team: any[];
    disabled: boolean;
    completed: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(buttonRef, [], () => setIsOpen(false));

    const [disabledTooltip, setDisabledToolTip] = useState(false);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
    };

    const selectedMember = team.find((t) => t.id === value);

    const wrapperVariants: Variants = {
        open: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 24,
                duration: 0.15,
            },
        },
        closed: {
            opacity: 0,
            y: 10,
            transition: {
                duration: 0.15,
            },
        },
    };

    return (
        <div className='relative w-full' ref={buttonRef}>
            <button
                type='button'
                onClick={() => {
                    if (disabled || completed) return;
                    setIsOpen((prev) => !prev);
                }}
                onMouseEnter={() => setDisabledToolTip(true)}
                onMouseLeave={() => setDisabledToolTip(false)}
                className={cn(
                    'w-full @min-[530px]/assignment-detail:w-fit flex items-center justify-between gap-3 outline-none shadow-sm border cursor-pointer px-3 py-2 rounded-xl transition-all bg-white',
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300',
                    disabled || completed ? 'opacity-50 cursor-not-allowed hover:border-gray-200' : ''
                )}
            >
                <div className='flex items-center gap-2 text-sm min-w-0'>
                    <div className='min-w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100'>
                        {loading ? (
                            <Loader size={12} className='text-gray-400 animate-spin' />
                        ) : value && subImage.length > 0 ? (
                            <Image src={subImage} alt='Sub' width={20} height={20} className='w-full h-full object-cover' />
                        ) : (
                            <User size={12} className='text-gray-400' />
                        )}
                    </div>
                    <span
                        className={cn(
                            'truncate min-w-0',
                            value ? 'text-gray-900' : 'text-gray-500 font-medium',
                            loading ? 'text-transparent bg-gray-100 rounded-full animate-pulse' : ''
                        )}
                    >
                        {value ? selectedMember?.name || 'Unknown' : 'Myself'}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {disabled && disabledTooltip && (
                    <motion.div
                        initial='closed'
                        key='tooltip'
                        variants={wrapperVariants}
                        animate={disabledTooltip ? 'open' : 'closed'}
                        onMouseEnter={() => setDisabledToolTip(false)}
                        exit='closed'
                        transition={{ duration: 0.15 }}
                        className='max-h-56 absolute text-gray-500 flex items-center gap-2 text-nowrap text-sm px-3 py-1.5 bottom-[calc(100%+6px)] max-w-[300px] right-0 w-fit overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 shadow-xl'
                    >
                        <CircleAlert className='w-5 h-5' />
                        Accept the job first!
                    </motion.div>
                )}
                {!disabled && isOpen && (
                    <motion.div
                        initial='closed'
                        key='dropdown'
                        variants={wrapperVariants}
                        animate={isOpen ? 'open' : 'closed'}
                        exit='closed'
                        transition={{ duration: 0.15 }}
                        className='max-h-56 z-60 absolute overflow-x-hidden top-[calc(100%+6px)] w-full @min-[530px]/assignment-detail:w-fit @min-[530px]/assignment-detail:max-w-[300px] left-0 right-auto @min-[530px]/assignment-detail:right-0 @min-[530px]/assignment-detail:left-auto overflow-y-auto bg-white rounded-xl border border-gray-100 shadow-xl'
                    >
                        <button
                            type='button'
                            onClick={() => handleSelect('')}
                            className='w-full cursor-pointer text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-3 items-center justify-between transition-colors font-medium font-figtree'
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
                                className='w-full cursor-pointer text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-3 items-center justify-between transition-colors font-medium font-figtree'
                            >
                                <div className='flex items-center gap-2 min-w-0'>
                                    <div className='min-w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100'>
                                        {member.image ? (
                                            <Image src={member.image} alt='Sub' width={20} height={20} className='w-full h-full object-cover' />
                                        ) : (
                                            <div className='w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500'>{member.name[0]}</div>
                                        )}
                                    </div>
                                    <span className='text-nowrap truncate'>{member.name}</span>
                                </div>
                                {value === member.id && <Check size={14} className='text-primary' />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const JobDetailSubpage = ({
    job: initialJob,
    role,
    userEmail,
    onBack,
    refresh,
    handleCancelJobModal,
    setSelectedHorse,
    setCheckMarkedCompleted,
    canMarkCompleted = true,
}: {
    job: Job;
    role: string;
    userEmail: string;
    onBack: () => void;
    refresh: () => void;
    handleCancelJobModal: () => void;
    setSelectedHorse: React.Dispatch<React.SetStateAction<any | null>>;
    setCheckMarkedCompleted: React.Dispatch<React.SetStateAction<{ open: boolean; id: string; earnings: number; horses: number; services: number }>>;
    canMarkCompleted?: boolean;
}) => {
    const [job, setJob] = useState<Job>(initialJob);
    const [date, setDate] = useState<Date | null>(job.scheduledDate ? new Date(job.scheduledDate) : null);
    const [team, setTeam] = useState<any[]>([]);
    const [selectedSub, setSelectedSub] = useState('');
    const [userId, setUserId] = useState('');
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [subcontractorLoading, setSubcontractorLoading] = useState(-1);
    const [acceptJobHeight, setAcceptJobHeight] = useState(0);
    const [messagesPrescrolled, setMessagesPrescrolled] = useState(false);
    const acceptJobRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        const getContainerWidth = () => {
            if (containerRef && containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        getContainerWidth();
        window.addEventListener('resize', getContainerWidth);

        return () => window.removeEventListener('resize', getContainerWidth);
    }, [containerRef]);

    useEffect(() => {
        const scrollToBottom = () => {
            if (!messagesPrescrolled && messagesRef.current) {
                setMessagesPrescrolled(true);
                messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight });
            }
        };

        window.addEventListener('scroll', scrollToBottom, true);

        return () => window.removeEventListener('scroll', scrollToBottom, true);
    }, [job.notes, messagesRef, messagesPrescrolled]);

    useLayoutEffect(() => {
        const resizeWindow = () => {
            if (containerWidth <= 575) return;

            if (acceptJobRef && acceptJobRef.current && acceptJobHeight !== acceptJobRef.current.offsetHeight) {
                setAcceptJobHeight(acceptJobRef.current.offsetHeight);
            }
        };

        resizeWindow();
        window.addEventListener('scroll', resizeWindow, true);
        window.addEventListener('resize', resizeWindow);

        return () => {
            window.removeEventListener('scroll', resizeWindow, true);
            window.removeEventListener('resize', resizeWindow);
        };
    }, [initialJob, role, containerWidth]);

    useEffect(() => {
        setJob(initialJob);

        if (initialJob.scheduledDate && (!date || new Date(initialJob.scheduledDate).getTime() !== date.getTime())) {
            setDate(new Date(initialJob.scheduledDate));
        }
    }, [initialJob]);

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

    const handleAction = async (status: 'accepted' | 'denied', subId?: string) => {
        const res = await updateJobStatus(job.id, status as any, {
            scheduledDate: date || undefined,
            subcontractorIds: subId ? [subId] : selectedSub ? [selectedSub] : undefined,
        });

        if (res.success) {
            successToast(`Job ${status === 'denied' ? 'declined' : status}`);
            refresh();
            if (status === 'denied') onBack();
        } else {
            failToast('Failed to update');
        }
    };

    const handleAssignSub = async (assignmentId: string, subId: string, index: number) => {
        setSubcontractorLoading(index);
        const res = await assignSubcontractorToAssignment(assignmentId, subId);
        if (res.success) {
            refresh();
            setSubcontractorLoading(-1);
        } else {
            failToast('Failed to assign');
            setSubcontractorLoading(-1);
        }
    };

    const handleCancelAssignment = async (assignmentId: string) => {
        const res = await cancelAssignment(assignmentId);
        if (res.success) {
            successToast(res.message);
            refresh();
        } else {
            failToast('Failed to remove horse');
        }
    };

    const handleCancelService = async (assignmentId: string, serviceId: string) => {
        const res = await cancelAssignmentService(assignmentId, serviceId);
        if (res.success) {
            refresh();
        } else {
            failToast('Failed to cancel service');
        }
    };

    const handleToggleService = async (e: React.MouseEvent, assignmentId: string, serviceId: string) => {
        e.stopPropagation();
        const res = await toggleServiceCompletion(assignmentId, serviceId);
        if (res.success) {
            setJob((prev) => {
                if (!prev) return prev;

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
            onBack();
        } else {
            failToast('Failed to update');
        }
    };

    const handleDeleteJob = async () => {
        const res = await deleteJob(job.id);

        if (res.success) {
            successToast(`Job deleted`);
            refresh();
            onBack();
        } else {
            failToast('Failed to delete');
        }
    };

    // const handleAddToCalendar = async () => {
    //     const res = await addShowToCalendar(job.show.id);

    //     if (res.success) {
    //         successToast(`Event added to calendar!`);
    //         refresh();
    //     } else {
    //         failToast('Failed to add to calendar');
    //     }
    // };

    return (
        <div className='font-figtree pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 w-full h-full @container/job-subpage'>
            <div ref={containerRef} className='w-full'>
                <div className='flex flex-col gap-4 @min-[400px]/tasks:gap-0 @min-[400px]/tasks:flex-row @min-[400px]/tasks:justify-between @min-[400px]/tasks:items-start'>
                    <div>
                        <button
                            onClick={onBack}
                            className='flex items-center justify-center gap-1.5 rounded-xl bg-transparent border border-gray-200 px-4 py-1 text-gray-400 shadow-sm font-bold font-figtree mb-3 cursor-pointer hover:bg-gray-100 transition-all'
                        >
                            <ChevronLeft size={20} />
                            Back
                        </button>
                        <h1 className='text-3xl @min-[400px]/tasks:text-4xl font-lusitana font-bold text-gray-900'>{job.show.name}</h1>
                        <span className='text-gray-500 flex gap-1 items-center mt-1'>
                            <MapPin className='min-w-5 w-5' />
                            <p className='font-figtree text-lg'>
                                {job.show.city}, {job.show.state}
                            </p>
                        </span>
                    </div>
                </div>
            </div>

            <div className='flex-1 overflow-y-auto pr-1 pb-1 space-y-4 font-figtree pt-4'>
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
                            'text-sm absolute -top-4 right-2 font-bold px-3 py-0.5 rounded-full border uppercase tracking-wide my-1 bg-white',
                            statusColors[job.paidAt ? 'paid' : job.status]
                        )}
                    >
                        {job.paidAt ? 'paid' : job.status}
                    </span>
                </div>

                {job.scheduledDate && (
                    // <div className='flex flex-col @min-[450px]/job-detail:flex-row @min-[450px]/job-detail:items-center gap-2 w-full justify-between p-4 bg-white border border-[#dae3de] shadow-sm rounded-[14px]'>
                    //     <div>
                    //         <p className='font-bold text-primary-dark'>Expected Completion Date</p>
                    //         <h3 className='text-[13px] font-bold text-primary uppercase'>{format(new Date(job.scheduledDate), 'PPPP')}</h3>
                    //     </div>
                    //     {role !== 'braider' && job.show.invites.filter((invite) => invite && invite.inviteeId === userId && invite.status === 'accepted').length === 0 && (
                    //         <div
                    //             onClick={handleAddToCalendar}
                    //             className='bg-primary-light/30 flex items-center gap-2 px-4 py-1 rounded-[10px] cursor-pointer hover:bg-primary-light/40 transition-all text-primary shadow-sm text-sm font-semibold border border-primary'
                    //         >
                    //             <Calendar className='w-4 h-4' />
                    //             Add to Calendar
                    //         </div>
                    //     )}
                    //     {role !== 'braider' && job.show.invites.filter((invite) => invite && invite.inviteeId === userId && invite.status === 'accepted').length === 1 && (
                    //         <div className='bg-primary-light/30 flex items-center gap-2 px-4 py-1 rounded-[10px] cursor-pointer transition-all text-primary shadow-sm text-sm font-semibold border border-primary'>
                    //             <CalendarCheck className='w-4 h-4' />
                    //             Added to Calendar
                    //         </div>
                    //     )}
                    // </div>
                    <div className='flex flex-col @min-[450px]/job-detail:flex-row @min-[450px]/job-detail:items-center gap-2 w-full justify-between p-4 bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px]'>
                        <div>
                            <p className='font-bold text-primary-dark'>Expected Completion Date</p>
                            <h3 className='text-[13px] font-bold text-primary uppercase'>{format(new Date(job.scheduledDate), 'PPPP')}</h3>
                        </div>
                    </div>
                )}

                {role === 'braider' && job.subcontractors.length > 0 && (
                    <div className='flex flex-col gap-5 pt-1.5'>
                        {job.subcontractors.map((sub, idx) => {
                            const horses = job.assignments.filter((a) => a.subcontractor?.id === sub.id);
                            const completedHorses = horses.filter(
                                (h) => [...new Set(h.completedServiceIds)].length + [...new Set(h.canceledServiceIds)].length === [...new Set(h.services)].length
                            );
                            const finishedAllServices = completedHorses.length === horses.length;

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        'flex items-center gap-3 p-4 border shadow-sm rounded-[14px] relative',
                                        finishedAllServices ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'
                                    )}
                                >
                                    <div className={cn('relative min-w-10 h-10 rounded-full overflow-hidden', finishedAllServices ? 'bg-blue-100' : 'bg-amber-100')}>
                                        {sub.image ? (
                                            <Image src={sub.image} alt='Sub' fill className='object-cover' />
                                        ) : (
                                            <User className={cn('w-full h-full p-2', finishedAllServices ? 'text-blue-300' : 'text-amber-400')} />
                                        )}
                                    </div>
                                    <div className='min-w-0'>
                                        <p className={cn('text-xs uppercase font-bold', finishedAllServices ? 'text-blue-500' : 'text-amber-500')}>Assigned To</p>
                                        <p className={cn('font-bold text-blue-900 truncate', finishedAllServices ? 'text-blue-900' : 'text-amber-900')}>{sub.name}</p>
                                    </div>
                                    <span
                                        className={cn(
                                            'text-sm absolute -top-4 right-2 font-bold px-3 py-0.5 rounded-full border uppercase tracking-wide my-1 bg-white',
                                            finishedAllServices ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                                        )}
                                    >
                                        {completedHorses.length}/{horses.length} Completed
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div>
                    <h3 className='text-sm font-bold text-gray-500 uppercase mb-3'>Assignments • {format(new Date(job.createdAt), 'P')}</h3>
                    <div className='space-y-4'>
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.id === userId)
                            .sort((a, b) => a.horse.barnName.localeCompare(b.horse.barnName.toUpperCase()))
                            .map((assignment, i) => {
                                const activeServices = assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id));
                                const isAssignmentCanceled = !!assignment.canceledAt || activeServices.length === 0;

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            'bg-white rounded-2xl border border-gray-200 p-4 shadow-sm transition-all @container/assignment-detail',
                                            isAssignmentCanceled ? 'opacity-60 bg-gray-50' : '',
                                            !isAssignmentCanceled &&
                                                activeServices.length === [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length
                                                ? 'bg-primary-extra-light border-primary/20'
                                                : ''
                                        )}
                                    >
                                        <div className='flex justify-between items-start mb-3'>
                                            <div onClick={() => setSelectedHorse(assignment.horse)} className='flex items-center min-w-0 gap-3 cursor-pointer group flex-1'>
                                                <div className='min-w-10 min-h-10 grid place-items-center rounded-full bg-gray-100 overflow-hidden relative'>
                                                    {assignment.horse.profileImage ? (
                                                        <Image src={assignment.horse.profileImage} alt={assignment.horse.barnName} fill className='object-cover' />
                                                    ) : (
                                                        <div className='w-full h-full flex items-center justify-center bg-primary/5 text-primary font-bold text-xs font-figtree'>
                                                            {assignment.horse.barnName[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='flex flex-col min-w-0'>
                                                    <span
                                                        className={cn(
                                                            'font-bold truncate group-hover:text-primary transition-colors',
                                                            isAssignmentCanceled ? 'text-gray-500 line-through' : 'text-gray-900'
                                                        )}
                                                    >
                                                        {assignment.horse.barnName}
                                                    </span>
                                                    <span className='text-gray-500 text-[13px] truncate -mt-0.5'>{assignment.horse.showName}</span>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                {(role === 'braider' || role === 'subcontractor') &&
                                                    job.status !== 'pending' &&
                                                    !job.paidAt &&
                                                    (activeServices.length === 0 ||
                                                        activeServices.length !==
                                                            [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length) && (
                                                        <button
                                                            onClick={() => handleCancelAssignment(assignment.id)}
                                                            className={cn(
                                                                'p-1 transition-colors text-xs cursor-pointer font-bold uppercase',
                                                                isAssignmentCanceled ? 'text-primary hover:text-primary-dark' : 'text-red-400 hover:text-red-600',
                                                                job.status === 'completed' ? 'pointer-events-none' : ''
                                                            )}
                                                        >
                                                            {isAssignmentCanceled ? 'Restore' : 'Cancel Horse'}
                                                        </button>
                                                    )}
                                                {!isAssignmentCanceled && role === 'braider' && (
                                                    <div className={cn('hidden @min-[530px]/assignment-detail:block', job.status === 'completed' ? 'pointer-events-none' : '')}>
                                                        <SelectSubcontractorDropdown
                                                            value={assignment.subcontractor?.id || ''}
                                                            subImage={assignment.subcontractor?.image || ''}
                                                            onChange={(val) => handleAssignSub(assignment.id, val, i)}
                                                            loading={subcontractorLoading === i}
                                                            team={team}
                                                            disabled={job.status !== 'accepted'}
                                                            completed={
                                                                [...new Set(assignment.services)].length ===
                                                                [...new Set(assignment.completedServiceIds)].length + [...new Set(assignment.canceledServiceIds)].length
                                                            }
                                                        />
                                                    </div>
                                                )}
                                                <div
                                                    onClick={() => setSelectedHorse(assignment.horse)}
                                                    className='rounded-full p-1.5 transition-all text-gray-400 hover:bg-primary-extra-light hover:text-primary cursor-pointer'
                                                >
                                                    <Info size={20} />
                                                </div>
                                            </div>
                                        </div>

                                        {!isAssignmentCanceled && role === 'braider' && (
                                            <div className={cn('block @min-[530px]/assignment-detail:hidden w-full mb-2', job.status === 'completed' ? 'pointer-events-none' : '')}>
                                                <SelectSubcontractorDropdown
                                                    value={assignment.subcontractor?.id || ''}
                                                    subImage={assignment.subcontractor?.image || ''}
                                                    onChange={(val) => handleAssignSub(assignment.id, val, i)}
                                                    loading={subcontractorLoading === i}
                                                    team={team}
                                                    disabled={job.status !== 'accepted'}
                                                    completed={
                                                        [...new Set(assignment.services)].length ===
                                                        [...new Set(assignment.completedServiceIds)].length + [...new Set(assignment.canceledServiceIds)].length
                                                    }
                                                />
                                            </div>
                                        )}

                                        <div className={cn('space-y-2 pl-1', job.status === 'completed' ? 'pointer-events-none' : '')}>
                                            {assignment.services.map((service, idx) => {
                                                const isCompleted = assignment.completedServiceIds?.includes(service.id);
                                                const canEdit =
                                                    (role === 'braider' || (role === 'subcontractor' && assignment.subcontractor?.id === userId)) &&
                                                    job.status !== 'completed' &&
                                                    job.status !== 'canceled' &&
                                                    !assignment.canceledAt;

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            'flex justify-between items-center text-sm min-w-0 py-1 group/service',
                                                            assignment.canceledServiceIds.includes(service.id) ? 'opacity-50' : ''
                                                        )}
                                                    >
                                                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                            {job.scheduledDate &&
                                                                (role !== 'barn' ? (
                                                                    <button
                                                                        type='button'
                                                                        disabled={!canEdit || assignment.canceledServiceIds.includes(service.id)}
                                                                        onClick={(e) => canEdit && handleToggleService(e, assignment.id, service.id)}
                                                                        className={cn(
                                                                            'min-w-5 h-5 rounded border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                                                                            canEdit ? 'cursor-pointer hover:border-primary' : 'opacity-50',
                                                                            isCompleted ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300',
                                                                            assignment.canceledServiceIds.includes(service.id) && 'opacity-50 cursor-not-allowed hover:border-gray-300'
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
                                                                    assignment.canceledServiceIds.includes(service.id) && 'text-gray-400 line-through decoration-red-300',
                                                                    !assignment.canceledServiceIds.includes(service.id) &&
                                                                        activeServices.length > 0 &&
                                                                        activeServices.every((s) => assignment.completedServiceIds.includes(s.id))
                                                                        ? 'text-primary-light/80'
                                                                        : ''
                                                                )}
                                                            >
                                                                {service.name} {assignment.canceledServiceIds.includes(service.id) ? '(Canceled)' : ''}
                                                            </span>
                                                        </div>
                                                        <div className='flex items-center gap-3'>
                                                            {(role === 'braider' || (role === 'subcontractor' && assignment.subcontractor?.id === userId)) &&
                                                                job.status !== 'pending' &&
                                                                !assignment.completedServiceIds.includes(service.id) &&
                                                                !assignment.canceledAt &&
                                                                !job.paidAt && (
                                                                    <button
                                                                        onClick={() => handleCancelService(assignment.id, service.id)}
                                                                        className={cn(
                                                                            'transition-all p-1 cursor-pointer',
                                                                            assignment.canceledServiceIds.includes(service.id)
                                                                                ? 'text-primary hover:text-primary-dark font-bold text-[10px] uppercase'
                                                                                : 'text-gray-300 hover:text-red-500'
                                                                        )}
                                                                    >
                                                                        {assignment.canceledServiceIds.includes(service.id) ? 'Restore' : <X size={14} />}
                                                                    </button>
                                                                )}
                                                            <span className='font-bold font-lusitana text-primary'>${service.priceUSD}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div className='border-t border-dashed border-gray-200 my-2' />
                                            <div className='flex justify-between items-center'>
                                                <span
                                                    className={cn(
                                                        'text-xs font-bold text-gray-400 uppercase tracking-wider',
                                                        activeServices.length > 0 && activeServices.every((s) => assignment.completedServiceIds.includes(s.id))
                                                            ? 'text-primary-light'
                                                            : ''
                                                    )}
                                                >
                                                    Subtotal
                                                </span>
                                                <span className='font-bold text-gray-900 font-lusitana'>${activeServices.reduce((a, b) => a + b.priceUSD, 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        <div className='flex justify-between items-center px-3 pt-2 mt-4 border-t border-gray-100'>
                            <span className='font-bold text-gray-700 text-lg'>Total</span>
                            <span className='font-bold text-xl text-primary font-lusitana'>
                                $
                                {job.assignments
                                    .filter((a) => role !== 'subcontractor' || a.subcontractor?.id === userId)
                                    .reduce(
                                        (acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).reduce((sAcc, s) => sAcc + s.priceUSD, 0),
                                        0
                                    )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={cn(role === 'braider' && job.status === 'pending' ? 'grid grid-cols-1 @min-[575px]/job-subpage:grid-cols-2 gap-4' : 'grid w-full')}>
                    <div
                        onClick={() => setNotesModalOpen(true)}
                        style={acceptJobHeight !== 0 ? { maxHeight: acceptJobHeight } : { maxHeight: 395 }}
                        className='p-4 w-full pb-12 overflow-y-hidden rounded-[14px] bg-white border border-[#dae3de] shadow-sm cursor-pointer hover:border-primary-light transition-all group'
                    >
                        <div className='flex justify-between items-center mb-2'>
                            <h3 className='font-bold text-gray-900 flex items-center gap-2'>
                                <Info size={16} className='text-gray-400' />
                                Notes & Messages
                            </h3>
                            {job.notes.length > 0 && <span className='text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full'>{job.notes.length}</span>}
                        </div>
                        {job.notes.length > 0 ? (
                            <div className='flex-1 overflow-y-auto h-full p-6 pb-0 space-y-4' ref={messagesRef}>
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
                                                              ? job.subcontractors.find((s) => s.name === note.author.name)?.name || ''
                                                              : job.braider.name)
                                                        ? 'bg-primary text-white rounded-tr-sm'
                                                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                                )}
                                            >
                                                {note.content}
                                            </div>
                                            <span className='text-[10px] text-gray-400 mt-1 px-1'>
                                                {new Date(note.createdAt).toLocaleString()} • {note.author.name}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className='text-sm text-gray-400 italic'>No notes yet. Click to add one.</p>
                        )}
                    </div>

                    {role === 'braider' && job.status === 'pending' && (
                        <div className='p-4 w-full h-fit rounded-xl bg-primary/5 border border-primary/10 shadow-sm font-figtree' ref={acceptJobRef}>
                            <h3 className='text-sm font-bold text-primary mb-3 uppercase'>Schedule & Accept</h3>

                            <div className='mb-4 flex flex-col gap-1.5 w-full'>
                                <label className='text-xs font-bold text-gray-500 uppercase'>When will you be finished?</label>
                                <DatePicker
                                    onDateSelect={(d) => setDate(d)}
                                    noDateBefore={new Date()}
                                    selectedDate={date}
                                    showStartDate={new Date(job.show.startDate)}
                                    showEndDate={new Date(job.show.endDate)}
                                    size='big'
                                    constantRows
                                />
                            </div>

                            <div className='flex flex-col @min-[320px]/job-detail:flex-row gap-2'>
                                <button onClick={() => handleAction('denied')} className='flex-1 py-2 cursor-pointer rounded-[10px] font-bold text-red-500 red-border-hover'>
                                    Decline Request
                                </button>
                                <button
                                    onClick={() => handleAction('accepted')}
                                    disabled={!date}
                                    className='flex-1 py-2 cursor-pointer rounded-[10px] font-bold disabled:opacity-50 disabled:pointer-events-none text-background bg-primary-light primary-border-hover'
                                >
                                    Accept Request
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className='flex items-center gap-3 flex-col @min-[450px]/job-detail:flex-row'>
                    {role !== 'subcontractor' &&
                        job.status !== 'canceled' &&
                        job.status !== 'denied' &&
                        job.status !== 'completed' &&
                        ((role === 'barn' && job.status === 'pending') || job.status !== 'pending') && (
                            <div
                                onClick={handleCancelJobModal}
                                className='w-full grid place-items-center font-figtree font-bold text-red-500 rounded-[10px] py-1.5 text-lg cursor-pointer red-border-hover'
                            >
                                Cancel Request
                            </div>
                        )}
                    {role === 'braider' && job.status === 'accepted' && (
                        <button
                            disabled={
                                job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) !==
                                    job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0) ||
                                (job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) === 0 &&
                                    job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length === 0 &&
                                    job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0) === 0 &&
                                    job.assignments.reduce(
                                        (acc, a) => (a.canceledAt ? acc + a.services.length : acc + a.services.filter((s) => a.canceledServiceIds.includes(s.id)).length),
                                        0
                                    ) === job.assignments.reduce((acc, a) => acc + a.services.length, 0))
                            }
                            onClick={() => {
                                setCheckMarkedCompleted({
                                    open: true,
                                    id: job.id,
                                    earnings: job.assignments.reduce(
                                        (acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).reduce((sAcc, s) => sAcc + s.priceUSD, 0),
                                        0
                                    ),
                                    horses: job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length,
                                    services: job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0),
                                });
                            }}
                            className='w-full flex justify-center items-center gap-2 font-figtree font-bold text-background bg-primary-light rounded-[10px] py-1.5 text-lg cursor-pointer disabled:opacity-50 disabled:pointer-events-none primary-border-hover'
                        >
                            <span>Send Invoice</span>
                            <AlertCircle
                                strokeWidth={2.5}
                                className={cn(
                                    'w-6 h-6',
                                    job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) === 0 &&
                                        job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length === 0 &&
                                        job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0) === 0 &&
                                        job.assignments.reduce(
                                            (acc, a) => (a.canceledAt ? acc + a.services.length : acc + a.services.filter((s) => a.canceledServiceIds.includes(s.id)).length),
                                            0
                                        ) === job.assignments.reduce((acc, a) => acc + a.services.length, 0)
                                        ? 'block'
                                        : 'hidden'
                                )}
                            />
                        </button>
                    )}
                </div>

                {(job.status === 'canceled' || job.status === 'denied') && (
                    <div className='flex items-center gap-3 flex-col @min-[450px]/job-detail:flex-row'>
                        <div
                            onClick={handleDeleteJob}
                            className='w-full grid place-items-center font-figtree font-bold text-red-500 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-[10px] py-1.5 text-[17px] @min-[240px]/job-detail:text-lg cursor-pointer transition-colors'
                        >
                            Delete Request
                        </div>
                        {role === 'barn' && (
                            <div
                                onClick={handleReRequestJob}
                                className='w-full grid place-items-center font-figtree font-bold text-primary border border-transparent hover:border-primary-light hover:bg-primary-extra-light rounded-[10px] py-1.5 text-[17px] @min-[240px]/job-detail:text-lg cursor-pointer transition-colors'
                            >
                                Re-Request Service{job.assignments.reduce((acc, a) => acc + a.services.length, 0) > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Modal isOpen={notesModalOpen} setIsOpen={setNotesModalOpen} className='max-w-lg p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                <JobNotesModal job={job} role={role} onClose={() => setNotesModalOpen(false)} refresh={refresh} />
            </Modal>
        </div>
    );
};
