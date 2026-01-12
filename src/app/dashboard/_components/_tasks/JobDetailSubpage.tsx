'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, User, Info, CheckSquare, CheckCircle2, Calendar, CalendarCheck, ChevronLeft, Check, ChevronDown } from 'lucide-react';
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
import { AnimatePresence, motion } from 'motion/react';
import DatePicker from '../DatePicker';

// Reusing helper components from Calendar or creating new ones if not exported.
// Since SelectSubcontractorDropdown and JobNotesModal were inside Tasks.tsx, I should copy them here or export them.
// I'll copy them here to avoid circular dips or huge refactors.

// --- Helper Components ---

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
                                        (role === 'barn' ? job.barn.name : role === 'subcontractor' ? (job.subcontractor ? job.subcontractor.name : job.braider.name) : job.braider.name)
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

            {isOpen && anchorRect && (
                // @ts-ignore
                <AnimatePresence>
                    {/* @ts-ignore */}
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
                </AnimatePresence>
                // Reomved Portal here as it was causing issues. Just rendered in place or fixed.
                // Actually, let's use fixed positioning with portal if needed, but for simplicity here standard absolute might be safer if parent not overflow hidden.
                // The original code used createPortal. I'll stick to rendering it but maybe without portal if it works, or use portal if I can import it.
                // import { createPortal } from 'react-dom';
            )}
        </div>
    );
};
import { createPortal } from 'react-dom';

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
    setCheckMarkedCompleted: React.Dispatch<React.SetStateAction<{ open: boolean; id: string }>>;
    canMarkCompleted?: boolean;
}) => {
    const [job, setJob] = useState<Job>(initialJob);
    const [date, setDate] = useState<Date | null>(job.scheduledDate ? new Date(job.scheduledDate) : null);
    const [team, setTeam] = useState<any[]>([]);
    const [selectedSub, setSelectedSub] = useState('');
    const [userId, setUserId] = useState('');
    const [notesModalOpen, setNotesModalOpen] = useState(false);

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
            subcontractorId: subId || selectedSub || undefined,
        });

        if (res.success) {
            successToast(`Job ${status === 'denied' ? 'declined' : status}`);
            refresh();
            if (status === 'denied') onBack();
        } else {
            failToast('Failed to update');
        }
    };

    const handleAssignSub = async (assignmentId: string, subId: string) => {
        const res = await assignSubcontractorToAssignment(assignmentId, subId);
        if (res.success) {
            successToast('Assigned subcontractor');
            refresh();
        } else {
            failToast('Failed to assign');
        }
    };

    const handleCancelAssignment = async (assignmentId: string) => {
        const res = await cancelAssignment(assignmentId);
        if (res.success) {
            successToast('Removed horse from job');
            refresh();
        } else {
            failToast('Failed to remove horse');
        }
    };

    const handleCancelService = async (assignmentId: string, serviceId: string) => {
        const res = await cancelAssignmentService(assignmentId, serviceId);
        if (res.success) {
            successToast('Service canceled');
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
        <div className='pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 w-full h-full'>
            <div className='w-full'>
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
                            'text-xs absolute -top-3 right-2 font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide my-1 bg-white',
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

                <div>
                    <h3 className='text-sm font-bold text-gray-500 uppercase mb-3'>Assignments • {format(new Date(job.createdAt), 'P')}</h3>
                    <div className='space-y-4'>
                        {/* Only show assignments relevant to the user */}
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.id === userId)
                            .sort((a, b) => a.horse.barnName.localeCompare(b.horse.barnName.toUpperCase()))
                            .map((assignment, i) => {
                                const activeServices = assignment.services.filter((s) => !assignment.canceledServiceIds?.includes(s.id));
                                const isAssignmentCanceled = !!assignment.canceledAt;

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            'bg-white rounded-2xl border border-gray-200 p-4 shadow-sm transition-all',
                                            isAssignmentCanceled ? 'opacity-60 bg-gray-50' : '',
                                            !isAssignmentCanceled &&
                                                activeServices.length ===
                                                    [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds?.includes(id)))].length
                                                ? 'bg-primary-extra-light border-primary/20'
                                                : ''
                                        )}
                                    >
                                        <div className='flex justify-between items-start mb-3'>
                                            <div onClick={() => setSelectedHorse(assignment.horse)} className='flex items-center gap-3 cursor-pointer group flex-1'>
                                                <div className='min-w-10 min-h-10 grid place-items-center rounded-full bg-gray-100 overflow-hidden relative'>
                                                    {assignment.horse.profileImage ? (
                                                        <Image src={assignment.horse.profileImage} alt={assignment.horse.barnName} fill className='object-cover grayscale' />
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
                                                {(role === 'braider' || role === 'subcontractor') && (
                                                    <button
                                                        onClick={() => handleCancelAssignment(assignment.id)}
                                                        className={cn(
                                                            'p-1 transition-colors text-xs font-bold uppercase',
                                                            isAssignmentCanceled ? 'text-primary hover:text-primary-dark' : 'text-red-400 hover:text-red-600'
                                                        )}
                                                    >
                                                        {isAssignmentCanceled ? 'Restore' : 'Cancel Horse'}
                                                    </button>
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
                                            <div className='mb-3'>
                                                <SelectSubcontractorDropdown
                                                    value={assignment.subcontractor?.id || ''}
                                                    onChange={(val) => handleAssignSub(assignment.id, val)}
                                                    team={team}
                                                />
                                            </div>
                                        )}

                                        <div className='space-y-2 pl-1'>
                                            {activeServices.map((service, idx) => {
                                                const isCompleted = assignment.completedServiceIds?.includes(service.id);
                                                // Braiders can always edit if not canceled/completed job. Subs can edit if assigned.
                                                // The prompt said "subcontractor has to complete all...". Now per horse.
                                                // "Assign any or none...".
                                                // If assigned, they can toggle.
                                                const canEdit =
                                                    (role === 'braider' || (role === 'subcontractor' && assignment.subcontractor?.id === userId)) &&
                                                    job.status !== 'completed' &&
                                                    job.status !== 'canceled';

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            'flex justify-between items-center text-sm min-w-0 py-1 group/service',
                                                            assignment.canceledServiceIds?.includes(service.id) ? 'opacity-50' : ''
                                                        )}
                                                    >
                                                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                            {job.scheduledDate &&
                                                                !assignment.canceledServiceIds?.includes(service.id) &&
                                                                (role !== 'barn' ? (
                                                                    <button
                                                                        type='button'
                                                                        disabled={!canEdit}
                                                                        onClick={(e) => canEdit && handleToggleService(e, assignment.id, service.id)}
                                                                        className={cn(
                                                                            'min-w-5 h-5 rounded border flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed',
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
                                                                    assignment.canceledServiceIds?.includes(service.id) && 'text-gray-400 line-through decoration-red-300',
                                                                    !assignment.canceledServiceIds?.includes(service.id) &&
                                                                        activeServices.length > 0 &&
                                                                        activeServices.every((s) => assignment.completedServiceIds.includes(s.id))
                                                                        ? 'text-primary-light/80'
                                                                        : ''
                                                                )}
                                                            >
                                                                {service.name} {assignment.canceledServiceIds?.includes(service.id) ? '(Canceled)' : ''}
                                                            </span>
                                                        </div>
                                                        <div className='flex items-center gap-3'>
                                                            <span className='font-bold font-lusitana text-primary'>${service.priceUSD}</span>
                                                            {(role === 'braider' || (role === 'subcontractor' && assignment.subcontractor?.id === userId)) && (
                                                                <button
                                                                    onClick={() => handleCancelService(assignment.id, service.id)}
                                                                    className={cn(
                                                                        'transition-all p-1',
                                                                        assignment.canceledServiceIds?.includes(service.id)
                                                                            ? 'text-primary hover:text-primary-dark font-bold text-[10px] uppercase'
                                                                            : 'opacity-0 group-hover/service:opacity-100 text-gray-300 hover:text-red-500'
                                                                    )}
                                                                >
                                                                    {assignment.canceledServiceIds?.includes(service.id) ? 'Restore' : <X size={14} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {activeServices.length === 0 && <p className='text-xs text-center text-gray-400 italic py-2'>All services canceled</p>}
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
                                    .reduce((acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds?.includes(s.id)).reduce((sAcc, s) => sAcc + s.priceUSD, 0), 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => setNotesModalOpen(true)}
                    className='p-4 rounded-[14px] bg-white border border-[#dae3de] shadow-sm cursor-pointer hover:border-primary-light transition-all group'
                >
                    <div className='flex justify-between items-center mb-2'>
                        <h3 className='font-bold text-gray-900 flex items-center gap-2'>
                            <Info size={16} className='text-gray-400' />
                            Notes & Messages
                        </h3>
                        {job.notes.length > 0 && <span className='text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full'>{job.notes.length}</span>}
                    </div>
                    {job.notes.length > 0 ? (
                        <div className='text-sm text-gray-500 line-clamp-2'>
                            <span className='font-bold text-gray-700'>{job.notes[0].author.name}: </span>
                            {job.notes[0].content}
                        </div>
                    ) : (
                        <p className='text-sm text-gray-400 italic'>No notes yet. Click to add one.</p>
                    )}
                </div>

                {role === 'braider' && job.status === 'pending' && (
                    <div className='p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-sm font-figtree mb-4'>
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
                            />
                        </div>

                        <div className='flex flex-col @min-[320px]/job-detail:flex-row gap-2'>
                            <button
                                onClick={() => handleAction('denied')}
                                className='flex-1 py-2 cursor-pointer rounded-[10px] bg-white border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors'
                            >
                                Decline Request
                            </button>
                            <button
                                onClick={() => handleAction('accepted')}
                                disabled={!date}
                                className='flex-1 py-2 cursor-pointer rounded-[10px] bg-primary-light text-background font-bold disabled:opacity-50 disabled:pointer-events-none hover:bg-primary transition-colors'
                            >
                                Accept Request
                            </button>
                        </div>
                    </div>
                )}

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
                            disabled={job.assignments.reduce((acc, a) => acc + a.services.filter((s) => !a.completedServiceIds.includes(s.id)).length, 0) > 0}
                            onClick={() => {
                                setCheckMarkedCompleted({ open: true, id: job.id });
                            }}
                            className='w-full grid place-items-center font-figtree font-bold text-background bg-primary-light rounded-[10px] py-1.5 text-lg cursor-pointer disabled:opacity-50 disabled:pointer-events-none primary-border-hover'
                        >
                            Mark Complete
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
