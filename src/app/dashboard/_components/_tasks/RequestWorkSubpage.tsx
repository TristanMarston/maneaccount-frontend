'use client';

import { ChevronLeft, MapPin, Plus, Trash2, Calendar as CalendarIcon, Info, Users, User, Check, Building2, CircleAlert, Loader2, Pencil } from 'lucide-react';
import { Job, statusColors } from './Tasks';
import { useEffect, useState, useMemo, Fragment } from 'react';
import { getRelations } from '@/app/actions/barn-relations';
import { getBraiderData, createJob, submitJob, updateJobDraft, deleteJob } from '@/app/actions/jobs';
import { getHorses } from '@/app/actions/horses';
import { motion, AnimatePresence } from 'motion/react';
import { format, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { successToast, failToast } from '@/app/context';
import DatePicker from '../DatePicker';
import { ViewShowDetailsModal } from './RequestWorkModals';
import Modal from '../../Modal';
import { parseUTCToLocal, normalizeDateToUTC } from '@/lib/date-utils';

const RequestWorkSubpage = ({
    job: initialJob,
    role,
    userEmail,
    onBack,
    setSelectedHorse,
    refresh,
}: {
    job: Job | 'creating';
    role: string;
    userEmail: string;
    onBack: () => void;
    setSelectedHorse: React.Dispatch<React.SetStateAction<any | null>>;
    refresh: () => void;
}) => {
    // Mode
    const isEditing = initialJob !== 'creating';

    // Data State
    const [braiders, setBraiders] = useState<any[]>([]);
    const [shows, setShows] = useState<any[]>([]);
    const [horses, setHorses] = useState<any[]>([]);
    const [braiderServices, setBraiderServices] = useState<any[]>([]);

    // Selection State
    const [selectedBraider, setSelectedBraider] = useState<any>(isEditing ? (initialJob as Job).braider : null);
    const [selectedShow, setSelectedShow] = useState<any>(isEditing ? (initialJob as Job).show : null);

    // Assignment Editor State
    const [assignments, setAssignments] = useState<{ horseId: string; clientName: string; serviceIds: string[]; date: Date; id?: string }[]>(
        isEditing
            ? (initialJob as Job).assignments.map((a) => ({
                  horseId: a.horse.id,
                  clientName: a.horse.client.name,
                  serviceIds: a.services.map((s) => s.id),
                  date: parseUTCToLocal(a.assignmentDate) || new Date(a.assignmentDate),
                  id: a.id,
              }))
            : [],
    );

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedHorseId, setSelectedHorseId] = useState<string>('');
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [checkDelete, setCheckDelete] = useState(false);

    // Fetch Initial Data
    useEffect(() => {
        const init = async () => {
            setInitializing(true);

            // Fetch Horses (always needed)
            const horsesData = await getHorses(userEmail);
            if (horsesData) setHorses(horsesData);

            if (!isEditing) {
                // Fetch Braiders for selection
                const rels = await getRelations(userEmail);
                setBraiders(rels.filter((r) => r.role === 'braider'));
            } else {
                // Fetch Braider Data (services, shows) for the existing job's braider
                const job = initialJob as Job;
                const data = await getBraiderData(job.braider.id);
                if (data) {
                    setShows(data.shows);
                    setBraiderServices(data.services);

                    // Pre-select show if still available, or keep existing object
                    // We keep current show/braider fixed in editing mode usually
                }
            }
            setInitializing(false);
        };
        init();
    }, [userEmail, isEditing, initialJob]);

    // Fetch Braider Details when selected (Creating mode)
    useEffect(() => {
        const fetchBraiderData = async () => {
            if (selectedBraider && !isEditing) {
                const data = await getBraiderData(selectedBraider.id);
                if (data) {
                    setShows(data.shows);
                    setBraiderServices(data.services);
                }
            }
        };
        fetchBraiderData();
    }, [selectedBraider, isEditing]);

    useEffect(() => {
        const determineCheck = (e: BeforeUnloadEvent) => {
            let changesMade = false;

            if (initialJob === 'creating') {
                changesMade = assignments.length > 0 || selectedBraider !== null || selectedShow !== null;
            } else {
                const job = initialJob as Job;
                const previousAssignments = [...job.assignments].sort((a, b) => a.id.localeCompare(b.id));
                const currentAssignments = [...assignments].sort((a, b) => (a.id || '').localeCompare(b.id || ''));

                if (previousAssignments.length !== currentAssignments.length) {
                    changesMade = true;
                } else if (selectedBraider?.id !== job.braider.id || selectedShow?.id !== job.show.id) {
                    changesMade = true;
                } else {
                    changesMade = currentAssignments.some((curr, i) => {
                        const prev = previousAssignments[i];
                        const prevServiceIds = prev.services.map((s) => s.id).sort();
                        const currServiceIds = [...curr.serviceIds].sort();

                        return (
                            curr.horseId !== prev.horse.id ||
                            new Date(curr.date).getTime() !== new Date(prev.assignmentDate).getTime() ||
                            prevServiceIds.length !== currServiceIds.length ||
                            currServiceIds.some((id, idx) => id !== prevServiceIds[idx])
                        );
                    });
                }
            }

            if (changesMade) e.preventDefault();
        };

        window.addEventListener('beforeunload', determineCheck);
        return () => window.removeEventListener('beforeunload', determineCheck);
    }, [initialJob, assignments, selectedBraider, selectedShow]);

    const showDates = useMemo(() => {
        if (!selectedShow) return [];
        const start = parseUTCToLocal(selectedShow.startDate);
        const end = parseUTCToLocal(selectedShow.endDate);
        if (!start || !end) return [];
        return eachDayOfInterval({
            start,
            end,
        });
    }, [selectedShow]);

    // Add Assignment Handler
    const handleAddAssignment = () => {
        if (!selectedDate || !selectedHorseId || selectedServiceIds.length === 0) return;

        const existingAssignment = assignments.filter((a) => a.horseId === selectedHorseId && a.date === selectedDate).length !== 0;

        setAssignments((prev) =>
            existingAssignment
                ? prev
                : [
                      ...prev,
                      {
                          clientName: horses.find((h) => h.id === selectedHorseId)?.client.name,
                          horseId: selectedHorseId,
                          serviceIds: selectedServiceIds,
                          date: selectedDate,
                      },
                  ],
        );

        if (existingAssignment) failToast('Horse already added for this date');
        else {
            setSelectedHorseId('');
            setSelectedServiceIds([]);
            setSelectedHorse(null);
        }
    };

    const sortedAssignments = useMemo(() => {
        return [...assignments].sort((a, b) => {
            const clientA = a.clientName;
            const clientB = b.clientName;
            if (clientA !== clientB) return clientA.localeCompare(clientB);

            const horseA = horses.find((h) => h.id === a.horseId);
            const horseB = horses.find((h) => h.id === b.horseId);
            return (horseA?.barnName || '').localeCompare(horseB?.barnName || '');
        });
    }, [assignments, horses]);

    const handleRemoveAssignment = (index: number) => {
        setAssignments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDateSelect = (date: Date) => {
        const safeDate = new Date(date);
        safeDate.setHours(12, 0, 0, 0);
        setSelectedDate(safeDate);
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            const assignmentData = assignments.map((a) => ({
                horseId: a.horseId,
                serviceIds: a.serviceIds,
                date: normalizeDateToUTC(a.date) as Date,
            }));

            if (isEditing) {
                const res = await updateJobDraft((initialJob as Job).id, assignmentData);
                if (res.success) {
                    successToast('Draft saved successfully');
                    refresh();
                    onBack();
                } else {
                    failToast(res.error || 'Failed to save draft');
                }
            } else {
                if (!selectedBraider || !selectedShow) return;
                const res = await createJob({
                    braiderId: selectedBraider.id,
                    showId: selectedShow.id,
                    assignments: assignmentData,
                });

                if (res.success) {
                    successToast('Draft created successfully');
                    refresh();
                    onBack();
                } else {
                    failToast(res.error || 'Failed to create draft');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDiscardDraft = async () => {
        if (initialJob === 'creating') {
            onBack();
        } else {
            setLoading(true);
            try {
                const res = await deleteJob((initialJob as Job).id);
                if (res.success) {
                    successToast('Draft discarded successfully');
                    refresh();
                } else {
                    failToast(res.error || 'Failed to discard draft');
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const assignmentData = assignments.map((a) => ({
                horseId: a.horseId,
                serviceIds: a.serviceIds,
                date: normalizeDateToUTC(a.date) as Date,
            }));

            let jobId = isEditing ? (initialJob as Job).id : '';

            if (isEditing) {
                // Update first
                const updateRes = await updateJobDraft(jobId, assignmentData);
                if (!updateRes.success) throw new Error(updateRes.error);
            } else {
                // Create
                if (!selectedBraider || !selectedShow) return;
                const createRes = await createJob({
                    braiderId: selectedBraider.id,
                    showId: selectedShow.id,
                    assignments: assignmentData,
                });
                if (!createRes.success || !createRes.jobId) throw new Error(createRes.error);
                jobId = createRes.jobId;
            }

            // Submit
            const submitRes = await submitJob(jobId, new Date().getTimezoneOffset());
            if (submitRes.success) {
                successToast('Request submitted successfully');
                refresh();
                onBack();
            } else {
                failToast(submitRes.error || 'Failed to submit request');
            }
        } catch (error: any) {
            failToast(error.message || 'Error processing request');
        } finally {
            setLoading(false);
        }
    };

    const groupedAssignments = useMemo(() => {
        const groups: Record<string, Record<string, typeof assignments>> = {};

        sortedAssignments.forEach((a) => {
            const dateKey = format(a.date, 'yyyy-MM-dd HH:mm:ss');
            if (!groups[dateKey]) groups[dateKey] = {};
            if (!groups[dateKey][a.clientName]) groups[dateKey][a.clientName] = [];
            groups[dateKey][a.clientName].push(a);
        });
        return groups;
    }, [sortedAssignments]);

    const totalCost = useMemo(() => {
        return assignments.reduce((acc, a) => {
            const serviceCost = a.serviceIds.reduce((sum, sId) => {
                const service = braiderServices.find((s) => s.id === sId);
                return sum + (service?.priceUSD || 0);
            }, 0);
            return acc + serviceCost;
        }, 0);
    }, [assignments, braiderServices]);

    if (initializing) {
        return (
            <div className='w-full h-96 flex items-center justify-center'>
                <span className='loader-primary'></span>
            </div>
        );
    }

    return (
        <>
            <div className='font-figtree pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 w-full @container/request-page'>
                <div className='flex flex-col @min-[530px]/request-page:flex-row @min-[530px]/request-page:items-center gap-4 justify-between mb-4'>
                    <div className='flex items-center gap-4'>
                        <button
                            onClick={() => {
                                if (initialJob === 'creating') setCheckDelete(true);
                                else {
                                    const previousAssignments = (initialJob as Job).assignments.sort((a, b) => a.horse.id.localeCompare(b.horse.id));
                                    const currentAssignments = assignments.sort((a, b) => a.horseId.localeCompare(b.horseId));
                                    let checking = false;

                                    if (previousAssignments.length !== currentAssignments.length) {
                                        setCheckDelete(true);
                                        checking = true;
                                    } else {
                                        for (let i = 0; i < previousAssignments.length; i++) {
                                            if (previousAssignments[i].horse.id !== currentAssignments[i].horseId) {
                                                setCheckDelete(true);
                                                checking = true;
                                                break;
                                            }
                                        }
                                    }

                                    if (!checking) onBack();
                                }
                            }}
                            className='p-2 cursor-pointer rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-all'
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className='text-3xl font-lusitana font-bold text-gray-900'>{isEditing ? 'Edit Request' : 'New Request'}</h1>
                            <p className='text-gray-500'>{isEditing ? (initialJob as Job).show.name : 'Create a new service request'}</p>
                        </div>
                    </div>
                    <div className='flex gap-3 items-center w-full @min-[530px]/request-page:w-auto'>
                        <button
                            onClick={() => setCheckDelete(true)}
                            disabled={loading || assignments.length === 0}
                            className='px-4 py-2 w-full @min-[530px]/request-page:w-auto rounded-[10px] cursor-pointer font-bold text-red-500 red-border-hover transition-all disabled:opacity-50 text-[15px]'
                        >
                            Discard Draft
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={loading || assignments.length === 0}
                            className='px-4 py-2 w-full @min-[530px]/request-page:w-auto rounded-[10px] cursor-pointer font-bold text-primary primary-border-hover transition-all disabled:opacity-50 text-[15px]'
                        >
                            Save Draft
                        </button>
                    </div>
                </div>

                {selectedBraider && selectedShow && (
                    <div className='flex flex-wrap items-center shadow-sm gap-2 mb-4 p-3 bg-primary-extra-light/30 rounded-xl border border-primary/10 animate-in fade-in zoom-in-95 duration-300'>
                        {!isEditing && (
                            <button
                                onClick={() => {
                                    setSelectedShow(null);
                                    setAssignments([]);
                                }}
                                className='text-primary px-2 hover:text-primary-light transition-all cursor-pointer'
                            >
                                <Pencil />
                            </button>
                        )}
                        <div className='flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100'>
                            <div className='w-5 h-5 rounded-full bg-gray-100 overflow-hidden relative shrink-0'>
                                <Image src={selectedBraider.image || ''} alt={selectedBraider.name} fill className='object-cover' />
                            </div>
                            <span className='font-bold text-sm text-gray-900'>{selectedBraider.name}</span>
                        </div>
                        <span className='text-gray-300'>•</span>
                        <div className='flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-gray-100'>
                            <MapPin size={14} className='text-primary' />
                            <span className='font-bold text-sm text-gray-900'>{selectedShow.name}</span>
                        </div>
                    </div>
                )}

                {!isEditing && !selectedShow && (
                    <div className='space-y-6'>
                        <div>
                            <div className='mb-4'>
                                <AnimatePresence mode='wait'>
                                    {!selectedBraider && (
                                        <motion.h3
                                            initial={{ opacity: 1, y: 0, height: 28 }}
                                            exit={{ opacity: 0, y: -10, height: 0 }}
                                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                                            className='font-bold text-gray-500 mb-2 text-lg uppercase'
                                        >
                                            Which Braider?
                                        </motion.h3>
                                    )}
                                </AnimatePresence>
                                <div className='grid grid-cols-1 overflow-x-hidden @min-[480px]/request-page:grid-cols-2 @min-[840px]/request-page:grid-cols-3 gap-3 pb-1'>
                                    {braiders.length > 0 ? (
                                        <AnimatePresence key='animate-presence-braiders'>
                                            {braiders.map((b) =>
                                                (selectedBraider ? b.id === selectedBraider.id : true) ? (
                                                    <div key={b.id} className='w-full relative'>
                                                        <motion.div
                                                            initial={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            transition={{ duration: 0.4, ease: 'easeInOut' }}
                                                            onClick={() => {
                                                                if (selectedBraider?.id !== b.id) setSelectedBraider(b);
                                                            }}
                                                            className={cn(
                                                                'pl-4 pr-[70px] @min-[480px]/request-page:pr-4 py-2.5 rounded-xl border shadow-sm transition-all flex items-center gap-3 overflow-hidden',
                                                                selectedBraider?.id === b.id
                                                                    ? 'bg-primary-extra-light border-primary'
                                                                    : 'border-gray-200 bg-white hover:border-primary/50 cursor-pointer hover:shadow-md',
                                                            )}
                                                        >
                                                            <div className='min-w-10 h-10 rounded-full bg-gray-100 overflow-hidden relative'>
                                                                {b.image ? (
                                                                    <Image src={b.image} alt={b.name} fill className='object-cover' />
                                                                ) : (
                                                                    <User className='w-full h-full p-2 text-gray-400' />
                                                                )}
                                                            </div>
                                                            <span className='font-bold text-gray-900 text-[17px] font-figtree truncate min-w-0'>{b.name}</span>
                                                        </motion.div>
                                                        {selectedBraider?.id === b.id && (
                                                            <div
                                                                onClick={() => setSelectedBraider(null)}
                                                                className='w-10 h-10 absolute right-4 @min-[480px]/request-page:-right-12 top-[50%] translate-y-[-50%] rounded-xl bg-primary-extra-light p-1.5 border border-primary flex justify-center items-center cursor-pointer hover:bg-primary/10 transition-all'
                                                            >
                                                                <Pencil className='text-primary w-4 h-4' />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Fragment key={b.id}></Fragment>
                                                ),
                                            )}
                                        </AnimatePresence>
                                    ) : (
                                        <div className='col-span-3 text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl'>
                                            No braiders connected. Please add a braider first.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedBraider && (
                                <>
                                    <h3 className='font-bold text-gray-500 mb-2 text-lg uppercase'>Which Show?</h3>
                                    <div className='grid grid-cols-1 @min-[480px]/request-page:grid-cols-2 @min-[800px]/request-page:grid-cols-3 gap-3'>
                                        {shows.length > 0 ? (
                                            shows.map((s) => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => setSelectedShow(s)}
                                                    className='p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-primary/50 hover:shadow-md cursor-pointer transition-all'
                                                >
                                                    <h4 className='font-bold text-gray-900 truncate pr-2 text-[17px]'>{s.name}</h4>
                                                    <div className='flex items-center gap-1.5 text-sm text-gray-500'>
                                                        <MapPin size={14} />
                                                        {s.city}, {s.state}
                                                    </div>
                                                    <div className='flex items-center gap-1.5 text-sm text-gray-500 mt-1'>
                                                        <CalendarIcon size={14} />
                                                        {format(parseUTCToLocal(new Date(s.startDate)) || new Date(s.startDate), 'MMM d')} -{' '}
                                                        {format(parseUTCToLocal(new Date(s.endDate)) || s.endDate, 'MMM d')}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className='col-span-3 text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl'>
                                                This braider has no upcoming shows listed.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {selectedBraider && selectedShow && (
                    <motion.div className='space-y-8' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'anticipate' }}>
                        <div className='p-6 bg-white rounded-2xl border border-gray-200 shadow-sm'>
                            <h3 className='font-bold text-gray-900 text-xl mb-4'>Add Assignments</h3>

                            <div className='mb-6'>
                                <label className='block text-xs font-bold text-gray-500 uppercase mb-2'>1. Select Date</label>
                                <div className='flex flex-wrap gap-2'>
                                    {showDates.map((date) => {
                                        const isSelected = selectedDate && isSameDay(date, selectedDate);
                                        return (
                                            <button
                                                key={date.toString()}
                                                onClick={() => handleDateSelect(date)}
                                                className={cn(
                                                    'px-4 py-2 rounded-lg text-sm font-medium shadow-sm border transition-all cursor-pointer',
                                                    isSelected
                                                        ? 'bg-primary-extra-light text-primary border-primary'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:shadow-md',
                                                )}
                                            >
                                                {format(date, 'EEE, MMM d')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className='flex flex-col gap-6'>
                                <div>
                                    <label className='block text-xs font-bold text-gray-500 uppercase mb-2'>2. Select Horse</label>
                                    <div className='grid grid-cols-1 @min-[300px]/request-page:grid-cols-2 @min-[400px]/request-page:grid-cols-3 @min-[520px]/request-page:grid-cols-4 @min-[650px]/request-page:grid-cols-5 @min-[770px]/request-page:grid-cols-6 @min-[870px]/request-page:grid-cols-7 gap-3 max-h-[300px] overflow-y-auto pr-2 pb-1 p-1'>
                                        {horses.map((h) => (
                                            <div
                                                key={h.id}
                                                onClick={() => {
                                                    setSelectedHorseId(h.id);
                                                }}
                                                className={cn(
                                                    'flex flex-col items-center gap-2 p-3 rounded-xl shadow-sm border cursor-pointer transition-all relative group',
                                                    selectedHorseId === h.id
                                                        ? 'bg-primary-extra-light border-primary'
                                                        : 'bg-white border-gray-200 hover:shadow-md hover:border-primary/50',
                                                )}
                                            >
                                                <div className='w-12 h-12 rounded-full bg-gray-100 overflow-hidden relative shadow-sm shrink-0'>
                                                    {h.profileImage ? (
                                                        <Image src={h.profileImage} alt={h.barnName} fill className='object-cover' />
                                                    ) : (
                                                        <div className='w-full h-full flex items-center justify-center text-gray-400 font-bold'>{h.barnName[0]}</div>
                                                    )}
                                                </div>
                                                <span className='font-bold text-sm text-center truncate w-full'>{h.barnName}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedHorse(h);
                                                    }}
                                                    className='absolute cursor-pointer top-1 w-4 h-4 right-5 p-1 rounded-full text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity'
                                                >
                                                    <Info />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className='block text-xs font-bold text-gray-500 uppercase mb-2'>3. Select Services</label>
                                    <div className='flex flex-wrap gap-2'>
                                        {braiderServices.length > 0 ? (
                                            braiderServices.map((s) => {
                                                const isSelected = selectedServiceIds.includes(s.id);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setSelectedServiceIds((prev) => (isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]))}
                                                        className={cn(
                                                            'px-3 py-1.5 rounded-lg text-sm shadow-sm cursor-pointer font-medium border transition-all flex items-center gap-2',
                                                            isSelected
                                                                ? 'bg-primary-extra-light text-primary border-primary'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:shadow-md',
                                                        )}
                                                    >
                                                        {s.name} (
                                                        {new Intl.NumberFormat('en-US', {
                                                            style: 'currency',
                                                            currency: 'USD',
                                                        }).format(s.priceUSD)}
                                                        {s.duration ? ` • ${s.duration} mins` : ''})
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className='text-sm text-gray-400 italic'>No services available</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className='mt-6'>
                                <button
                                    onClick={handleAddAssignment}
                                    disabled={!selectedDate || !selectedHorseId || selectedServiceIds.length === 0}
                                    className='bg-background primary-border-hover text-primary cursor-pointer font-bold py-2 px-6 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2'
                                >
                                    <Plus size={18} />
                                    Add to List
                                </button>
                            </div>
                        </div>

                        <div className='space-y-4'>
                            <h3 className='font-bold text-gray-900 text-2xl flex justify-between items-center'>
                                <span>Summary</span>
                                <span className='text-primary font-lusitana text-2xl'>
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                    }).format(totalCost)}
                                </span>
                            </h3>

                            {assignments.length > 0 ? (
                                <div className='space-y-6'>
                                    {Object.entries(groupedAssignments)
                                        .sort()
                                        .map(([dateKey, group]) => (
                                            <div key={dateKey} className='bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden'>
                                                <div className='bg-white px-4 py-2 border-b border-gray-100 flex items-center gap-2'>
                                                    <CalendarIcon size={16} className='text-gray-400' />
                                                    <span className='font-bold text-gray-700'>{format(new Date(dateKey), 'EEEE, MMMM do')}</span>
                                                    <span className='text-gray-400 text-sm'>
                                                        ({Object.keys(group).length} horse{Object.keys(group).length !== 1 ? 's' : ''})
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
                                                                        (acc, a) =>
                                                                            acc + a.serviceIds.reduce((acc, sid) => acc + (braiderServices.find((s) => s.id === sid)?.priceUSD || 0), 0),
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
                                                                                <div className='absolute opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out flex justify-center items-center bg-black/50 w-18 h-18 rounded-xl top-0 left-0 text-white font-bold'>
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
                            ) : (
                                <div className='text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl'>
                                    <p className='text-gray-400'>No assignments added yet.</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || assignments.length === 0}
                            className='w-full py-2 rounded-[10px] cursor-pointer font-bold text-white bg-primary-light primary-border-hover transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2 text-lg'
                        >
                            {loading && <Loader2 size={18} className='animate-spin' />}
                            Submit Request
                        </button>
                    </motion.div>
                )}
            </div>
            <Modal isOpen={checkDelete} setIsOpen={(open: boolean) => setCheckDelete(open)} className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'>
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>This action will discard all the assignments you have added.</p>
                    <div className='w-full min-[450px]:grid grid-cols-2 gap-4'>
                        <button
                            onClick={() => setCheckDelete(false)}
                            className='font-figtree w-full mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                handleDiscardDraft();
                                setCheckDelete(false);
                                onBack();
                            }}
                            className='font-figtree w-full mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Discard Draft
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default RequestWorkSubpage;
