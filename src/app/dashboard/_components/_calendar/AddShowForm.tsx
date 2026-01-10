'use client';

import { updateShow, createShow } from '@/app/actions/calendar';
import { getRelations } from '@/app/actions/barn-relations';
import { getTeamMembers } from '@/app/actions/team';
import { failToast, successToast, usaStates } from '@/app/context';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import { eachDayOfInterval, format } from 'date-fns';
import { CalendarIcon, MapPin, ChevronsLeft, ChevronsRight, X, ChevronDown, Check, Search, Users, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence, statsBuffer, Variants } from 'motion/react';
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
        startDate: initialData?.startDate ? new Date(initialData.startDate) : null,
        endDate: initialData?.endDate ? new Date(initialData.endDate) : null,
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

    const totalSteps = 2;

    const handleNext = () => {
        if (!formData.startDate || !formData.endDate) {
            failToast('Please enter start and end dates');
            return;
        }
        if (formData.endDate < formData.startDate) {
            failToast('End date cannot be before start date.');
            return;
        }
        setStep((prev) => Math.min(prev + 1, totalSteps));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        if (initialData) {
            const res = await updateShow(initialData.id, {
                name: formData.name,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                startDate: formData.startDate || initialData.startDate,
                endDate: formData.endDate || initialData.endDate,
                invites: invitees.filter((i) => initialData.invites && !initialData.invites.some((existing) => existing.inviteeId === i)),
            });

            if (res.success) {
                successToast('Show updated!');
                onSuccess();
            } else {
                failToast(res.error || 'Failed to update show');
            }
        } else {
            if (!formData.startDate || !formData.endDate) {
                failToast('Please enter start and end dates');
                return;
            }

            const res = await createShow({
                name: formData.name,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                startDate: formData.startDate,
                endDate: formData.endDate,
                invites: invitees,
            });

            if (res.success) {
                successToast('Show added to calendar!');
                onSuccess();
            } else {
                failToast(res.error || 'Failed to create show');
            }
        }
        setIsSubmitting(false);
    };

    useEffect(() => {
        const getAllRelations = async () => {
            setConnectionsLoading(true);
            const [barnData, subcontractorData] = await Promise.all([getRelations(userEmail), getTeamMembers(userEmail)]);

            setConnectionsLoading(false);
            setConnections([...barnData, ...subcontractorData]);
        };

        if (step === totalSteps && connections.length === 0) getAllRelations();
    }, [step, userEmail, connections.length, totalSteps]);

    useEffect(() => {
        if (initialData) {
            setChangesMade(
                formData.name !== initialData.name ||
                    formData.country !== initialData.country ||
                    formData.state !== initialData.state ||
                    formData.city !== initialData.city ||
                    formData.startDate?.getTime() !== new Date(initialData.startDate).getTime() ||
                    formData.endDate?.getTime() !== new Date(initialData.endDate).getTime() ||
                    invitees.length !== (initialData.invites?.length || 0) ||
                    invitees.some((id) => !initialData.invites?.some((i: any) => i.inviteeId === id))
            );
        }
    }, [formData, initialData, invitees]);

    return (
        <>
            <div className='flex flex-col font-figtree h-full @container/add-show'>
                <h1 className='text-[33px] @min-[240px]/add-show:text-4xl font-lusitana font-bold text-gray-900'>{initialData ? 'Edit Show' : 'Add a Show'}</h1>

                <div className='flex items-center justify-between mt-4 border-b border-gray-200'>
                    <div
                        onClick={() => setStep(1)}
                        className={cn(
                            'flex-1 py-2 text-center text-base font-medium border-b-2 transition-colors rounded-t-2xl cursor-pointer',
                            step === 1 ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:bg-gray-50'
                        )}
                    >
                        Details
                    </div>
                    <div
                        onClick={() => {
                            if (!(!formData.name || !formData.state || !formData.city || !formData.endDate || !formData.startDate || isSubmitting || (initialData && !changesMade)))
                                setStep(2);
                        }}
                        className={cn(
                            'flex-1 py-2 text-center text-base font-medium border-b-2 transition-colors rounded-t-3xl cursor-pointer',
                            step === 2 ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:bg-gray-50',
                            !formData.name || !formData.state || !formData.city || !formData.endDate || !formData.startDate || isSubmitting || (initialData && !changesMade)
                                ? 'pointer-events-none'
                                : ''
                        )}
                    >
                        Invites
                    </div>
                </div>

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
                                                formData.startDate ? 'text-black' : 'text-gray-400'
                                            } w-full hidden @min-[225px]/pick-start-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{formData.startDate === null ? 'Start Date' : format(formData.startDate, 'PPP')}</span>
                                        </button>
                                        <button
                                            onClick={() => setStartDateSelectorOpen((prev) => !prev)}
                                            className={`${
                                                formData.startDate ? 'text-black' : 'text-gray-400'
                                            } w-full flex @min-[225px]/pick-start-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{formData.startDate === null ? 'Start Date' : format(formData.startDate, 'PP')}</span>
                                        </button>
                                        <AnimatePresence>
                                            {startDateSelectorOpen && (
                                                <motion.div
                                                    initial='closed'
                                                    variants={wrapperVariants}
                                                    animate={startDateSelectorOpen ? 'open' : 'closed'}
                                                    exit='closed'
                                                    className='absolute top-[120%] left-1/2 translate-x-[-50%] @min-[256px]/pick-start-date:left-0 @min-[256px]/pick-start-date:translate-x-0 w-64 overflow-auto z-150'
                                                >
                                                    <DatePicker
                                                        onDateSelect={(selectedDate: Date) => setFormData((prev) => ({ ...prev, startDate: selectedDate }))}
                                                        selectedDate={formData.startDate}
                                                        noDateBefore={new Date(new Date().setHours(0, 0, 0, 0))}
                                                        today={formData.startDate ? formData.startDate : new Date()}
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
                                                formData.endDate ? 'text-black' : 'text-gray-400'
                                            } w-full hidden @min-[225px]/pick-end-date:flex items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{formData.endDate === null ? 'End Date' : format(formData.endDate, 'PPP')}</span>
                                        </button>
                                        <button
                                            onClick={() => setEndDateSelectorOpen((prev) => !prev)}
                                            className={`${
                                                formData.endDate ? 'text-black' : 'text-gray-400'
                                            } w-full flex @min-[225px]/pick-end-date:hidden items-center gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'`}
                                        >
                                            <CalendarIcon className='w-4 h-4 mb-0.5' />
                                            <span className='truncate min-w-0'>{formData.endDate === null ? 'End Date' : format(formData.endDate, 'PP')}</span>
                                        </button>
                                        <AnimatePresence>
                                            {endDateSelectorOpen && (
                                                <motion.div
                                                    initial='closed'
                                                    variants={wrapperVariants}
                                                    animate={endDateSelectorOpen ? 'open' : 'closed'}
                                                    exit='closed'
                                                    className='absolute top-[120%] left-1/2 translate-x-[-50%] @min-[256px]/pick-end-date:left-0 @min-[256px]/pick-end-date:translate-x-0 w-64 overflow-auto z-150'
                                                >
                                                    <DatePicker
                                                        onDateSelect={(selectedDate: Date) => setFormData((prev) => ({ ...prev, endDate: selectedDate }))}
                                                        selectedDate={formData.endDate}
                                                        noDateBefore={formData.startDate ? formData.startDate : null}
                                                        today={formData.endDate ? formData.endDate : formData.startDate ? formData.startDate : new Date()}
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
                    ) : (
                        <div className='space-y-4 mt-6'>
                            <p className='text-gray-500 text-[15px] @min-[240px]/add-show:text-base font-figtree mt-0 @min-[240px]/add-show:mt-1 mb-4 w-full'>
                                Invite barns or subcontractors to this show. They will receive a notification to accept or decline.
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
                    {step === totalSteps && (
                        <button
                            onClick={() => setStep((prev) => prev - 1)}
                            className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 pl-4.5 pr-6 bg-background text-primary primary-border-hover'
                        >
                            <ChevronsLeft className='w-6 h-6' strokeWidth={2.5} />
                            <span>Back</span>
                        </button>
                    )}
                    <button
                        onClick={step === totalSteps ? handleSubmit : handleNext}
                        disabled={!formData.name || !formData.state || !formData.city || !formData.endDate || !formData.startDate || isSubmitting || (initialData && !changesMade)}
                        className='disabled:pointer-events-none disabled:opacity-50 font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 pl-6 pr-4.5 bg-primary-light text-background primary-border-hover'
                    >
                        <span>{isSubmitting ? 'Saving...' : step !== totalSteps ? 'Next' : initialData ? 'Save Changes' : 'Create Show'}</span>
                        <ChevronsRight className='w-6 h-6' strokeWidth={2.5} />
                    </button>
                </div>
            </div>
            <X onClick={onClose} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

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
        y: 20,
        transition: {
            duration: 0.15,
        },
    },
};

const SelectState = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(dropdownRef, [], () => setIsOpen(false));

    return (
        <div className='relative w-full' ref={dropdownRef}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className='w-full flex items-center justify-between gap-2 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
            >
                <span className={cn('truncate min-w-0', value ? 'text-black' : 'text-gray-400')}>{value || 'Select State'}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen ? 'rotate-180' : '')} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial='closed'
                        variants={wrapperVariants}
                        animate={isOpen ? 'open' : 'closed'}
                        exit='closed'
                        className='absolute top-[120%] left-0 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-10'
                    >
                        {usaStates.map((state) => (
                            <div
                                key={state}
                                onClick={() => {
                                    onChange(state);
                                    setIsOpen(false);
                                }}
                                className='px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors'
                            >
                                {state}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AddShowForm;
