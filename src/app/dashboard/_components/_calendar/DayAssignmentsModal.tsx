import React, { useState, useEffect } from 'react';
import { Job, statusColors } from '../_tasks/Tasks';
import { format, isSameDay, eachDayOfInterval } from 'date-fns';
import { X, Calendar, Plus, Mail, Phone, Info, CheckSquare, CheckCircle2, User, MapPin, CircleArrowRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { formatPhoneNumber } from '../_settings/Settings';
import { getHorses } from '@/app/actions/horses';
import { addAssignmentsToJob } from '@/app/actions/jobs';
import { successToast, failToast } from '@/app/context';
import Modal from '../../Modal';
import { Show } from './Calendar';
import { parseUTCToLocal } from '@/lib/date-utils';

export const DayAssignmentsModal = ({
    job,
    date,
    role,
    userEmail,
    setViewingShow,
    onClose,
    refresh,
}: {
    job: Job;
    date: Date;
    role: string;
    userEmail: string;
    setViewingShow: React.Dispatch<React.SetStateAction<Show | null>>;
    onClose: () => void;
    refresh: () => void;
}) => {
    const [showAddHorseModal, setShowAddHorseModal] = useState(false);
    const [horsesRef, setHorsesRef] = useState<any[]>([]);

    useEffect(() => {
        const fetchHorses = async () => {
            const result = await getHorses(userEmail);
            if (result) setHorsesRef(result);
        };

        if (showAddHorseModal) fetchHorses();
    }, [showAddHorseModal, userEmail]);

    const dateAssignments = job.assignments.filter((a) => {
        const aDate = format(parseUTCToLocal(new Date(a.assignmentDate)) || new Date(a.assignmentDate), 'yyyy-MM-dd');
        const targetDate = format(date, 'yyyy-MM-dd');
        return aDate === targetDate && (role !== 'subcontractor' || a.subcontractor?.email === userEmail);
    });

    const groupedAssignments = dateAssignments.reduce((acc: any, a) => {
        const clientKey = a.horse.client?.name || 'No Client';
        if (!acc[clientKey]) acc[clientKey] = [];
        acc[clientKey].push(a);
        return acc;
    }, {});

    const sortedClients = Object.entries(groupedAssignments).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    const canAddHorse = role === 'barn' && new Date(date).setHours(23, 59, 59, 999) >= new Date().setHours(0, 0, 0, 0);

    return (
        <div className='bg-white w-full max-w-2xl overflow-hidden rounded-[18px] max-h-[90dvh] overflow-y-auto font-figtree flex flex-col'>
            <div className='p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50'>
                <div>
                    <h3 className='text-2xl font-bold font-lusitana text-gray-900 truncate flex items-center gap-2'>{format(date, 'MMMM d, yyyy')}</h3>
                    <div className='flex items-center flex-wrap gap-1 mt-1 text-sm text-gray-500 font-figtree'>
                        <span onClick={() => setViewingShow(job.show)} className='font-bold text-primary flex items-center gap-1 hover:text-primary-light transition-all cursor-pointer'>
                            <p>{job.show.name}</p>
                            <ArrowUpRight className='w-4 h-4' />
                        </span>

                        <span className='truncate flex items-center gap-1'>
                            <MapPin size={14} className='text-gray-400' />
                            {job.show.city}, {job.show.state}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all'>
                    <X size={24} />
                </button>
            </div>

            <div className='p-6 space-y-6 flex-1 overflow-y-auto'>
                {role !== 'braider' && (
                    <div className='flex items-center gap-3 p-3 bg-primary-extra-light/50 rounded-xl border border-primary/10'>
                        <div className='p-2 bg-white rounded-lg shadow-sm text-primary'>
                            <User size={18} />
                        </div>
                        <div>
                            <p className='text-xs font-bold text-primary uppercase tracking-wide'>Braider</p>
                            <p className='text-sm font-medium text-gray-900'>{job.braider.name || 'Unknown'}</p>
                        </div>
                    </div>
                )}
                {sortedClients.length === 0 ? (
                    <div className='text-center py-10 text-gray-400 italic'>No assignments for this day.</div>
                ) : (
                    sortedClients.map(([clientName, assignments]: [string, any]) => (
                        <div key={clientName} className='space-y-3'>
                            <div>
                                <h4 className='font-bold text-lg text-gray-800 font-lusitana'>{clientName}</h4>
                                <div className='flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500'>
                                    <p className='flex items-center gap-1'>
                                        <Mail size={12} />
                                        {assignments[0].horse.client?.email || 'No email'}
                                    </p>
                                    {assignments[0].horse.client?.phoneNumber && (
                                        <p className='flex items-center gap-1'>
                                            <Phone size={12} />
                                            {formatPhoneNumber(assignments[0].horse.client?.phoneNumber)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className='grid gap-3'>
                                {assignments.map((assignment: any) => (
                                    <div key={assignment.id} className='bg-white border border-gray-200 rounded-xl p-3 shadow-sm'>
                                        <div className='flex items-center gap-3 mb-2'>
                                            <div className='w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative'>
                                                {assignment.horse.profileImage ? (
                                                    <Image src={assignment.horse.profileImage} alt={assignment.horse.barnName} fill className='object-cover' />
                                                ) : (
                                                    <div className='w-full h-full flex items-center justify-center font-bold text-primary bg-primary/5'>
                                                        {assignment.horse.barnName[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className='font-bold text-gray-900'>{assignment.horse.barnName}</p>
                                                <p className='text-xs text-gray-500 italic'>{assignment.horse.showName}</p>
                                            </div>
                                        </div>
                                        <div className='space-y-1 pl-1 border-t border-gray-100 pt-2'>
                                            {assignment.services.map((service: any) => (
                                                <div key={service.id} className='flex justify-between text-sm'>
                                                    <span className='text-gray-700'>{service.name}</span>
                                                    <span className='font-bold text-gray-900'>
                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(service.priceUSD)}
                                                    </span>
                                                </div>
                                            ))}
                                            {assignment.customCharges?.map((charge: any) => (
                                                <div key={charge.id} className='flex justify-between text-sm text-amber-700 bg-amber-50 px-2 py-0.5 rounded'>
                                                    <span>{charge.name}</span>
                                                    <span className='font-bold'>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(charge.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {canAddHorse && (
                <div className='p-4 border-t border-gray-100 bg-gray-50'>
                    <button
                        onClick={() => setShowAddHorseModal(true)}
                        className='w-full py-2.5 bg-primary-light text-white rounded-[10px] font-bold flex items-center justify-center primary-border-hover cursor-pointer gap-2'
                    >
                        <Plus size={20} />
                        Request Horse for {format(date, 'MMM d')}
                    </button>
                </div>
            )}

            {/* Reuse AddHorseToJobForm but pre-select date */}
            <Modal isOpen={showAddHorseModal} setIsOpen={setShowAddHorseModal} className='max-w-2xl p-0 rounded-3xl bg-white overflow-hidden primary-border-bold shadow-2xl'>
                <AddHorseToJobForm
                    job={job}
                    horses={horsesRef}
                    braiderServices={job.braider.services}
                    onClose={() => {
                        setShowAddHorseModal(false);
                        onClose();
                    }}
                    refresh={refresh}
                    preSelectedDate={date}
                />
            </Modal>
        </div>
    );
};

// Copied and modified to accept preSelectedDate
const AddHorseToJobForm = ({
    job,
    horses,
    braiderServices,
    onClose,
    refresh,
    preSelectedDate,
}: {
    job: Job;
    horses: any[];
    braiderServices: any[];
    onClose: () => void;
    refresh: () => void;
    preSelectedDate?: Date;
}) => {
    const [selectedHorseId, setSelectedHorseId] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(preSelectedDate || null);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const showDates = React.useMemo(
        () =>
            eachDayOfInterval({
                start: new Date(job.show.startDate),
                end: new Date(job.show.endDate),
            }),
        [job.show.startDate, job.show.endDate],
    );

    useEffect(() => {
        if (preSelectedDate) {
            setSelectedDate(preSelectedDate);
        }
    }, [preSelectedDate]);

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
                    <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-hide'>
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
                                    <span className='text-[10px] uppercase font-bold opacity-60'>{format(date, 'eee')}</span>
                                    <span className='text-xl font-bold font-lusitana'>{format(date, 'd')}</span>
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
                                            .filter((a) => isSameDay(parseUTCToLocal(new Date(a.assignmentDate)) || new Date(a.assignmentDate), selectedDate))
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
                    {loading ? (
                        <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto' />
                    ) : (
                        <div className='flex items-center justify-center gap-2'>
                            <Plus size={20} />
                            Confirm Addition
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};
