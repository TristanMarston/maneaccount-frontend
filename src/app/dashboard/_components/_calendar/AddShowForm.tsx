'use client';

import { updateShow, createShow } from '@/app/actions/calendar';
import { failToast, successToast, usaStates } from '@/app/context';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, ChevronsRight, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from '../DatePicker';
import { Show } from '@/app/dashboard/_components/_calendar/Calendar';
import { parseUTCToLocal } from '@/lib/date-utils';

const AddShowForm = ({ onClose, onSuccess, initialData, userEmail }: { onClose: () => void; onSuccess: () => void; initialData?: Show; userEmail: string }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        country: initialData?.country || 'USA',
        state: initialData?.state || '',
        city: initialData?.city || '',
        startDate: initialData?.startDate ? parseUTCToLocal(initialData.startDate) : null,
        endDate: initialData?.endDate ? parseUTCToLocal(initialData.endDate) : null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startDateSelectorOpen, setStartDateSelectorOpen] = useState(false);
    const [endDateSelectorOpen, setEndDateSelectorOpen] = useState(false);
    const [changesMade, setChangesMade] = useState(false);
    const startDateDropdownRef = useRef<HTMLDivElement>(null);
    const endDateDropdownRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async () => {
        if (!formData.startDate || !formData.endDate) {
            failToast('Please enter start and end dates');
            return;
        }
        if (formData.endDate < formData.startDate) {
            failToast('End date cannot be before start date.');
            return;
        }

        setIsSubmitting(true);

        if (initialData) {
            const res = await updateShow(initialData.id, {
                name: formData.name,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                startDate: formData.startDate || initialData.startDate,
                endDate: formData.endDate || initialData.endDate,
            });

            if (res.success) {
                successToast('Show updated!');
                onSuccess();
            } else {
                failToast(res.error || 'Failed to update show');
            }
        } else {
            const res = await createShow({
                name: formData.name,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                startDate: formData.startDate,
                endDate: formData.endDate,
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
        if (initialData) {
            setChangesMade(
                formData.name !== initialData.name ||
                    formData.country !== initialData.country ||
                    formData.state !== initialData.state ||
                    formData.city !== initialData.city ||
                    formData.startDate?.getTime() !== parseUTCToLocal(initialData.startDate)?.getTime() ||
                    formData.endDate?.getTime() !== parseUTCToLocal(initialData.endDate)?.getTime(),
            );
        } else {
            setChangesMade(!!formData.name || !!formData.state || !!formData.city || !!formData.startDate || !!formData.endDate);
        }
    }, [formData, initialData]);

    return (
        <>
            <div className='flex flex-col font-figtree h-full @container/add-show'>
                <h1 className='text-[33px] @min-[240px]/add-show:text-4xl font-lusitana font-bold text-gray-900'>{initialData ? 'Edit Show' : 'Add a Show'}</h1>

                <div className={cn('flex-1 font-figtree')}>
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
                                    <DropdownPortal
                                        isOpen={startDateSelectorOpen}
                                        onClose={() => setStartDateSelectorOpen(false)}
                                        triggerRef={startDateDropdownRef}
                                        className='w-64 max-h-[300px] overflow-auto hide-scrollbar'
                                    >
                                        <DatePicker
                                            onDateSelect={(selectedDate: Date) => setFormData((prev) => ({ ...prev, startDate: selectedDate }))}
                                            selectedDate={formData.startDate}
                                            noDateBefore={new Date(new Date().setHours(0, 0, 0, 0))}
                                            today={formData.startDate ? formData.startDate : new Date()}
                                            startDateEffect={false}
                                        />
                                    </DropdownPortal>
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
                                    <DropdownPortal
                                        isOpen={endDateSelectorOpen}
                                        onClose={() => setEndDateSelectorOpen(false)}
                                        triggerRef={endDateDropdownRef}
                                        className='w-64 max-h-[300px] overflow-auto hide-scrollbar'
                                    >
                                        <DatePicker
                                            onDateSelect={(selectedDate: Date) => setFormData((prev) => ({ ...prev, endDate: selectedDate }))}
                                            selectedDate={formData.endDate}
                                            noDateBefore={formData.startDate ? formData.startDate : null}
                                            today={formData.endDate ? formData.endDate : formData.startDate ? formData.startDate : new Date()}
                                            startDateEffect
                                        />
                                    </DropdownPortal>
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
                        <p className='text-gray-500 text-sm italic mt-2'>Note: All your connected barns and subcontractors will be automatically invited to this show.</p>
                    </div>
                </div>

                <div className='mt-6 flex flex-col @min-[435px]/add-show:flex-row justify-end gap-3'>
                    <button
                        onClick={onClose}
                        className='font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 px-6 bg-background text-primary primary-border-hover'
                    >
                        <span>Cancel</span>
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!formData.name || !formData.state || !formData.city || !formData.endDate || !formData.startDate || isSubmitting || (initialData && !changesMade)}
                        className='disabled:pointer-events-none disabled:opacity-50 font-figtree w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] py-1.5 pl-6 pr-4.5 bg-primary-light text-background primary-border-hover'
                    >
                        <span>{isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Show'}</span>
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

const DropdownPortal = ({
    isOpen,
    onClose,
    children,
    triggerRef,
    className,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    triggerRef: React.RefObject<any>;
    className?: string;
}) => {
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        if (isOpen && triggerRef.current) {
            const updatePosition = () => {
                if (triggerRef.current) {
                    const rect = triggerRef.current.getBoundingClientRect();
                    setCoords({
                        top: rect.bottom + 8,
                        left: rect.left,
                        width: rect.width,
                    });
                }
            };
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [isOpen, triggerRef]);

    return createPortal(
        <AnimatePresence>
            {isOpen && coords && (
                <>
                    <div
                        className='fixed inset-0 z-100'
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    />
                    <motion.div
                        initial='closed'
                        variants={wrapperVariants}
                        animate='open'
                        exit='closed'
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className={cn('fixed z-101', className)}
                        style={{
                            top: coords.top,
                            left: coords.left,
                            width: className?.includes('w-') ? undefined : coords.width,
                        }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
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
            <DropdownPortal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={dropdownRef}
                className='max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg'
            >
                {usaStates.map((state) => (
                    <div
                        key={state}
                        onClick={() => {
                            onChange(state);
                            setIsOpen(false);
                        }}
                        className='px-4 py-2 cursor-pointer font-figtree hover:bg-gray-100 transition-colors'
                    >
                        {state}
                    </div>
                ))}
            </DropdownPortal>
        </div>
    );
};

export default AddShowForm;
