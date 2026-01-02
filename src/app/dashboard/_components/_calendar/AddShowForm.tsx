'use client';

import { updateShow, createShow } from '@/app/actions/calendar';
import { getRelations } from '@/app/actions/client-relations';
import { getTeamMembers } from '@/app/actions/team';
import { failToast, successToast, usaStates } from '@/app/context';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import { eachDayOfInterval, format } from 'date-fns';
import { CalendarIcon, MapPin, LayersPlus, PlusCircle, MinusCircle, ChevronsLeft, ChevronsRight, X, Clock, ChevronDown, Check, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from '../DatePicker';
import { Show } from '@/app/dashboard/_components/_calendar/Calendar';

const AddShowForm = ({ onClose, onSuccess, initialData, userEmail }: { onClose: () => void; onSuccess: () => void; initialData?: Show; userEmail: string }) => {
    const [step, setStep] = useState(1);
    const [invitees, setInvitees] = useState<string[]>(
        // @ts-ignore
        initialData?.invites?.map((i: any) => i.inviteeId) || []
    );
    const [connections, setConnections] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        country: initialData?.country || 'USA',
        state: initialData?.state || '',
        city: initialData?.city || '',
        dates: [] as Date[],
        schedule: initialData?.days.map((d) => ({ ...d, date: new Date(d.date) })) || ([] as { date: Date; startTime: string; endTime: string; skipped: boolean }[]),
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startDateSelectorOpen, setStartDateSelectorOpen] = useState(false);
    const [endDateSelectorOpen, setEndDateSelectorOpen] = useState(false);
    const [changesMade, setChangesMade] = useState(false);
    const [connectionsLoading, setConnectionsLoading] = useState(true);
    const startDateDropdownRef = useRef<HTMLDivElement>(null);
    const endDateDropdownRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(startDateDropdownRef, [], () => setStartDateSelectorOpen(false));
    useOnClickOutside(endDateDropdownRef, [], () => setEndDateSelectorOpen(false));

    const [stepTwoActionItemsVisible, setStepTwoActionItemsVisible] = useState<{ copy: boolean; skip: boolean }[]>(
        initialData ? initialData.days.map(() => ({ copy: false, skip: false })) : []
    );

    const [rangeStart, setRangeStart] = useState<Date | null>(initialData ? new Date(initialData.startDate) : null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(initialData ? new Date(initialData.endDate) : null);

    const skipRef = useRef<HTMLButtonElement>(null);
    const copyRef = useRef<HTMLButtonElement>(null);
    useOnClickOutside(copyRef, [], () =>
        setStepTwoActionItemsVisible((prev) => {
            const items = [...prev].map(() => ({ copy: false, skip: false }));
            return items;
        })
    );
    useOnClickOutside(skipRef, [], () =>
        setStepTwoActionItemsVisible((prev) => {
            const items = [...prev].map(() => ({ copy: false, skip: false }));
            return items;
        })
    );

    const handleNext = () => {
        if (step === 1) {
            if (!rangeStart || !rangeEnd) {
                failToast('Please enter start and end dates');
                return;
            }
            const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

            if (formData.schedule.length !== days.length) {
                setFormData((prev) => ({
                    ...prev,
                    schedule: days.map((d) => ({ date: d, startTime: '08:30', endTime: '17:00', skipped: false })),
                }));
                setStepTwoActionItemsVisible(days.map(() => ({ copy: false, skip: false })));
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        const dataToSave = {
            name: formData.name,
            country: formData.country,
            state: formData.state,
            city: formData.city,
            days: formData.schedule,
            invites: invitees,
        };

        const res = initialData ? await updateShow(initialData.id, dataToSave) : await createShow(dataToSave);

        if (res.success) {
            successToast(initialData ? 'Show updated!' : 'Show added to calendar!');
            onSuccess();
        } else {
            failToast(res.error || (initialData ? 'Failed to update show' : 'Failed to create show'));
        }
        setIsSubmitting(false);
    };

    useEffect(() => {
        const getAllRelations = async () => {
            setConnectionsLoading(true);
            const clientData = await getRelations(userEmail);
            const subcontractorData = await getTeamMembers(userEmail);

            setConnectionsLoading(false);
            setConnections([...clientData, ...subcontractorData]);
        };

        if (step === 3 && connections.length === 0) getAllRelations();
    }, [step, userEmail]);

    useEffect(() => {
        if (initialData) {
            let sameSchedule = true;
            initialData.days.forEach((day) => {
                if (
                    !formData.schedule.find(
                        (d) => d.date.toDateString() === day.date.toDateString() && d.startTime === day.startTime && d.endTime === day.endTime && d.skipped === day.skipped
                    )
                ) {
                    sameSchedule = false;
                }
            });

            setChangesMade(
                formData.name !== initialData.name ||
                    formData.country !== initialData.country ||
                    formData.state !== initialData.state ||
                    formData.city !== initialData.city ||
                    !sameSchedule
            );
        }
    }, [formData]);

    return (
        <>
            <div className='flex flex-col h-full max-h-[85vh] @container/add-show'>
                <h1 className='text-[33px] @min-[240px]/add-show:text-4xl font-lusitana font-bold text-gray-900'>{initialData ? 'Edit Show' : 'Add a Show'}</h1>

                <div className={cn('flex-1 font-figtree overflow-y-visible')}>
                    {step === 1 ? (
                        <div className='space-y-4 mt-6'>
                            <div className='flex flex-col gap-2 w-full'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Show Name</label>
                                <input
                                    className='w-full placeholder:text-gray-400 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                    name='name'
                                    value={formData.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const { name, value } = e.target;
                                        setFormData((prev) => {
                                            return {
                                                ...prev,
                                                [name]: value,
                                            };
                                        });
                                    }}
                                    placeholder='Show Name'
                                    required
                                />
                            </div>
                            <div className='grid @min-[350px]/add-show:grid-cols-2 gap-4'>
                                <div className='flex flex-col gap-2 w-full @container/pick-start-date'>
                                    <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Start Date</label>
                                    <motion.div ref={startDateDropdownRef} animate={startDateSelectorOpen ? 'open' : 'closed'} className='relative w-full'>
                                        <button
                                            onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                            className={`${
                                                rangeStart ? 'text-black' : 'text-gray-400'
                                            } w-full hidden @min-[225px]/pick-start-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{rangeStart === null ? 'Start Date' : format(rangeStart, 'PPP')}</span>
                                        </button>
                                        <button
                                            onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                            className={`${
                                                rangeStart ? 'text-black' : 'text-gray-400'
                                            } w-full flex @min-[225px]/pick-start-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{rangeStart === null ? 'Start Date' : format(rangeStart, 'PP')}</span>
                                        </button>
                                        <AnimatePresence>
                                            {startDateSelectorOpen && (
                                                <motion.div
                                                    initial={wrapperVariants.closed}
                                                    variants={wrapperVariants}
                                                    animate={startDateSelectorOpen ? 'open' : 'closed'}
                                                    exit='closed'
                                                    className='absolute top-[120%] left-1/2 translate-x-[-50%] @min-[256px]/pick-start-date:left-0 @min-[256px]/pick-start-date:translate-x-0 w-64 overflow-auto z-150'
                                                >
                                                    <DatePicker
                                                        onDateSelect={(selectedDate: Date) => setRangeStart(selectedDate)}
                                                        selectedDate={rangeStart}
                                                        noDateBefore={new Date(new Date().setHours(0, 0, 0, 0))}
                                                        today={rangeStart ? rangeStart : new Date()}
                                                        startDateEffect={false}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                                <div className='flex flex-col gap-2 w-full @container/pick-end-date'>
                                    <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>End Date</label>
                                    <motion.div ref={endDateDropdownRef} animate={endDateSelectorOpen ? 'open' : 'closed'} className='relative w-full'>
                                        <button
                                            onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                            className={`${
                                                rangeEnd ? 'text-black' : 'text-gray-400'
                                            } w-full hidden @min-[225px]/pick-end-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{rangeEnd === null ? 'End Date' : format(rangeEnd, 'PPP')}</span>
                                        </button>
                                        <button
                                            onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                            className={`${
                                                rangeEnd ? 'text-black' : 'text-gray-400'
                                            } w-full flex @min-[225px]/pick-end-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{rangeEnd === null ? 'End Date' : format(rangeEnd, 'PP')}</span>
                                        </button>
                                        <AnimatePresence>
                                            {endDateSelectorOpen && (
                                                <motion.div
                                                    initial={wrapperVariants.closed}
                                                    variants={wrapperVariants}
                                                    animate={endDateSelectorOpen ? 'open' : 'closed'}
                                                    exit='closed'
                                                    className='absolute top-[120%] left-1/2 translate-x-[-50%] @min-[256px]/pick-end-date:left-0 @min-[256px]/pick-end-date:translate-x-0 w-64 overflow-auto z-150'
                                                >
                                                    <DatePicker
                                                        onDateSelect={(selectedDate: Date) => setRangeEnd(selectedDate)}
                                                        selectedDate={rangeEnd}
                                                        noDateBefore={rangeStart ? rangeStart : null}
                                                        today={rangeEnd ? rangeEnd : rangeStart ? rangeStart : new Date()}
                                                        startDateEffect
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                            </div>
                            <div className='grid @min-[350px]/add-show:grid-cols-2 gap-4'>
                                <div className='flex flex-col gap-2 w-full'>
                                    <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>State</label>

                                    <SelectState
                                        value={formData.state}
                                        onChange={(val) =>
                                            setFormData((prev) => {
                                                return { ...prev, state: val };
                                            })
                                        }
                                    />
                                </div>
                                <div className='flex flex-col gap-2 w-full'>
                                    <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>City</label>
                                    <div className='relative'>
                                        <MapPin className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', formData.city.length > 0 ? 'text-black' : 'text-gray-400')} />
                                        <input
                                            className='w-full placeholder:text-gray-400 outline-none shadow-sm border border-gray-200 pr-4 pl-9 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                            name='city'
                                            value={formData.city}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const { name, value } = e.target;
                                                setFormData((prev) => {
                                                    return {
                                                        ...prev,
                                                        [name]: value,
                                                    };
                                                });
                                            }}
                                            placeholder='City'
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        <div className='space-y-4'>
                            <p className='text-gray-500 text-[15px] @min-[240px]/add-show:text-base font-figtree mt-0 @min-[240px]/add-show:mt-1 mb-4'>
                                Set the schedule for this show.
                            </p>
                            <div className='space-y-2 overflow-y-auto max-h-85'>
                                {formData.schedule.map((day, idx) => (
                                    <div
                                        key={day.date.toISOString()}
                                        className={cn(
                                            'flex relative flex-col-reverse @min-[400px]/add-show:flex-row @min-[400px]/add-show:items-center justify-between gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100',
                                            day.skipped ? 'bg-gray-50/50' : ''
                                        )}
                                    >
                                        <div className='flex flex-col pl-1.5 @min-[260px]/add-show:p-0 @min-[260px]/add-show:flex-row gap-2 @min-[260px]/add-show:items-center'>
                                            <span className={cn('w-12 hidden @min-[400px]/add-show:block text-sm font-bold text-gray-700', day.skipped ? 'opacity-30' : '')}>
                                                {format(day.date, 'MMM d')}
                                            </span>
                                            <div className='flex gap-2 items-center'>
                                                <span
                                                    className={cn(
                                                        'font-figtree w-12 block @min-[260px]/add-show:hidden text-gray-500 uppercase font-bold tracking-wider text-sm',
                                                        day.skipped ? 'opacity-30' : ''
                                                    )}
                                                >
                                                    Start
                                                </span>
                                                <SelectTime
                                                    value={formData.schedule[idx].startTime}
                                                    onChange={(val: string) => {
                                                        const newSched = [...formData.schedule];
                                                        newSched[idx].startTime = val;
                                                        setFormData({ ...formData, schedule: newSched });
                                                    }}
                                                    startTime={{ hour: 0, minute: 0 }}
                                                    disabled={formData.schedule[idx].skipped}
                                                />
                                            </div>
                                            <span className={cn('text-gray-400 hidden @min-[260px]/add-show:block', day.skipped ? 'opacity-30' : '')}>-</span>
                                            <div className='flex gap-2 items-center'>
                                                <span
                                                    className={cn(
                                                        'font-figtree w-12 block @min-[260px]/add-show:hidden text-gray-500 uppercase font-bold tracking-wider text-sm',
                                                        day.skipped ? 'opacity-30' : ''
                                                    )}
                                                >
                                                    End
                                                </span>
                                                <SelectTime
                                                    value={formData.schedule[idx].endTime}
                                                    onChange={(val: string) => {
                                                        const newSched = [...formData.schedule];
                                                        newSched[idx].endTime = val;
                                                        setFormData({ ...formData, schedule: newSched });
                                                    }}
                                                    startTime={{
                                                        hour: parseInt(formData.schedule[idx].startTime.split(':')[0], 10),
                                                        minute: parseInt(formData.schedule[idx].startTime.split(':')[1], 10),
                                                    }}
                                                    disabled={formData.schedule[idx].skipped}
                                                />
                                            </div>
                                        </div>

                                        <div className='flex gap-2 items-center pl-1.5 @min-[400px]/add-show:p-0'>
                                            <span className={cn('w-12 block @min-[400px]/add-show:hidden text-sm font-bold text-gray-700', day.skipped ? 'opacity-30' : '')}>
                                                {format(day.date, 'MMM d')}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    setFormData((prev) => {
                                                        const newSched = prev.schedule.map((dayMap) => {
                                                            if (!dayMap.skipped) return { ...dayMap, startTime: day.startTime, endTime: day.endTime };
                                                            return dayMap;
                                                        });
                                                        return { ...prev, schedule: newSched };
                                                    });
                                                }}
                                                className={cn(
                                                    'hidden @min-[320px]/add-show:flex @min-[400px]/add-show:hidden @min-[560px]/add-show:flex z-10 relative font-figtree text-gray-500 cursor-pointer text-sm items-center justify-start gap-2 outline-none shadow-sm border p-1.5 @min-[320px]/add-show:px-2.5 @min-[320px]/add-show:py-1 @min-[400px]/add-show:p-1.5 @min-[560px]/add-show:px-2.5 @min-[560px]/add-show:py-1 rounded-[10px] transition-all border-gray-200 hover:border-gray-300',
                                                    day.skipped ? 'opacity-30' : ''
                                                )}
                                            >
                                                <LayersPlus className='w-4.5 h-4.5 @min-[320px]/add-show:w-4 @min-[320px]/add-show:h-4 @min-[400px]/add-show:w-4.5 @min-[400px]/add-show:h-4.5 @min-[560px]/add-show:w-4 @min-[560px]/add-show:h-4 text-gray-400' />
                                                <span>Copy to All</span>
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    setStepTwoActionItemsVisible((prev) => {
                                                        const items = [...prev];
                                                        items[idx].copy = true;
                                                        return items;
                                                    });
                                                }}
                                                ref={copyRef}
                                                className={cn(
                                                    'flex @min-[320px]/add-show:hidden @min-[400px]/add-show:flex @min-[560px]/add-show:hidden z-10 relative font-figtree text-gray-500 cursor-pointer text-sm items-center justify-start gap-2 outline-none shadow-sm border p-1.5 @min-[320px]/add-show:px-2.5 @min-[320px]/add-show:py-1 @min-[400px]/add-show:p-1.5 @min-[560px]/add-show:px-2.5 @min-[560px]/add-show:py-1 rounded-[10px] transition-all border-gray-200 hover:border-gray-300',
                                                    day.skipped ? 'opacity-30' : ''
                                                )}
                                            >
                                                <LayersPlus className='w-4.5 h-4.5 @min-[320px]/add-show:w-4 @min-[320px]/add-show:h-4 @min-[400px]/add-show:w-4.5 @min-[400px]/add-show:h-4.5 @min-[560px]/add-show:w-4 @min-[560px]/add-show:h-4 text-gray-400' />
                                                <AnimatePresence>
                                                    {stepTwoActionItemsVisible[idx].copy && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ duration: 0.2 }}
                                                            onClick={() => {
                                                                setFormData((prev) => {
                                                                    const newSched = prev.schedule.map((dayMap) => {
                                                                        if (!dayMap.skipped) return { ...dayMap, startTime: day.startTime, endTime: day.endTime };
                                                                        return dayMap;
                                                                    });
                                                                    return { ...prev, schedule: newSched };
                                                                });

                                                                setTimeout(() => {
                                                                    setStepTwoActionItemsVisible((prev) => {
                                                                        const items = [...prev].map(() => ({ copy: false, skip: false }));
                                                                        return items;
                                                                    });
                                                                }, 50);
                                                            }}
                                                            className={cn(
                                                                'absolute flex @min-[320px]/add-show:hidden @min-[400px]/add-show:flex justify-center items-center gap-1 @min-[560px]/add-show:hidden w-28 z-100 left-0 right-auto @min-[320px]/add-show:left-auto @min-[320px]/add-show:right-0 text-gray-500 border-gray-300 border text-sm bg-gray-50 rounded-xl px-2 py-1 text-semibold shadow-xl',
                                                                idx !== stepTwoActionItemsVisible.length - 1 ? 'bottom-[calc(-100%-6px)]' : 'top-[calc(-100%-6px)]'
                                                            )}
                                                        >
                                                            <LayersPlus className='w-4.5 h-4.5 text-gray-400' />
                                                            <span>Copy to All</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    const newSched = [...formData.schedule];
                                                    newSched[idx].skipped = !newSched[idx].skipped;
                                                    setFormData({ ...formData, schedule: newSched });
                                                }}
                                                className='hidden @min-[320px]/add-show:flex @min-[400px]/add-show:hidden @min-[560px]/add-show:flex font-figtree relative text-gray-500 cursor-pointer text-sm items-center justify-start gap-2 outline-none shadow-sm border p-1.5 @min-[320px]/add-show:px-2.5 @min-[320px]/add-show:py-1 @min-[400px]/add-show:p-1.5 @min-[560px]/add-show:px-2.5 @min-[560px]/add-show:py-1 rounded-[10px] transition-all border-gray-200 hover:border-gray-300'
                                            >
                                                {day.skipped ? (
                                                    <PlusCircle className='w-4.5 h-4.5 @min-[320px]/add-show:w-4 @min-[320px]/add-show:h-4 @min-[400px]/add-show:w-4.5 @min-[400px]/add-show:h-4.5 @min-[560px]/add-show:w-4 @min-[560px]/add-show:h-4 text-gray-400' />
                                                ) : (
                                                    <MinusCircle className='w-4.5 h-4.5 @min-[320px]/add-show:w-4 @min-[320px]/add-show:h-4 @min-[400px]/add-show:w-4.5 @min-[400px]/add-show:h-4.5 @min-[560px]/add-show:w-4 @min-[560px]/add-show:h-4 text-gray-400' />
                                                )}
                                                <span>{day.skipped ? 'Keep' : 'Skip'} Day</span>
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => {
                                                    setStepTwoActionItemsVisible((prev) => {
                                                        const items = [...prev];
                                                        items[idx].skip = true;
                                                        return items;
                                                    });
                                                }}
                                                ref={skipRef}
                                                className='flex @min-[320px]/add-show:hidden @min-[400px]/add-show:flex @min-[560px]/add-show:hidden font-figtree relative text-gray-500 cursor-pointer text-sm items-center justify-start gap-2 outline-none shadow-sm border p-1.5 @min-[320px]/add-show:px-2.5 @min-[320px]/add-show:py-1 @min-[400px]/add-show:p-1.5 @min-[560px]/add-show:px-2.5 @min-[560px]/add-show:py-1 rounded-[10px] transition-all border-gray-200 hover:border-gray-300'
                                            >
                                                {day.skipped ? (
                                                    <PlusCircle className='w-4.5 h-4.5 @min-[320px]/add-show:w-4 @min-[320px]/add-show:h-4 @min-[400px]/add-show:w-4.5 @min-[400px]/add-show:h-4.5 @min-[560px]/add-show:w-4 @min-[560px]/add-show:h-4 text-gray-400' />
                                                ) : (
                                                    <MinusCircle className='w-4.5 h-4.5 @min-[320px]/add-show:w-4 @min-[320px]/add-show:h-4 @min-[400px]/add-show:w-4.5 @min-[400px]/add-show:h-4.5 @min-[560px]/add-show:w-4 @min-[560px]/add-show:h-4 text-gray-400' />
                                                )}
                                                <AnimatePresence>
                                                    {stepTwoActionItemsVisible[idx].skip && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ duration: 0.2 }}
                                                            onClick={() => {
                                                                const newSched = [...formData.schedule];
                                                                newSched[idx].skipped = !newSched[idx].skipped;
                                                                setFormData({ ...formData, schedule: newSched });

                                                                setTimeout(() => {
                                                                    setStepTwoActionItemsVisible((prev) => {
                                                                        const items = [...prev].map(() => ({ copy: false, skip: false }));
                                                                        return items;
                                                                    });
                                                                }, 50);
                                                            }}
                                                            className={cn(
                                                                'absolute flex justify-center @min-[320px]/add-show:hidden @min-[400px]/add-show:flex items-center gap-1 @min-[560px]/add-show:hidden w-26 z-100 left-0 right-auto @min-[320px]/add-show:left-auto @min-[320px]/add-show:right-0 text-gray-500 border-gray-300 border text-sm bg-gray-50 rounded-xl px-2 py-1 text-semibold shadow-xl',
                                                                idx !== stepTwoActionItemsVisible.length - 1 ? 'bottom-[calc(-100%-6px)]' : 'top-[calc(-100%-6px)]'
                                                            )}
                                                        >
                                                            {day.skipped ? <PlusCircle className='w-4.5 h-4.5 text-gray-400' /> : <MinusCircle className='w-4.5 h-4.5 text-gray-400' />}
                                                            <span>{day.skipped ? 'Keep' : 'Skip'} Day</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            <p className='text-gray-500 text-[15px] @min-[240px]/add-show:text-base font-figtree mt-0 @min-[240px]/add-show:mt-1 mb-4 w-full'>
                                Invite users to this show. They will receive a notification to accept or decline.
                            </p>

                            <div className='relative w-full'>
                                <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4', searchQuery.length > 0 ? 'text-black' : '')} />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder='Search connections...'
                                    className='w-full pl-9 pr-4 py-2 border border-gray-200 shadow-sm rounded-xl outline-none focus:border-primary transition-colors'
                                />
                            </div>

                            <div className='flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 pb-1'>
                                {connections.length > 0 ? (
                                    connections
                                        .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((connection) => (
                                            <div
                                                key={connection.id}
                                                onClick={() => {
                                                    setInvitees((prev) => (prev.includes(connection.id) ? prev.filter((id) => id !== connection.id) : [...prev, connection.id]));
                                                }}
                                                className={cn(
                                                    'flex items-center justify-between p-3 rounded-xl shadow-sm border cursor-pointer transition-all',
                                                    invitees.includes(connection.id) ? 'border-primary bg-primary-extra-light' : 'border-gray-100 hover:border-gray-200'
                                                )}
                                            >
                                                <div className='flex items-center gap-3 min-w-0'>
                                                    {connection.image ? (
                                                        <img src={connection.image} alt={connection.name} className='min-w-8 h-8 rounded-full object-cover' />
                                                    ) : (
                                                        <div className='min-w-8 h-8 rounded-full bg-primary-extra-light flex items-center justify-center text-primary font-bold text-[13px]'>
                                                            {connection.name.substring(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className='min-w-0'>
                                                        <p className='font-bold text-sm text-gray-900 truncate'>{connection.name}</p>
                                                        <p className='text-xs text-gray-500 capitalize'>{connection.role}</p>
                                                    </div>
                                                </div>
                                                {!invitees.includes(connection.id) && (
                                                    <PlusCircle className='min-w-8 h-8 text-primary p-1 hover:bg-primary-extra-light rounded-full transition-all' />
                                                )}
                                                {invitees.includes(connection.id) && <Check className='min-w-6 h-6 text-primary mr-1' />}
                                            </div>
                                        ))
                                ) : connectionsLoading ? (
                                    <div className='grid place-items-center w-full p-4'>
                                        <div className='loader-primary'></div>
                                    </div>
                                ) : (
                                    <div className='text-center py-6 text-gray-400 text-sm'>
                                        <Users className='w-8 h-8 mx-auto mb-2 opacity-50' />
                                        <p>No connections found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className='mt-6 flex flex-col @min-[435px]/add-show:flex-row justify-end gap-3'>
                    <button
                        onClick={onClose}
                        className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 px-6 bg-background text-primary primary-border-hover'
                    >
                        <span>Cancel</span>
                    </button>
                    {(step === 2 || step === 3) && (
                        <button
                            onClick={() => setStep((prev) => prev - 1)}
                            className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 pl-4.5 pr-6 bg-background text-primary primary-border-hover'
                        >
                            <ChevronsLeft className='w-6 h-6' strokeWidth={2.5} />
                            <span>Back</span>
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={
                            step === 1 || step === 2
                                ? !rangeStart || !rangeEnd
                                : !formData.name || !formData.state || !formData.city || !rangeEnd || !rangeStart || isSubmitting || (initialData && !changesMade)
                        }
                        className='disabled:pointer-events-none disabled:opacity-50 font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 pl-6 pr-4.5 bg-primary-light text-background primary-border-hover'
                    >
                        <span>{isSubmitting ? 'Saving...' : step !== 3 ? 'Next' : initialData ? 'Save Changes' : 'Create Show'}</span>
                        <ChevronsRight className='w-6 h-6' strokeWidth={2.5} />
                    </button>
                </div>
            </div>
            <X onClick={onClose} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ITEM_HEIGHT = 48;

export const getParts = (value: string) => {
    const [hourStr, minuteStr] = value.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    return { hour, minute };
};

const SelectTime = ({ value, onChange, startTime, disabled }: { value: string; onChange: (val: string) => void; startTime: { hour: number; minute: number }; disabled: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [parts, setParts] = useState<{ hour: number; minute: number }>(getParts(value));
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
        onChange(`${parts.hour.toString().padStart(2, '0')}:${parts.minute.toString().padStart(2, '0')}`);
    }, [parts]);

    useEffect(() => {
        const newParts = getParts(value);
        if (newParts.hour !== parts.hour || newParts.minute !== parts.minute) {
            setParts(newParts);
        }
    }, [value]);

    return (
        <div className={cn('relative', disabled ? 'opacity-30 pointer-events-none' : '')}>
            <button
                ref={buttonRef}
                type='button'
                onClick={() => setIsOpen((s) => !s)}
                className={`w-[108px] text-sm cursor-pointer flex items-center justify-center gap-2 outline-none shadow-sm border px-2.5 py-1 rounded-[10px] transition-all ${
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
            >
                <span className='text-gray-900'>{partsToString(parts)}</span>
                <Clock size={14} className='text-gray-900' />
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
                                                setParts((prev) => {
                                                    return { ...prev, hour: prev.hour <= 12 ? (item === 12 && prev.hour !== 12 ? 0 : item) : item + 12 };
                                                });
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
                                                setParts((prev) => {
                                                    return { ...prev, minute: item };
                                                });
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
                                            setParts((prev) => {
                                                return { ...prev, hour: prev.hour - 12 };
                                            });
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
                                            setParts((prev) => {
                                                return { ...prev, hour: prev.hour + 12 };
                                            });
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

const SelectState = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className='relative z-100' ref={containerRef}>
            <button
                type='button'
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between outline-none shadow-sm border pr-4 pl-9 py-2 rounded-xl transition-all ${
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
            >
                <MapPin className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', value.length > 0 ? 'text-black' : 'text-gray-400')} />
                <span className={cn('truncate min-w-0', value ? 'text-gray-900' : 'text-gray-400')}>{value || 'Select State'}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={wrapperVariants.closed}
                        variants={wrapperVariants}
                        animate={isOpen ? 'open' : 'closed'}
                        exit='closed'
                        transition={{ duration: 0.15 }}
                        className='absolute max-h-45 overflow-y-auto top-[calc(100%+4px)] left-0 right-0 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden'
                    >
                        {usaStates.map((cat) => (
                            <button
                                key={cat}
                                type='button'
                                onClick={() => handleSelect(cat)}
                                className='w-full capitalize text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors'
                            >
                                {cat}
                                {value === cat && <Check size={14} className='text-primary' />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
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
        y: 16,
        scale: 0.95,
        transition: {
            when: 'afterChildren',
            staggerChildren: 0.1,
        },
    },
};

export default AddShowForm;
