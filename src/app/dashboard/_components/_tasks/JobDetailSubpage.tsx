'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
    MapPin,
    X,
    User,
    Info,
    CheckSquare,
    CheckCircle2,
    Calendar,
    CalendarCheck,
    ChevronLeft,
    Check,
    ChevronDown,
    CircleAlert,
    Loader,
    AlertCircle,
    Plus,
    PlusCircle,
    Trash2,
    Copy,
    Mail,
    Phone,
    DollarSign,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { Job, statusColors } from './Tasks';
import {
    addNote,
    deleteJob,
    toggleServiceCompletion,
    assignSubcontractorToAssignment,
    cancelAssignment,
    cancelAssignmentService,
    updateAssignmentStatus,
    addCustomCharge,
    removeCustomCharge,
    addAssignmentsToJob,
    markJobCompleted,
    acceptAllPendingAssignments,
} from '@/app/actions/jobs';
import { getTeamMembers } from '@/app/actions/team';
import { getIDByEmail } from '@/app/actions/join';
import { successToast, failToast } from '@/app/context';
import { getHorses } from '@/app/actions/horses';
import Modal from '../../Modal';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { parseUTCToLocal } from '@/lib/date-utils';

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
                    'w-full @min-[530px]/assignment-detail:w-fit flex items-center justify-between gap-3 outline-none shadow-sm border cursor-pointer px-3 py-1.5 primary-border-hover rounded-xl transition-all bg-white',
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300',
                    disabled || completed ? 'opacity-50 cursor-not-allowed hover:border-gray-200' : '',
                )}
            >
                <div className={cn('flex items-center gap-2 text-sm min-w-0', disabled || completed ? 'pointer-events-none' : '')}>
                    <div className='min-w-5 h-5 rounded-full bg-primary-extra-light flex items-center justify-center overflow-hidden border border-primary/15'>
                        {loading ? (
                            <Loader size={12} className='text-primary-light animate-spin' />
                        ) : value && subImage.length > 0 ? (
                            <Image src={subImage} alt='Sub' width={20} height={20} className='w-full h-full object-cover' />
                        ) : (
                            <User size={12} className='text-primary-light' />
                        )}
                    </div>
                    <span
                        className={cn(
                            'truncate min-w-0',
                            value ? 'text-primary-dark' : 'text-primary font-medium',
                            loading ? 'text-transparent bg-gray-100 rounded-full animate-pulse' : '',
                        )}
                    >
                        {value ? selectedMember?.name || 'Unknown' : 'Myself'}
                    </span>
                </div>
                <ChevronDown size={16} className={cn('text-primary-light transition-transform', isOpen ? 'rotate-180' : '', disabled || completed ? 'pointer-events-none' : '')} />
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

import { SubscriptionTier } from '@prisma/client';
import { formatPhoneNumber } from '../_settings/Settings';

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
    subscriptionTier,
}: {
    job: Job;
    role: string;
    userEmail: string;
    onBack: () => void;
    refresh: () => void;
    handleCancelJobModal: () => void;
    setSelectedHorse: React.Dispatch<React.SetStateAction<any | null>>;
    setCheckMarkedCompleted: React.Dispatch<
        React.SetStateAction<{
            open: boolean;
            id: string;
            earnings: number;
            horses: number;
            services: number;
        }>
    >;
    canMarkCompleted?: boolean;
    subscriptionTier?: SubscriptionTier;
}) => {
    const [job, setJob] = useState<Job>(initialJob);
    const [team, setTeam] = useState<any[]>([]);
    const [userId, setUserId] = useState('');
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [subcontractorLoading, setSubcontractorLoading] = useState(-1);
    const [acceptJobHeight, setAcceptJobHeight] = useState(0);
    const [messagesPrescrolled, setMessagesPrescrolled] = useState(false);
    const acceptJobRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    // Feature States
    const [showAddHorseModal, setShowAddHorseModal] = useState(false);
    const [horsesRef, setHorsesRef] = useState<any[]>([]);
    const [chargeModalOpen, setChargeModalOpen] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [chargeName, setChargeName] = useState('');
    const [chargeAmount, setChargeAmount] = useState('');
    const [chargeLoading, setChargeLoading] = useState(false);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [exactTime, setExactTime] = useState(new Date());
    const [acceptAllLoading, setAcceptAllLoading] = useState(false);
    const [loadingServiceIds, setLoadingServiceIds] = useState<{ horseId: string; date: string; id: string }[]>([]);

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
        const interval = setInterval(() => {
            if (!invoiceModalOpen) return;
            setExactTime(new Date());
        }, 60000);

        return () => {
            clearInterval(interval);
        };
    }, [invoiceModalOpen]);

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

    useEffect(() => {
        const fetchHorses = async () => {
            const result = await getHorses(userEmail);
            if (result) setHorsesRef(result);
        };

        if (showAddHorseModal) fetchHorses();
    }, [showAddHorseModal, userEmail]);

    const handleAddCharge = async () => {
        if (!selectedAssignmentId || !chargeName || !chargeAmount) return;
        setChargeLoading(true);
        const res = await addCustomCharge(selectedAssignmentId, chargeName, parseFloat(chargeAmount));
        if (res.success) {
            successToast('Charge added');
            setChargeModalOpen(false);
            setChargeName('');
            setChargeAmount('');
            refresh();
        } else {
            failToast(res.error || 'Failed to add charge');
        }
        setChargeLoading(false);
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

    const handleCancelAssignment = async (assignmentId: string) => {
        const res = await cancelAssignment(assignmentId);
        if (res.success) {
            successToast(res.message);
            refresh();
        } else {
            failToast('Failed to update assignment');
        }
    };

    const jobAssignments = job.assignments.filter((a) => role !== 'subcontractor' || a.subcontractor?.id === userId);
    const isJobPending = job.assignments.some((a) => a.status === 'pending');
    const isJobAccepted = job.assignments.length > 0 && job.assignments.every((a) => a.status === 'accepted' || a.status === 'completed');
    const isJobDenied = job.assignments.length > 0 && job.assignments.every((a) => a.status === 'denied');
    const isJobCanceled = job.assignments.length > 0 && job.assignments.every((a) => a.status === 'canceled');
    const isJobCompleted =
        jobAssignments.length > 0 &&
        jobAssignments.every((a) => a.status === 'completed' || (a.status === 'accepted' && a.completedServiceIds.length === a.services.length - a.canceledServiceIds.length));

    const horsesCompleted = job.assignments
        .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
        .filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length && a.completedServiceIds.length === a.services.length - a.canceledServiceIds.length).length;

    const assignmentDates = job.assignments.map((a) => parseUTCToLocal(a.assignmentDate)?.getTime() || new Date(a.assignmentDate).getTime());
    const minDate = assignmentDates.length > 0 ? new Date(Math.min(...assignmentDates)) : null;
    const maxDate = assignmentDates.length > 0 ? new Date(Math.max(...assignmentDates)) : null;

    const handleAcceptDeclineJob = async (status: 'accepted' | 'denied', assignmentId?: string) => {
        const promises = assignmentId ? [updateAssignmentStatus(assignmentId, status)] : job.assignments.map((assignment) => updateAssignmentStatus(assignment.id, status));
        const results = await Promise.all(promises);
        if (results.every((res) => res.success)) {
            successToast(assignmentId ? (status === 'accepted' ? 'Horse accepted' : 'Horse declined') : `Job ${status === 'denied' ? 'declined' : status}`);
            refresh();
            if (status === 'denied' && !assignmentId) onBack();
        } else {
            failToast('Failed to update assignments');
            refresh();
        }
    };

    const handleAssignSub = async (assignmentId: string, subId: string, index: number) => {
        setSubcontractorLoading(index);
        const res = await assignSubcontractorToAssignment(assignmentId, subId);
        if (res.success) {
            refresh();
        } else {
            failToast('Failed to assign');
        }
        setSubcontractorLoading(-1);
    };

    const handleToggleService = async (e: React.MouseEvent, assignmentId: string, serviceId: string) => {
        e.stopPropagation();

        const res = await toggleServiceCompletion(assignmentId, serviceId, new Date().getTimezoneOffset());
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
            if (res.error?.includes('You have reached your limit')) {
                failToast(res.error);
            } else {
                failToast('Failed to update');
            }
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

    const acceptAllRequests = async () => {
        setAcceptAllLoading(true);

        const updateIds: string[] = [];
        job.assignments.filter((a) => a.status === 'pending').forEach((assignment) => updateIds.push(assignment.id));

        if (updateIds.length === 0) {
            failToast('No requests to accept');
            setAcceptAllLoading(false);
            return;
        }

        const result = await acceptAllPendingAssignments(updateIds);
        if (result.success) {
            successToast('All pending requests accepted');
            refresh();
            setAcceptAllLoading(false);
        } else {
            failToast('Failed to update assignments');
            setAcceptAllLoading(false);
        }
    };

    return (
        <div className='font-figtree pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 w-full @container/job-subpage'>
            <div ref={containerRef} className='w-full'>
                <div className='flex flex-col gap-4 @min-[400px]/tasks:gap-0 @min-[400px]/tasks:flex-row @min-[400px]/tasks:justify-between @min-[400px]/tasks:items-start'>
                    <div className='flex items-center gap-4'>
                        <button
                            onClick={onBack}
                            className='p-2 cursor-pointer rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-all'
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className='text-3xl @min-[400px]/tasks:text-4xl font-lusitana font-bold text-gray-900'>{job.show.name}</h1>
                            <span className='text-gray-500 flex gap-1 items-center'>
                                <MapPin className='min-w-4.5 w-4.5' />
                                <p className='font-figtree'>
                                    {job.show.city}, {job.show.state}
                                </p>
                            </span>
                        </div>
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
                            statusColors[job.assignments.every((a) => a.paidAt) ? 'paid' : horsesCompleted > 0 || role === 'subcontractor' ? 'accepted' : job.status],
                        )}
                    >
                        {job.assignments.every((a) => a.paidAt)
                            ? 'paid'
                            : job.status === 'editing'
                              ? 'drafting'
                              : isJobPending
                                ? `${job.assignments.filter((a) => a.status === 'pending').length}/${job.assignments.filter((a) => a.status !== 'denied' && a.status !== 'canceled').length} horses pending`
                                : isJobAccepted && horsesCompleted === 0 && role !== 'subcontractor'
                                  ? 'all accepted'
                                  : isJobAccepted && horsesCompleted === 0 && role === 'subcontractor'
                                    ? `${job.assignments.filter((a) => a.subcontractor && a.status === 'pending').length}/${job.assignments.filter((a) => a.subcontractor).length} horses completed`
                                    : horsesCompleted > 0
                                      ? `${horsesCompleted}/${job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length} horses completed`
                                      : isJobDenied
                                        ? 'denied'
                                        : isJobCanceled
                                          ? 'canceled'
                                          : job.status === 'submitted'
                                            ? 'all completed'
                                            : job.status}
                    </span>
                </div>

                {minDate && (
                    <div className='flex flex-col @min-[450px]/job-detail:flex-row @min-[450px]/job-detail:items-center gap-2 w-full justify-between p-4 bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px]'>
                        <div>
                            <p className='font-bold text-primary-dark'>Service Dates</p>
                            <h3 className='text-[13px] font-bold text-primary uppercase'>
                                {format(minDate, 'MMM d, yyyy')}
                                {maxDate && minDate.getTime() !== maxDate.getTime() && ` - ${format(maxDate, 'MMM d, yyyy')}`}
                            </h3>
                        </div>
                    </div>
                )}

                {role === 'braider' && job.subcontractors.length > 0 && (
                    <div className='flex flex-col gap-5 pt-1.5'>
                        {job.subcontractors.map((sub, idx) => {
                            const subcontractorAssignments = job.assignments.filter((a) => a.subcontractor?.id === sub.id);
                            const completedHorses = subcontractorAssignments.filter(
                                (h) => [...new Set(h.completedServiceIds)].length + [...new Set(h.canceledServiceIds)].length === [...new Set(h.services)].length,
                            );
                            const finishedAllServices = completedHorses.length === subcontractorAssignments.length;

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        'flex items-center gap-3 p-4 border shadow-sm rounded-[14px] relative',
                                        finishedAllServices ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100',
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
                                            finishedAllServices ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200',
                                        )}
                                    >
                                        {completedHorses.length}/{subcontractorAssignments.length} Completed
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className={cn(job.invoiceSentAt ? 'pointer-events-none opacity-70' : '')}>
                    <div className='flex justify-between items-center mb-3 mt-4'>
                        <h3 className='text-sm font-bold text-gray-500 uppercase'>Assignments</h3>
                        {role === 'barn' && !job.invoiceSentAt && (
                            <button
                                onClick={() => setShowAddHorseModal(true)}
                                className='text-sm font-bold text-primary flex items-center gap-1.5 primary-border-hover cursor-pointer px-4 py-1 rounded-lg'
                            >
                                <Plus size={16} />
                                Add Horse
                            </button>
                        )}
                        {role === 'braider' && job.assignments.some((a) => a.status === 'pending') && (
                            <button
                                onClick={acceptAllRequests}
                                disabled={acceptAllLoading}
                                className='text-sm font-bold bg-primary-light text-background flex items-center gap-1.5 primary-border-hover cursor-pointer px-4 py-1 rounded-lg disabled:opacity-50 disasbled:cursor-not-allowed'
                            >
                                {acceptAllLoading ? <Loader size={16} className='animate-spin' /> : <Check size={16} />}
                                Accept All
                            </button>
                        )}
                    </div>

                    <div className='space-y-6'>
                        {Object.entries(
                            job.assignments
                                .filter((a) => role !== 'subcontractor' || a.subcontractor?.id === userId)
                                .reduce((acc: any, a) => {
                                    const parsedDate = parseUTCToLocal(a.assignmentDate);
                                    const dateKey = parsedDate ? format(parsedDate, 'yyyy-MM-dd') : format(new Date(a.assignmentDate), 'yyyy-MM-dd');
                                    if (!acc[dateKey]) acc[dateKey] = {};
                                    const clientKey = a.horse.client?.name || 'No Client';
                                    if (!acc[dateKey][clientKey]) acc[dateKey][clientKey] = [];
                                    acc[dateKey][clientKey].push(a);
                                    return acc;
                                }, {}),
                        )
                            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                            .map(([dateKey, clients]: [string, any]) => (
                                <div key={dateKey} className='rounded-[14px] border border-primary/10 w-full'>
                                    <span className='w-fit py-2 px-3 flex items-center text-xs font-bold text-primary-extra-light uppercase bg-primary-light shadow-md rounded-tl-[14px] rounded-br-[14px]'>
                                        <Calendar className='w-3.5 h-3.5 mr-1' strokeWidth={2.5} />
                                        {format(parseUTCToLocal(new Date(dateKey + 'T12:00:00')) || new Date(dateKey + 'T12:00:00'), 'EEEE, MMMM d')}
                                    </span>

                                    <div className='space-y-6 p-4'>
                                        {Object.entries(clients)
                                            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
                                            .map(([clientName, assignments]: [string, any]) => (
                                                <div key={clientName} className='space-y-3'>
                                                    <div>
                                                        <p className='font-bold text-gray-500 pl-1 flex items-center gap-2 font-lusitana'>{`${clientName} • ${new Intl.NumberFormat(
                                                            'en-US',
                                                            {
                                                                style: 'currency',
                                                                currency: 'USD',
                                                            },
                                                        ).format(
                                                            assignments.reduce(
                                                                (aAcc: number, assignment: any) =>
                                                                    aAcc +
                                                                    (!assignment.canceledAt
                                                                        ? assignment.services
                                                                              .filter((s: any) => !assignment.canceledServiceIds.includes(s.id))
                                                                              .reduce((acc: number, s: any) => acc + s.priceUSD, 0) +
                                                                          assignment.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0)
                                                                        : 0),
                                                                0,
                                                            ),
                                                        )}`}</p>
                                                        <p className='text-gray-500 text-[13px] pl-1 flex items-center gap-1 font-figtree'>
                                                            <Mail className='w-3 h-3' />
                                                            {assignments[0].horse.client?.email}
                                                        </p>
                                                        {assignments[0].horse.client?.phoneNumber && (
                                                            <p className='text-gray-500 text-[13px] pl-1 flex items-center gap-1 font-figtree'>
                                                                <Phone className='w-3 h-3' />
                                                                {formatPhoneNumber(assignments[0].horse.client?.phoneNumber)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className='space-y-3'>
                                                        {assignments
                                                            .sort((a: any, b: any) => a.horse.barnName.localeCompare(b.horse.barnName))
                                                            .map((assignment: any, i: number) => {
                                                                const activeServices = assignment.services.filter((s: any) => !assignment.canceledServiceIds.includes(s.id));
                                                                const isAssignmentCanceled = !!assignment.canceledAt || activeServices.length === 0;
                                                                const isAssignmentDenied = assignment.status === 'denied';
                                                                const isGrayed = isAssignmentCanceled || isAssignmentDenied;

                                                                return (
                                                                    <div
                                                                        key={assignment.id}
                                                                        className={cn(
                                                                            'bg-white rounded-2xl border border-gray-200 p-4 shadow-sm transition-all @container/assignment-detail',
                                                                            isGrayed ? 'opacity-60 bg-gray-50' : '',
                                                                            !isGrayed &&
                                                                                activeServices.length ===
                                                                                    [
                                                                                        ...new Set(
                                                                                            assignment.completedServiceIds.filter(
                                                                                                (id: any) => !assignment.canceledServiceIds.includes(id),
                                                                                            ),
                                                                                        ),
                                                                                    ].length
                                                                                ? 'bg-primary-extra-light border-primary/20'
                                                                                : '',
                                                                            assignment.status === 'pending' ? 'bg-white/70' : '',
                                                                        )}
                                                                    >
                                                                        <div className='flex justify-between items-start mb-3'>
                                                                            <div
                                                                                onClick={() => setSelectedHorse(assignment.horse)}
                                                                                className={cn(
                                                                                    'flex items-center min-w-0 gap-3 cursor-pointer group flex-1',
                                                                                    assignment.status === 'pending' ? 'opacity-70' : '',
                                                                                )}
                                                                            >
                                                                                <div className='min-w-10 min-h-10 grid place-items-center rounded-full bg-gray-100 overflow-hidden relative'>
                                                                                    {assignment.horse.profileImage ? (
                                                                                        <Image
                                                                                            src={assignment.horse.profileImage}
                                                                                            alt={assignment.horse.barnName}
                                                                                            fill
                                                                                            className='object-cover'
                                                                                        />
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
                                                                                            isGrayed ? 'text-gray-500 line-through' : 'text-gray-900',
                                                                                        )}
                                                                                    >
                                                                                        {assignment.horse.barnName}
                                                                                    </span>
                                                                                    <span className='text-gray-500 text-[13px] truncate -mt-0.5'>
                                                                                        Show Name • {assignment.horse.showName}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className='flex items-center gap-2'>
                                                                                {(role === 'braider' || role === 'subcontractor') &&
                                                                                    !job.assignments.every((a) => a.paidAt) &&
                                                                                    (activeServices.length === 0 ||
                                                                                        activeServices.length !==
                                                                                            [
                                                                                                ...new Set(
                                                                                                    assignment.completedServiceIds.filter(
                                                                                                        (id: any) => !assignment.canceledServiceIds.includes(id),
                                                                                                    ),
                                                                                                ),
                                                                                            ].length) && (
                                                                                        <>
                                                                                            {role === 'braider' && assignment.status === 'pending' ? (
                                                                                                <div className='hidden @min-[490px]/job-subpage:grid grid-cols-2 items-center gap-2 mr-2'>
                                                                                                    <button
                                                                                                        onClick={() => handleAcceptDeclineJob('accepted', assignment.id)}
                                                                                                        className='px-2 py-1.5 transition-colors text-sm cursor-pointer font-bold uppercase text-background bg-primary-light primary-border-hover rounded-[10px]'
                                                                                                    >
                                                                                                        Accept
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleAcceptDeclineJob('denied', assignment.id)}
                                                                                                        className='px-2 py-1.5 transition-colors text-sm cursor-pointer font-bold uppercase text-red-400 hover:text-red-500 red-border-hover rounded-[10px]'
                                                                                                    >
                                                                                                        Deny
                                                                                                    </button>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <button
                                                                                                    onClick={() => handleCancelAssignment(assignment.id)}
                                                                                                    className={cn(
                                                                                                        'p-1 hidden @min-[490px]/job-subpage:block transition-colors text-sm cursor-pointer font-bold uppercase px-2 py-1.5 rounded-[10px] text-nowrap',
                                                                                                        isGrayed
                                                                                                            ? 'text-primary hover:text-primary-dark border border-primary/20 hover:bg-primary-extra-light'
                                                                                                            : 'text-red-500 red-border-hover',
                                                                                                        isJobCompleted ? 'pointer-events-none' : '',
                                                                                                    )}
                                                                                                >
                                                                                                    {isGrayed ? 'Restore' : 'Cancel Horse'}
                                                                                                </button>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                {!isGrayed && role === 'braider' && subscriptionTier !== 'starter' && (
                                                                                    <div
                                                                                        className={cn(
                                                                                            'hidden @min-[530px]/assignment-detail:block',
                                                                                            isJobCompleted ? 'pointer-events-none' : '',
                                                                                            assignment.status === 'pending' ? 'opacity-70' : '',
                                                                                        )}
                                                                                    >
                                                                                        <SelectSubcontractorDropdown
                                                                                            value={assignment.subcontractor?.id || ''}
                                                                                            subImage={assignment.subcontractor?.image || ''}
                                                                                            onChange={(val) => handleAssignSub(assignment.id, val, i)}
                                                                                            loading={subcontractorLoading === i}
                                                                                            team={team}
                                                                                            disabled={assignment.status !== 'accepted'}
                                                                                            completed={
                                                                                                [...new Set(assignment.services)].length ===
                                                                                                [...new Set(assignment.completedServiceIds)].length +
                                                                                                    [...new Set(assignment.canceledServiceIds)].length
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                                <div
                                                                                    onClick={() => setSelectedHorse(assignment.horse)}
                                                                                    className={cn(
                                                                                        'rounded-full p-1.5 transition-all text-gray-400 hover:bg-primary-extra-light hover:text-primary cursor-pointer',
                                                                                        assignment.status === 'pending' ? 'opacity-70' : '',
                                                                                    )}
                                                                                >
                                                                                    <Info size={20} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {!isGrayed && role === 'braider' && subscriptionTier !== 'starter' && (
                                                                            <div
                                                                                className={cn(
                                                                                    'block @min-[530px]/assignment-detail:hidden mb-2 @min-[490px]/job-subpage:pb-0',
                                                                                    isJobCompleted ? 'pointer-events-none' : '',
                                                                                    assignment.status === 'pending' ? 'opacity-70' : '',
                                                                                )}
                                                                            >
                                                                                <SelectSubcontractorDropdown
                                                                                    value={assignment.subcontractor?.id || ''}
                                                                                    subImage={assignment.subcontractor?.image || ''}
                                                                                    onChange={(val) => handleAssignSub(assignment.id, val, i)}
                                                                                    loading={subcontractorLoading === i}
                                                                                    team={team}
                                                                                    disabled={assignment.status !== 'accepted'}
                                                                                    completed={
                                                                                        [...new Set(assignment.services)].length ===
                                                                                        [...new Set(assignment.completedServiceIds)].length +
                                                                                            [...new Set(assignment.canceledServiceIds)].length
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        {role === 'braider' && assignment.status === 'pending' ? (
                                                                            <div className='grid @min-[490px]/job-subpage:hidden grid-cols-2 items-center gap-2 m-0 @min-[490px]/job-subpage:mr-2'>
                                                                                <button
                                                                                    onClick={() => handleAcceptDeclineJob('accepted', assignment.id)}
                                                                                    className='px-2 py-1.5 transition-colors text-sm cursor-pointer font-bold uppercase text-background bg-primary-light primary-border-hover rounded-[10px]'
                                                                                >
                                                                                    Accept
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleAcceptDeclineJob('denied', assignment.id)}
                                                                                    className='px-2 py-1.5 transition-colors text-sm cursor-pointer font-bold uppercase text-red-400 hover:text-red-500 red-border-hover rounded-[10px]'
                                                                                >
                                                                                    Deny
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleCancelAssignment(assignment.id)}
                                                                                className={cn(
                                                                                    'p-1 block @min-[490px]/job-subpage:hidden w-full transition-colors text-sm cursor-pointer font-bold uppercase px-2 py-1.5 rounded-[10px] text-nowrap',
                                                                                    isGrayed
                                                                                        ? 'text-primary hover:text-primary-dark border border-primary/20 hover:bg-primary-extra-light'
                                                                                        : 'text-red-500 red-border-hover',
                                                                                    isJobCompleted ? 'pointer-events-none' : '',
                                                                                )}
                                                                            >
                                                                                {isGrayed ? 'Restore' : 'Cancel Horse'}
                                                                            </button>
                                                                        )}

                                                                        {!isGrayed && (
                                                                            <div
                                                                                className={cn(
                                                                                    'mt-3 pt-3 border-t border-gray-100 space-y-3',
                                                                                    assignment.status === 'pending' ? 'opacity-70 cursor-not-allowed' : '',
                                                                                )}
                                                                            >
                                                                                <div className={cn('space-y-2 pl-1', assignment.status === 'pending' ? 'pointer-events-none' : '')}>
                                                                                    {assignment.services.map((service: any, idx: number) => {
                                                                                        const isCompleted = assignment.completedServiceIds.includes(service.id);
                                                                                        const canEdit =
                                                                                            (role === 'braider' ||
                                                                                                (role === 'subcontractor' && assignment.subcontractor?.id === userId)) &&
                                                                                            !assignment.canceledAt;

                                                                                        return (
                                                                                            <div
                                                                                                key={idx}
                                                                                                className={cn(
                                                                                                    'flex justify-between items-center text-sm min-w-0 py-1 group/service',
                                                                                                    assignment.canceledServiceIds.includes(service.id) ? 'opacity-50' : '',
                                                                                                )}
                                                                                            >
                                                                                                <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                                                                    {assignment.status !== 'pending' &&
                                                                                                        (role !== 'barn' ? (
                                                                                                            <button
                                                                                                                type='button'
                                                                                                                disabled={!canEdit || assignment.canceledServiceIds.includes(service.id)}
                                                                                                                onClick={async (e) => {
                                                                                                                    if (canEdit) {
                                                                                                                        setLoadingServiceIds((prev) => [
                                                                                                                            ...prev,
                                                                                                                            {
                                                                                                                                horseId: assignment.horse.id,
                                                                                                                                date: dateKey,
                                                                                                                                id: service.id,
                                                                                                                            },
                                                                                                                        ]);
                                                                                                                        await handleToggleService(e, assignment.id, service.id);
                                                                                                                        setLoadingServiceIds((prev) =>
                                                                                                                            prev.filter(
                                                                                                                                ({ horseId, date, id }) =>
                                                                                                                                    id !== service.id &&
                                                                                                                                    dateKey !== date &&
                                                                                                                                    horseId !== assignment.horse.id,
                                                                                                                            ),
                                                                                                                        );
                                                                                                                    }
                                                                                                                }}
                                                                                                                className={cn(
                                                                                                                    'min-w-5 h-5 rounded border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                                                                                                                    canEdit ? 'cursor-pointer hover:border-primary' : 'opacity-50',
                                                                                                                    isCompleted
                                                                                                                        ? 'bg-primary border-primary text-white'
                                                                                                                        : 'bg-white border-gray-300',
                                                                                                                    assignment.canceledServiceIds.includes(service.id) &&
                                                                                                                        'opacity-50 cursor-not-allowed hover:border-gray-300',
                                                                                                                )}
                                                                                                            >
                                                                                                                {isCompleted ? (
                                                                                                                    <CheckSquare size={14} strokeWidth={3} />
                                                                                                                ) : loadingServiceIds.some(
                                                                                                                      ({ horseId, date, id }) =>
                                                                                                                          id === service.id &&
                                                                                                                          dateKey === date &&
                                                                                                                          horseId === assignment.horse.id,
                                                                                                                  ) ? (
                                                                                                                    <Loader
                                                                                                                        size={14}
                                                                                                                        strokeWidth={3}
                                                                                                                        className='animate-spin text-primary'
                                                                                                                    />
                                                                                                                ) : (
                                                                                                                    <></>
                                                                                                                )}
                                                                                                            </button>
                                                                                                        ) : (
                                                                                                            isCompleted && <CheckCircle2 size={16} className='text-primary' />
                                                                                                        ))}
                                                                                                    <span
                                                                                                        className={cn(
                                                                                                            'text-gray-700 font-medium truncate',
                                                                                                            isCompleted && 'text-gray-400 line-through',
                                                                                                            assignment.canceledServiceIds.includes(service.id) &&
                                                                                                                'text-gray-400 line-through decoration-red-300',
                                                                                                            !assignment.canceledServiceIds.includes(service.id) &&
                                                                                                                activeServices.length > 0 &&
                                                                                                                activeServices.every((s: any) =>
                                                                                                                    assignment.completedServiceIds.includes(s.id),
                                                                                                                )
                                                                                                                ? 'text-primary-light/80'
                                                                                                                : '',
                                                                                                        )}
                                                                                                    >
                                                                                                        {service.name}{' '}
                                                                                                        {assignment.canceledServiceIds.includes(service.id) ? '(Canceled)' : ''}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className='flex items-center gap-3'>
                                                                                                    {(role === 'braider' ||
                                                                                                        (role === 'subcontractor' && assignment.subcontractor?.id === userId)) &&
                                                                                                        !assignment.completedServiceIds.includes(service.id) &&
                                                                                                        !assignment.canceledAt &&
                                                                                                        !job.assignments.every((a) => a.paidAt) && (
                                                                                                            <button
                                                                                                                onClick={() => handleCancelService(assignment.id, service.id)}
                                                                                                                className={cn(
                                                                                                                    'transition-all p-1 cursor-pointer',
                                                                                                                    assignment.canceledServiceIds.includes(service.id)
                                                                                                                        ? 'text-primary hover:text-primary-dark font-bold text-[10px] uppercase'
                                                                                                                        : 'text-gray-300 hover:text-red-500',
                                                                                                                )}
                                                                                                            >
                                                                                                                {assignment.canceledServiceIds.includes(service.id) ? (
                                                                                                                    'Restore'
                                                                                                                ) : (
                                                                                                                    <X size={14} />
                                                                                                                )}
                                                                                                            </button>
                                                                                                        )}
                                                                                                    <span className='font-bold font-lusitana text-primary'>
                                                                                                        {new Intl.NumberFormat('en-US', {
                                                                                                            style: 'currency',
                                                                                                            currency: 'USD',
                                                                                                        }).format(service.priceUSD)}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                <div className={cn('space-y-1.5', assignment.status === 'pending' ? 'pointer-events-none' : '')}>
                                                                                    {assignment.customCharges?.map((charge: any) => (
                                                                                        <div
                                                                                            key={charge.id}
                                                                                            className='flex items-center justify-between bg-amber-50/50 border border-amber-100/50 px-3 py-1.5 rounded-xl group/charge'
                                                                                        >
                                                                                            <div className='flex items-center gap-2'>
                                                                                                <PlusCircle size={14} className='text-amber-500' />
                                                                                                <span className='text-[13px] font-bold text-amber-900'>{charge.name}</span>
                                                                                            </div>
                                                                                            <div className='flex items-center gap-3'>
                                                                                                <span className='text-[13px] font-bold text-amber-700'>
                                                                                                    {new Intl.NumberFormat('en-US', {
                                                                                                        style: 'currency',
                                                                                                        currency: 'USD',
                                                                                                    }).format(charge.amount)}
                                                                                                </span>
                                                                                                {role === 'braider' && !isJobCompleted && (
                                                                                                    <button
                                                                                                        onClick={() => handleRemoveCharge(charge.id)}
                                                                                                        className='text-red-400 hover:text-red-500 cursor-pointer'
                                                                                                    >
                                                                                                        <Trash2 size={14} />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                    {role === 'braider' && !isJobCompleted && (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setSelectedAssignmentId(assignment.id);
                                                                                                setChargeModalOpen(true);
                                                                                            }}
                                                                                            className='text-[11px] cursor-pointer font-bold uppercase text-gray-400 hover:text-primary px-3 py-1 transition-colors flex items-center gap-1'
                                                                                        >
                                                                                            <Plus size={12} /> Add Custom Expense
                                                                                        </button>
                                                                                    )}
                                                                                </div>

                                                                                <div className='border-t border-dashed border-gray-200 my-2' />
                                                                                <div className='flex justify-between items-center'>
                                                                                    <span
                                                                                        className={cn(
                                                                                            'text-xs font-bold text-gray-400 uppercase tracking-wider',
                                                                                            activeServices.length > 0 &&
                                                                                                activeServices.every((s: any) => assignment.completedServiceIds.includes(s.id))
                                                                                                ? 'text-primary-light'
                                                                                                : '',
                                                                                        )}
                                                                                    >
                                                                                        Subtotal
                                                                                    </span>
                                                                                    <span className='font-bold text-gray-900 font-lusitana'>
                                                                                        {new Intl.NumberFormat('en-US', {
                                                                                            style: 'currency',
                                                                                            currency: 'USD',
                                                                                        }).format(
                                                                                            activeServices.reduce((acc: number, s: any) => acc + s.priceUSD, 0) +
                                                                                                assignment.customCharges.reduce((acc: number, c: any) => acc + c.amount, 0),
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                <div className={cn('py-2 px-1', job.invoiceSentAt ? 'opacity-70 pointer-events-none' : '')}>
                    <div className='bg-white rounded-[14px] border border-gray-200 px-5 py-4 shadow-sm space-y-4'>
                        <div className='flex justify-between items-center'>
                            <div className='flex items-center gap-2'>
                                <div className='w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center'>
                                    <h3 className='font-bold text-primary font-lusitana text-xl'>$</h3>
                                </div>
                                <h4 className='font-bold text-primary text-lg'>Total</h4>
                            </div>
                            <span className='font-bold text-2xl text-primary font-lusitana'>
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(
                                    job.assignments
                                        .filter((a: any) => role !== 'subcontractor' || a.subcontractor?.id === userId)
                                        .reduce((acc: number, a: any) => {
                                            const servicesTotal = a.services
                                                .filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt)
                                                .reduce((sAcc: number, s: any) => sAcc + s.priceUSD, 0);
                                            const customTotal = a.customCharges?.reduce((cAcc: number, c: any) => cAcc + c.amount, 0) || 0;
                                            return a.canceledAt ? acc : acc + servicesTotal + customTotal;
                                        }, 0),
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={cn('grid w-full', job.invoiceSentAt ? 'opacity-70 pointer-events-none' : '')}>
                    <div
                        onClick={() => setNotesModalOpen(true)}
                        className='p-4 w-full rounded-[14px] bg-white border border-[#dae3de] shadow-sm cursor-pointer hover:border-primary-light transition-all group min-h-[100px]'
                    >
                        <div className='flex justify-between items-center mb-2'>
                            <h3 className='font-bold text-gray-900 flex items-center gap-2'>
                                <Info size={16} className='text-gray-400' />
                                Notes & Messages
                            </h3>
                            {job.notes.length > 0 && <span className='text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full'>{job.notes.length}</span>}
                        </div>
                        {job.notes.length > 0 ? (
                            <div className='space-y-2 opacity-60 group-hover:opacity-100 transition-opacity'>
                                {job.notes
                                    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                    .slice(-2)
                                    .map((note: any) => (
                                        <p key={note.id} className='text-sm text-gray-600 truncate'>
                                            <span className='font-bold'>{note.author.name}: </span>
                                            {note.content}
                                        </p>
                                    ))}
                            </div>
                        ) : (
                            <p className='text-sm text-gray-400 italic'>No notes yet. Click to add one.</p>
                        )}
                    </div>
                </div>

                <div className={cn('flex items-center gap-3 flex-col @min-[450px]/job-detail:flex-row mt-4 mb-8', job.invoiceSentAt ? 'opacity-70 pointer-events-none' : '')}>
                    {role !== 'subcontractor' && !job.invoiceSentAt && !isJobCanceled && !isJobDenied && !isJobCompleted && ((role === 'barn' && isJobPending) || !isJobPending) && (
                        <div
                            onClick={handleCancelJobModal}
                            className='w-full grid place-items-center font-figtree font-bold text-red-500 rounded-[10px] py-2 text-lg cursor-pointer red-border-hover transition-all'
                        >
                            Cancel Request
                        </div>
                    )}
                    {(isJobCanceled || isJobDenied) && (
                        <div
                            onClick={handleDeleteJob}
                            className='w-full grid place-items-center font-figtree font-bold text-red-500 rounded-[10px] py-1.5 text-[17px] @min-[240px]/job-detail:text-lg cursor-pointer red-border-hover'
                        >
                            Delete Request
                        </div>
                    )}
                    {role === 'braider' &&
                        job.status === 'submitted' &&
                        job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) ===
                            job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0) && (
                            <button
                                onClick={() => {
                                    setCheckMarkedCompleted({
                                        id: job.id,
                                        open: true,
                                        earnings: job.assignments.reduce((acc: number, a: any) => {
                                            const servicesTotal = a.services
                                                .filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt)
                                                .reduce((sAcc: number, s: any) => sAcc + s.priceUSD, 0);
                                            const customTotal = a.customCharges?.reduce((cAcc: number, c: any) => cAcc + c.amount, 0) || 0;
                                            return a.canceledAt ? acc : acc + servicesTotal + customTotal;
                                        }, 0),
                                        horses: job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length,
                                        services: job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0),
                                    });
                                }}
                                className='w-full flex justify-center items-center gap-2 font-figtree font-bold text-background bg-primary-light rounded-[10px] py-1.5 text-lg cursor-pointer disabled:opacity-50 disabled:pointer-events-none primary-border-hover'
                            >
                                Send Invoice
                                <AlertCircle
                                    strokeWidth={2.5}
                                    className={cn(
                                        'w-6 h-6',
                                        job.assignments.reduce((acc, a) => acc + [...new Set(a.completedServiceIds)].length, 0) === 0 &&
                                            job.assignments.filter((a) => !a.canceledAt && a.services.length !== a.canceledServiceIds.length).length === 0 &&
                                            job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).length, 0) === 0 &&
                                            job.assignments.reduce(
                                                (acc, a) => (a.canceledAt ? acc + a.services.length : acc + a.services.filter((s) => a.canceledServiceIds.includes(s.id)).length),
                                                0,
                                            ) === job.assignments.reduce((acc, a) => acc + a.services.length, 0)
                                            ? 'block'
                                            : 'hidden',
                                    )}
                                />
                            </button>
                        )}
                </div>
            </div>

            <Modal isOpen={notesModalOpen} setIsOpen={setNotesModalOpen} className='max-w-lg p-0 rounded-[18px] primary-border-bold relative overflow-hidden bg-white'>
                <JobNotesModal job={job} role={role} onClose={() => setNotesModalOpen(false)} refresh={refresh} />
            </Modal>

            {/* Custom Charge Modal */}
            <Modal isOpen={chargeModalOpen} setIsOpen={setChargeModalOpen} className='max-w-md p-6 rounded-3xl primary-border-bold bg-white'>
                <div className='space-y-1 font-figtree'>
                    <div className='flex justify-between items-center'>
                        <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Add Extra Expense</h3>
                        <button onClick={() => setChargeModalOpen(false)} className='p-2 text-gray-400 hover:text-gray-600'>
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

            {/* Invoicing Confirmation Modal */}
            <Modal isOpen={invoiceModalOpen} setIsOpen={setInvoiceModalOpen} className='max-w-md p-6 rounded-3xl bg-white'>
                {role === 'braider' && (
                    <div>
                        <h1 className='text-3xl @min-[300px]/check-completed:text-[33px] leading-[1.05] @min-[520px]/check-completed:text-4xl font-lusitana font-bold text-gray-900'>
                            Have you completed this service?
                        </h1>
                        <div className='text-[15px] @min-[520px]/check-completed:text-[17px] text-gray-800 font-figtree mt-2'>
                            <p className='font-semibold'>This action will send an invoice to the owners of the horses you serviced.</p>
                            <p className='mt-2'>
                                Payments occur outside of the ManeAccount platform, but we offer the ability to track them in the <span className='font-bold'>Invoices</span> panel.
                                Please ensure that all reported services were actually completed.
                            </p>
                        </div>
                        <div className='flex flex-col gap-2 mt-4'>
                            <p className='font-figtree text-gray-500 font-bold tracking-wide uppercase'>Invoice Preview</p>
                            <div className='p-4 w-full flex-wrap font-figtree flex items-center gap-3 bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px] text-primary font-bold'>
                                <div className='font-lusitana text-3xl py-2 px-4 bg-primary-light/30 border border-primary shadow-sm rounded-[14px]'>
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                    }).format(
                                        job.assignments.reduce((acc: number, a: any) => {
                                            const servicesTotal = a.services
                                                .filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt)
                                                .reduce((sAcc: number, s: any) => sAcc + s.priceUSD, 0);
                                            const customTotal = a.customCharges?.reduce((cAcc: number, c: any) => cAcc + c.amount, 0) || 0;
                                            return a.canceledAt ? acc : acc + servicesTotal + customTotal;
                                        }, 0),
                                    )}
                                </div>
                                <div className='font-figtree font-normal text-sm'>
                                    <div className='flex items-center gap-2 font-semibold text-[15px]'>
                                        <CalendarCheck className='w-4 h-4' strokeWidth={2.25} />
                                        {format(exactTime, 'Pp')}
                                    </div>
                                    <span>
                                        {job.assignments.filter((a) => !a.canceledAt).length} Horse{job.assignments.filter((a) => !a.canceledAt).length === 1 ? '' : 's'}
                                    </span>{' '}
                                    •{' '}
                                    <span>
                                        {job.assignments.reduce((acc: number, a: any) => acc + a.services.filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt), 0)}{' '}
                                        Service
                                        {job.assignments.reduce(
                                            (acc: number, a: any) => acc + a.services.filter((s: any) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt),
                                            0,
                                        ) === 1
                                            ? ''
                                            : 's'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Add Horse Modal for Barns */}
            <Modal isOpen={showAddHorseModal} setIsOpen={setShowAddHorseModal} className='max-w-2xl p-0 rounded-3xl bg-white overflow-hidden primary-border-bold shadow-2xl'>
                <AddHorseToJobForm job={job} horses={horsesRef} braiderServices={job.braider.services} onClose={() => setShowAddHorseModal(false)} refresh={refresh} />
            </Modal>
        </div>
    );
};

const AddHorseToJobForm = ({ job, horses, braiderServices, onClose, refresh }: { job: Job; horses: any[]; braiderServices: any[]; onClose: () => void; refresh: () => void }) => {
    const [selectedHorseId, setSelectedHorseId] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const showDates = eachDayOfInterval({
        start: parseUTCToLocal(new Date(job.show.startDate)) || new Date(job.show.startDate),
        end: parseUTCToLocal(new Date(job.show.endDate)) || new Date(job.show.endDate),
    });

    const handleAdd = async () => {
        if (!selectedHorseId || !selectedDate || selectedServiceIds.length === 0) return;
        setLoading(true);
        const res = await addAssignmentsToJob(job.id, [
            {
                horseId: selectedHorseId,
                date: selectedDate,
                serviceIds: selectedServiceIds,
            },
        ]);
        if (res.success) {
            successToast('Horse added to request');
            refresh();
            onClose();
        } else {
            failToast(res.error || 'Failed to add horse');
        }
        setLoading(false);
    };

    return (
        <div className='flex flex-col max-h-[90vh] font-figtree'>
            <div className='px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center bg-white'>
                <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Add Horse to Request</h3>
                <button onClick={onClose} className='p-2 text-gray-400 hover:text-gray-600'>
                    <X size={20} />
                </button>
            </div>

            <div className='flex-1 overflow-y-auto p-6 space-y-6'>
                <div className='space-y-3'>
                    <label className='text-xs font-bold text-gray-400 uppercase flex items-center gap-2'>
                        <Calendar size={14} /> Select Date
                    </label>
                    <div className='flex gap-2 overflow-x-auto pb-2 hide-scrollbar'>
                        {showDates.map((date) => {
                            const isSelected = selectedDate && isSameDay(date, selectedDate);
                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => {
                                        const d = new Date(date);
                                        d.setHours(12, 0, 0, 0);
                                        setSelectedDate(d);
                                    }}
                                    className={cn(
                                        'shrink-0 w-20 py-3 rounded-2xl flex flex-col items-center border transition-all cursor-pointer',
                                        isSelected
                                            ? 'border-primary bg-primary-extra-light text-primary shadow-md '
                                            : 'border-gray-200 shadow-sm text-gray-600 hover:border-primary-light',
                                    )}
                                >
                                    <span className='text-[10px] uppercase font-bold opacity-60'>{format(parseUTCToLocal(date) || date, 'eee')}</span>
                                    <span className='text-xl font-bold font-lusitana'>{format(parseUTCToLocal(date) || date, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className='space-y-4'>
                    <label className='text-xs font-bold text-gray-400 uppercase flex items-center gap-2'>
                        <User size={14} /> Select Horse
                    </label>
                    <div className='grid grid-cols-2 dashboard-sm:grid-cols-3 gap-3'>
                        {horses.map((horse) => (
                            <button
                                key={horse.id}
                                onClick={() => setSelectedHorseId(horse.id)}
                                className={cn(
                                    'p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group cursor-pointer',
                                    selectedHorseId === horse.id
                                        ? 'border-primary bg-primary-extra-light text-primary shadow-md'
                                        : 'border-gray-200 shadow-sm text-gray-600 hover:border-primary-light',
                                    !selectedDate ||
                                        job.assignments
                                            .filter((a) => isSameDay(parseUTCToLocal(a.assignmentDate) || a.assignmentDate, selectedDate))
                                            .some((a) => a.horse.id === horse.id)
                                        ? 'opacity-20 pointer-events-none'
                                        : '',
                                )}
                            >
                                <div className='w-16 h-16 rounded-full overflow-hidden bg-gray-200 relative shadow-sm'>
                                    {horse.profileImage ? (
                                        <Image src={horse.profileImage} alt={horse.barnName} fill className='object-cover' />
                                    ) : (
                                        <div className='w-full h-full flex items-center justify-center font-bold text-primary bg-primary/5 text-xl'>{horse.barnName[0]}</div>
                                    )}
                                </div>
                                <span className={cn('text-[14px] font-bold truncate w-full text-center', selectedHorseId === horse.id ? 'text-primary' : 'text-gray-700')}>
                                    {horse.barnName}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Service Selection */}
                <div className='space-y-3'>
                    <label className='text-xs font-bold text-gray-400 uppercase flex items-center gap-2'>
                        <CheckSquare size={14} /> Select Services
                    </label>
                    <div className='flex flex-wrap gap-2'>
                        {braiderServices.map((service) => {
                            const isSelected = selectedServiceIds.includes(service.id);
                            return (
                                <button
                                    key={service.id}
                                    onClick={() => setSelectedServiceIds((prev) => (isSelected ? prev.filter((id) => id !== service.id) : [...prev, service.id]))}
                                    className={cn(
                                        'px-4 py-2 rounded-xl border font-bold text-sm transition-all cursor-pointer',
                                        isSelected
                                            ? 'border-primary bg-primary-extra-light text-primary shadow-md'
                                            : 'border-gray-200 shadow-sm text-gray-600 hover:border-primary-light',
                                    )}
                                >
                                    {service.name} (
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                    }).format(service.priceUSD)}
                                    {service.duration ? ` • ${service.duration} mins` : ''})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className='p-6 bg-gray-50 border-t border-gray-100'>
                <button
                    onClick={handleAdd}
                    disabled={loading || !selectedHorseId || !selectedDate || selectedServiceIds.length === 0}
                    className='w-full py-2.5 cursor-pointer bg-primary-light text-white rounded-[10px] font-bold text-lg primary-border-hover disabled:opacity-50'
                >
                    {loading ? <Loader className='animate-spin inline mr-2' size={20} /> : <Plus size={20} className='inline mr-2' />}
                    Confirm Addition
                </button>
            </div>
        </div>
    );
};
