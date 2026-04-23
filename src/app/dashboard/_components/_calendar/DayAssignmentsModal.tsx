import React, { useState, useEffect, Fragment } from 'react';
import { Job, statusColors } from '../_tasks/Tasks';
import { format, isSameDay, eachDayOfInterval } from 'date-fns';
import {
    X,
    Calendar,
    Plus,
    Mail,
    Phone,
    Info,
    CheckSquare,
    CheckCircle2,
    User,
    MapPin,
    CircleArrowRight,
    ArrowRight,
    ArrowUpRight,
    PlusCircle,
    Trash2,
    Calendar as CalendarIcon,
    BadgeCheck,
    Icon,
} from 'lucide-react';
import { horseHead } from '@lucide/lab';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { formatPhoneNumber } from '../_settings/Settings';
import { getHorses } from '@/app/actions/horses';
import { addAssignmentsToJob } from '@/app/actions/jobs';
import { successToast, failToast } from '@/app/context';
import Modal from '../../Modal';
import { Show } from './Calendar';
import { calendarDateToLocal } from '@/lib/date-utils';

export const DayAssignmentsModal = ({
    jobs,
    date,
    role,
    userEmail,
    userId,
    setViewingShow,
    onClose,
    refresh,
}: {
    jobs: Job[];
    date: Date;
    role: string;
    userEmail: string;
    userId: string;
    setViewingShow: React.Dispatch<React.SetStateAction<Show | null>>;
    onClose: () => void;
    refresh: () => void;
}) => {
    const [showAddHorseModal, setShowAddHorseModal] = useState(false);
    const [horsesRef, setHorsesRef] = useState<any[]>([]);
    const jobInfo = jobs.map((job) => {
        const dateAssignments = job.assignments.filter((a) => {
            const aDate = format(calendarDateToLocal(new Date(a.assignmentDate)), 'yyyy-MM-dd');
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
        const canAddHorse = role === 'barn' && new Date(date).setHours(23, 59, 59, 999) >= new Date().setHours(0, 0, 0, 0) && !job.invoiceSentAt;

        return { sortedClients, canAddHorse, barn: job.barn.name };
    });

    useEffect(() => {
        const fetchHorses = async () => {
            const result = await getHorses(userId);
            if (result) setHorsesRef(result);
        };

        if (showAddHorseModal) fetchHorses();
    }, [showAddHorseModal, userEmail]);

    return (
        <div className='bg-white w-full max-w-2xl overflow-hidden rounded-[18px] max-h-[90dvh] overflow-y-auto font-figtree flex flex-col'>
            <div className='p-5 pb-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50'>
                <div>
                    <h3 className='text-3xl font-bold font-lusitana text-gray-900 truncate flex items-center gap-2'>{format(date, 'MMMM d, yyyy')}</h3>
                    <div className='flex items-center flex-wrap gap-1 mt-1 text-sm text-gray-500 font-figtree'>
                        <span
                            onClick={() => {
                                onClose();
                                setViewingShow({ ...jobs[0].show, isOwner: role === 'braider' });
                            }}
                            className='font-bold text-primary flex items-center gap-1 hover:text-primary-light transition-all cursor-pointer'
                        >
                            <p>{jobs[0].show.name}</p>
                            <ArrowUpRight className='w-4 h-4' />
                        </span>

                        <span className='truncate flex items-center gap-1'>
                            <MapPin size={14} className='text-gray-400' />
                            {jobs[0].show.city}, {jobs[0].show.state}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className='p-2 text-gray-400 hover:text-gray-600 cursor-pointer rounded-full transition-all'>
                    <X size={24} />
                </button>
            </div>

            <div className='p-6 pt-4 space-y-5 flex-1 overflow-y-auto overflow-x-hidden'>
                {role !== 'braider' && (
                    <div className='flex items-center gap-3 p-3 bg-primary-extra-light/50 rounded-xl border border-primary/10'>
                        <div className='p-2 bg-white rounded-lg shadow-sm text-primary'>
                            <User size={18} />
                        </div>
                        <div>
                            <p className='text-xs font-bold text-primary uppercase tracking-wide'>Braider</p>
                            <p className='text-sm font-medium text-gray-900'>{jobs[0].braider.name || 'Unknown'}</p>
                        </div>
                    </div>
                )}
                {jobInfo.map(({ sortedClients, barn }, i) => {
                    return !jobInfo.some((job) => job.sortedClients.length > 0) && i === 0 ? (
                        <div className='text-center py-10 text-gray-400 italic'>No assignments for this day.</div>
                    ) : (
                        sortedClients.length > 0 && (
                            <Fragment key={i}>
                                {jobInfo.length > 0 && role !== 'barn' && (
                                    <h4 className='text-lg font-semibold mb-4 text-primary-light bg-primary-extra-light rounded-[10px] py-0.5 px-2'>{barn}</h4>
                                )}
                                {sortedClients.map(([clientName, assignments]: [string, any], i: number) => (
                                    <div key={clientName + i} className={cn('space-y-3', jobInfo.length > 0 && role !== 'barn' && 'pl-5 border-l border-gray-200')}>
                                        <div>
                                            <div className='flex items-center gap-2'>
                                                <h4 className='font-bold text-lg text-gray-800 font-lusitana truncate min-w-0 text-nowrap'>{clientName}</h4>
                                                <div className='text-sm font-semibold text-primary-light bg-primary-extra-light rounded-full py-0.5 px-2'>
                                                    {new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                    }).format(
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
                                                    )}
                                                </div>
                                            </div>
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

                                        <div className='grid gap-3 font-figtree'>
                                            {assignments.map((assignment: any) => {
                                                const activeServices = assignment.services.filter((s: any) => !assignment.canceledServiceIds.includes(s.id));
                                                const isComplete =
                                                    assignment.status !== 'denied' &&
                                                    !assignment.canceledAt &&
                                                    activeServices.length > 0 &&
                                                    activeServices.length ===
                                                        [...new Set(assignment.completedServiceIds.filter((id: any) => !assignment.canceledServiceIds.includes(id)))].length;

                                                return (
                                                    <div
                                                        key={assignment.id}
                                                        className={cn(
                                                            'bg-white border border-gray-200 rounded-xl p-3 shadow-sm overflow-x-hidden',
                                                            !!assignment.canceledAt || assignment.status === 'denied' || activeServices.length === 0 ? 'opacity-30' : '',
                                                            isComplete ? 'bg-primary-extra-light/90 border-primary/30' : '',
                                                        )}
                                                    >
                                                        <div className='flex items-center justify-between gap-3 mb-2'>
                                                            <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                                <div className='min-w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative'>
                                                                    {assignment.horse.profileImage ? (
                                                                        <Image src={assignment.horse.profileImage} alt={assignment.horse.barnName} fill className='object-cover' />
                                                                    ) : (
                                                                        <div className='w-full h-full flex items-center justify-center font-bold text-primary bg-primary/5'>
                                                                            {assignment.horse.barnName[0]}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className='min-w-0'>
                                                                    <p className='font-bold text-gray-900 truncate'>{assignment.horse.barnName}</p>
                                                                    <p className='text-xs text-gray-500 italic truncate'>{assignment.horse.showName}</p>
                                                                </div>
                                                            </div>
                                                            {isComplete ? <BadgeCheck className='text-primary-light w-8 h-8' strokeWidth={2.25} /> : <></>}
                                                        </div>
                                                        <div className='space-y-1 pl-1 border-t border-gray-100 pt-2'>
                                                            {assignment.services.map((service: any) => (
                                                                <div
                                                                    key={service.id}
                                                                    className={cn(
                                                                        'flex justify-between text-sm',
                                                                        assignment.canceledServiceIds.includes(service.id) ? 'text-gray-400 line-through' : '',
                                                                    )}
                                                                >
                                                                    <span className='flex items-center gap-1 min-w-0'>
                                                                        {assignment.completedServiceIds.includes(service.id) ? (
                                                                            <BadgeCheck className='text-primary-light w-4.5 h-4.5' strokeWidth={2.25} />
                                                                        ) : (
                                                                            <></>
                                                                        )}
                                                                        <span
                                                                            className={cn(
                                                                                'truncate min-w-0',
                                                                                assignment.completedServiceIds.includes(service.id) ? 'text-primary-dark' : 'text-gray-700',
                                                                            )}
                                                                        >
                                                                            {service.name}
                                                                        </span>
                                                                    </span>
                                                                    <span
                                                                        className={cn(
                                                                            'font-bold',
                                                                            assignment.canceledServiceIds.includes(service.id)
                                                                                ? 'text-gray-400'
                                                                                : assignment.completedServiceIds.includes(service.id)
                                                                                  ? 'text-primary-dark'
                                                                                  : 'text-gray-900',
                                                                        )}
                                                                    >
                                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(service.priceUSD)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {assignment.customCharges?.map((charge: any) => (
                                                                <div key={charge.id} className='flex justify-between text-sm font-bold text-amber-700'>
                                                                    <span className='flex items-center gap-1'>
                                                                        <PlusCircle className='w-4 h-4' />
                                                                        <span>{charge.name}</span>
                                                                    </span>
                                                                    <span className='font-bold'>
                                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(charge.amount)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </Fragment>
                        )
                    );
                })}
            </div>

            {jobInfo[0].canAddHorse && (
                <div className='p-4 border-t border-gray-100 bg-gray-50'>
                    <button
                        onClick={() => setShowAddHorseModal(true)}
                        className='w-full py-2.5 bg-primary-light text-white rounded-[10px] font-bold flex items-center justify-center primary-border-hover cursor-pointer gap-2'
                    >
                        <Plus size={20} />
                        Request Horses for {format(date, 'MMM d')}
                    </button>
                </div>
            )}

            <Modal isOpen={showAddHorseModal} setIsOpen={setShowAddHorseModal} className='max-w-2xl p-0 rounded-3xl bg-white overflow-hidden primary-border-bold shadow-2xl'>
                <AddHorseToJobForm
                    job={jobs[0]}
                    horses={horsesRef}
                    braiderServices={jobs[0].braider.services}
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
    const [assignments, setAssignments] = useState<{ horseId: string; clientName: string; serviceIds: string[]; date: Date }[]>([]);
    const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(preSelectedDate || null);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const showDates = React.useMemo(() => {
        const start = calendarDateToLocal(job.show.startDate);
        const end = calendarDateToLocal(job.show.endDate);
        if (!start || !end) return [];
        return eachDayOfInterval({
            start,
            end,
        });
    }, [job.show.startDate, job.show.endDate]);

    useEffect(() => {
        if (preSelectedDate) {
            setSelectedDate(preSelectedDate);
        }
    }, [preSelectedDate]);

    const handleAddToList = () => {
        if (selectedHorseIds.length === 0 || !selectedDate || selectedServiceIds.length === 0) return;

        const existingAssignment = assignments.some((a) => selectedHorseIds.includes(a.horseId) && isSameDay(a.date, selectedDate));
        if (existingAssignment) {
            failToast('One or more horses already added for this date');
            return;
        }

        setAssignments((prev) =>
            existingAssignment
                ? prev
                : [
                      ...prev,
                      ...selectedHorseIds.map((horseId) => ({
                          clientName: horses.find((h) => h.id === horseId)?.client.name,
                          horseId: horseId,
                          serviceIds: selectedServiceIds,
                          date: selectedDate,
                      })),
                  ],
        );

        setSelectedHorseIds([]);
        setSelectedServiceIds([]);
    };

    const handleRemoveAssignment = (index: number) => {
        setAssignments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleConfirm = async () => {
        if (assignments.length === 0) return;
        setLoading(true);
        const res = await addAssignmentsToJob(
            job.id,
            assignments.map((a) => ({
                horseId: a.horseId,
                date: a.date,
                serviceIds: a.serviceIds,
            })),
        );
        if (res.success) {
            successToast(`${assignments.length} horse${assignments.length === 1 ? '' : 's'} added to request`);
            refresh();
            onClose();
        } else {
            failToast(res.error || `Failed to add horse${assignments.length === 1 ? '' : 's'}`);
        }
        setLoading(false);
    };

    const groupedAssignments = React.useMemo(() => {
        const groups: Record<string, Record<string, typeof assignments>> = {};
        assignments.forEach((a) => {
            const dateKey = format(calendarDateToLocal(a.date), 'yyyy-MM-dd HH:mm:ss');
            if (!groups[dateKey]) groups[dateKey] = {};
            if (!groups[dateKey][a.clientName]) groups[dateKey][a.clientName] = [];
            groups[dateKey][a.clientName].push(a);
        });
        return groups;
    }, [assignments]);

    const totalCost = React.useMemo(() => {
        return assignments.reduce((acc, a) => {
            const serviceCost = a.serviceIds.reduce((sum, sId) => {
                const service = braiderServices.find((s) => s.id === sId);
                return sum + (service?.priceUSD || 0);
            }, 0);
            return acc + serviceCost;
        }, 0);
    }, [assignments, braiderServices]);

    return (
        <div className='flex flex-col max-h-[90vh] font-figtree'>
            <div className='px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center bg-white'>
                <h3 className='text-3xl font-bold text-gray-900 font-lusitana'>Add Horses to Request</h3>
                <button onClick={onClose} className='p-2 text-gray-400 hover:text-gray-600 transition-all cursor-pointer'>
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
                                        setSelectedHorseIds([]);
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
                        <Icon iconNode={horseHead} size={14} /> Select Horse
                    </label>
                    <div className='grid grid-cols-2 dashboard-sm:grid-cols-3 gap-3'>
                        {horses.map((horse) => (
                            <button
                                key={horse.id}
                                onClick={() => {
                                    if (selectedHorseIds.includes(horse.id)) setSelectedHorseIds((prev) => prev.filter((id) => id !== horse.id));
                                    else setSelectedHorseIds((prev) => [...prev, horse.id]);
                                }}
                                className={cn(
                                    'p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group cursor-pointer',
                                    selectedHorseIds.includes(horse.id)
                                        ? 'border-primary bg-primary-extra-light text-primary shadow-md'
                                        : 'border-gray-200 shadow-sm text-gray-600 hover:border-primary-light',
                                    !selectedDate ||
                                        job.assignments.filter((a) => isSameDay(calendarDateToLocal(new Date(a.assignmentDate)), selectedDate)).some((a) => a.horse.id === horse.id) ||
                                        assignments.some((a) => a.horseId === horse.id && isSameDay(a.date, selectedDate))
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
                                <span className={cn('text-[14px] font-bold truncate w-full text-center', selectedHorseIds.includes(horse.id) ? 'text-primary' : 'text-gray-700')}>
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

                <div className='mt-6'>
                    <button
                        onClick={handleAddToList}
                        disabled={!selectedDate || selectedHorseIds.length === 0 || selectedServiceIds.length === 0}
                        className='bg-background primary-border-hover text-primary cursor-pointer font-bold py-2 px-6 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2'
                    >
                        <Plus size={18} />
                        Add to List{selectedHorseIds.length > 0 ? ` (${selectedHorseIds.length})` : ''}
                    </button>
                </div>

                {assignments.length > 0 && (
                    <div className='space-y-4 mt-8'>
                        <h3 className='font-bold text-gray-900 text-2xl flex justify-between items-center'>
                            <span>Summary</span>
                            <span className='text-primary font-lusitana text-2xl'>
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(totalCost)}
                            </span>
                        </h3>

                        <div className='space-y-6'>
                            {Object.entries(groupedAssignments)
                                .sort()
                                .map(([dateKey, group]) => (
                                    <div key={dateKey} className='bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden'>
                                        <div className='bg-white px-4 py-2 border-b border-gray-100 flex items-center gap-2'>
                                            <CalendarIcon size={16} className='text-gray-400' />
                                            <span className='font-bold text-gray-700 font-figtree'>{format(new Date(dateKey), 'EEEE, MMMM do')}</span>
                                            <span className='text-gray-400 text-sm'>
                                                ({Object.values(group).reduce((acc, a) => acc + a.length, 0)} horse
                                                {Object.values(group).reduce((acc, a) => acc + a.length, 0) !== 1 ? 's' : ''})
                                            </span>
                                        </div>
                                        <div className='divide-y divide-gray-100'>
                                            {Object.entries(group)
                                                .sort(([aKey, _], [bKey]) => aKey.localeCompare(bKey))
                                                .map(([clientName, horseAssignments]) => (
                                                    <div key={clientName} className='mt-2'>
                                                        <span className='font-lusitana ml-4 text-lg text-gray-600 border-b border-gray-300'>{`${clientName} • ${new Intl.NumberFormat(
                                                            'en-US',
                                                            {
                                                                style: 'currency',
                                                                currency: 'USD',
                                                            },
                                                        ).format(
                                                            horseAssignments.reduce(
                                                                (acc, a) => acc + a.serviceIds.reduce((acc, sid) => acc + (braiderServices.find((s) => s.id === sid)?.priceUSD || 0), 0),
                                                                0,
                                                            ),
                                                        )}`}</span>

                                                        {horseAssignments.map((a, i) => {
                                                            const horse = horses.find((h) => h.id === a.horseId);
                                                            const aServices = a.serviceIds.map((sid) => braiderServices.find((s) => s.id === sid)).filter(Boolean);
                                                            const originalIndex = assignments.findIndex((orig) => orig === a);

                                                            return (
                                                                <div key={i} className='ml-3 p-4 flex gap-4 items-start group'>
                                                                    <div className='w-18 h-18 rounded-xl bg-gray-200 overflow-hidden relative shrink-0'>
                                                                        {horse?.profileImage ? (
                                                                            <Image src={horse.profileImage} alt={horse.barnName} fill className='object-cover' />
                                                                        ) : (
                                                                            <div className='w-full h-full flex items-center justify-center text-gray-500 font-bold'>
                                                                                {horse?.barnName?.[0]}
                                                                            </div>
                                                                        )}
                                                                        <div className='absolute opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out flex justify-center items-center bg-black/50 w-18 h-18 rounded-xl top-0 left-0 text-white font-bold text-sm'>
                                                                            {new Intl.NumberFormat('en-US', {
                                                                                style: 'currency',
                                                                                currency: 'USD',
                                                                            }).format(aServices.reduce((acc, s) => acc + (s?.priceUSD || 0), 0))}
                                                                        </div>
                                                                    </div>
                                                                    <div className='flex-1 min-w-0'>
                                                                        <div className='flex justify-between items-start'>
                                                                            <div>
                                                                                <p className='font-bold text-gray-900'>{horse?.barnName}</p>
                                                                                <p className='text-xs text-gray-500'>{horse?.showName}</p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => handleRemoveAssignment(originalIndex)}
                                                                                className='text-gray-300 hover:text-red-500 group-hover:opacity-100 opacity-0 transition-all cursor-pointer'
                                                                            >
                                                                                <Trash2 size={24} />
                                                                            </button>
                                                                        </div>
                                                                        <div className='flex flex-wrap gap-2 mt-2'>
                                                                            {aServices.map((s) => (
                                                                                <span
                                                                                    key={s?.id}
                                                                                    className='text-xs font-medium px-2 py-0.5 rounded-full bg-primary-extra-light text-primary-dark border border-primary/10'
                                                                                >
                                                                                    {s?.name} (
                                                                                    {new Intl.NumberFormat('en-US', {
                                                                                        style: 'currency',
                                                                                        currency: 'USD',
                                                                                    }).format(s?.priceUSD)}
                                                                                    )
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            <div className='p-6 bg-gray-50 border-t border-gray-100'>
                <button
                    onClick={handleConfirm}
                    disabled={loading || assignments.length === 0}
                    className='w-full py-2.5 cursor-pointer bg-primary-light text-white rounded-[10px] font-bold text-lg primary-border-hover disabled:opacity-50'
                >
                    {loading ? (
                        <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto' />
                    ) : (
                        <div className='flex items-center justify-center gap-2'>
                            <Plus size={20} />
                            Confirm Additions ({assignments.length})
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};
