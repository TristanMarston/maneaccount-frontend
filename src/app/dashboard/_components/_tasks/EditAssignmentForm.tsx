'use client';

import Image from 'next/image';
import { Job } from './Tasks';
import { format } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import { Calendar, Check, CheckCircle2, PlusCircle, Trash, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { adjustServices, cancelAssignment } from '@/app/actions/jobs';
import { failToast, successToast } from '@/app/context';

const EditAssignmentForm = ({
    job,
    braiderServices,
    onClose,
    refresh,
    editingHorse: horse,
}: {
    job: Job;
    braiderServices: any[];
    onClose: () => void;
    refresh: () => void;
    editingHorse: any;
}) => {
    const [assignedServices, setAssignedServices] = useState(horse.assignment.services);
    const [availableServices, setAvailableServices] = useState(braiderServices.filter((service) => !assignedServices.some((s: any) => s.id === service.id)));
    const [deleteAssignmentPopover, setDeleteAssignmentPopover] = useState(false);
    const deleteAssignmentRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(deleteAssignmentRef, [], () => setDeleteAssignmentPopover(false));

    const handleCancelAssignment = async () => {
        const res = await cancelAssignment(horse.assignment.id, false);
        if (res.success) {
            successToast(res.message);
            refresh();
            onClose();
        } else {
            failToast('Failed to cancel assignment');
        }
    };

    const handleSubmitChanges = async () => {
        const res = await adjustServices(
            horse.assignment.id,
            assignedServices.map((s: any) => s.id),
        );
        if (res.success) {
            successToast('Changes successfully made!');
            refresh();
            onClose();
        } else {
            failToast('Failed to update assignment.');
        }
    };

    return (
        <div className='flex flex-col overflow-y-auto bg-primary-extra-light relative font-figtree @container/edit-assignment'>
            <div className='absolute top-6 right-6' ref={deleteAssignmentRef}>
                <Trash2 onClick={() => setDeleteAssignmentPopover((prev) => !prev)} className='text-red-500 hover:text-red-400 cursor-pointer' />
                <AnimatePresence>
                    {deleteAssignmentPopover && (
                        <motion.div
                            variants={{ open: { y: 10, opacity: 1 }, hidden: { y: 0, opacity: 0 } }}
                            initial='hidden'
                            animate={deleteAssignmentPopover ? 'open' : 'hidden'}
                            exit='hidden'
                            className='py-1.5 px-3 z-10 absolute right-0 -bottom-10 w-fit rounded-[14px] bg-gray-50 border-gray-200 shadow-sm flex items-center gap-2'
                        >
                            <span className='font-semibold text-red-800 text-nowrap'>Cancel assignment?</span>
                            <button
                                onClick={() => setDeleteAssignmentPopover(false)}
                                className='aspect-square p-1.5 bg-red-400 text-white rounded-[10px] cursor-pointer hover:bg-red-300 transition-colors'
                            >
                                <X className='w-5 h-5' />
                            </button>
                            <button
                                onClick={handleCancelAssignment}
                                className='aspect-square p-1.5 bg-primary-light text-white rounded-[10px] cursor-pointer hover:bg-primary-light/80 transition-colors'
                            >
                                <Check className='w-5 h-5' />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className='w-full bg-primary-extra-light flex justify-center p-4'>
                {horse.profileImage ? (
                    <div className='relative rounded-full w-full h-full max-w-36 max-h-36 @min-[450px]/edit-assignment:max-w-40 @min-[450px]/edit-assignment:max-h-40 aspect-square shadow-lg'>
                        <Image
                            src={horse.profileImage}
                            alt={horse.barnName}
                            fill
                            className='object-cover static! rounded-full w-full h-full max-w-36 max-h-36 @min-[450px]/edit-assignment:max-w-40 @min-[450px]/edit-assignment:max-h-40 aspect-square'
                        />
                        <div className='absolute top-0 left-0 bg-black/70 rounded-full w-full h-full max-w-36 max-h-36 @min-[450px]/edit-assignment:max-w-40 @min-[450px]/edit-assignment:max-h-40 aspect-square flex flex-col items-center justify-between p-4 py-5 shadow-lg'>
                            <span className='font-figtree text-gray-300 font-semibold text-base @min-[450px]/edit-assignment:text-xl uppercase'>{format(horse.date, 'EEE')}</span>
                            <h3 className='font-lusitana text-white font-bold text-[44px] @min-[450px]/edit-assignment:text-5xl leading-[1.1]'>{format(horse.date, 'd')}</h3>
                            <span className='font-figtree text-gray-300 font-semibold text-base @min-[450px]/edit-assignment:text-xl uppercase'>{format(horse.date, 'MMM')}</span>
                        </div>
                    </div>
                ) : (
                    <div className='static! bg-white rounded-full w-full h-full max-w-36 max-h-36 @min-[450px]/edit-assignment:max-w-40 @min-[450px]/edit-assignment:max-h-40 aspect-square flex flex-col items-center justify-between p-4 py-5 shadow-lg'>
                        <span className='font-figtree text-gray-600 font-semibold text-base @min-[450px]/edit-assignment:text-xl uppercase'>{format(horse.date, 'EEE')}</span>
                        <h3 className='font-lusitana text-black font-bold text-[44px] @min-[450px]/edit-assignment:text-5xl leading-[1.1]'>{format(horse.date, 'd')}</h3>
                        <span className='font-figtree text-gray-600 font-semibold text-base @min-[450px]/edit-assignment:text-xl uppercase'>{format(horse.date, 'MMM')}</span>
                    </div>
                )}
            </div>

            <div className='p-8 font-figtree rounded-t-4xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.04)]'>
                <div>
                    <h2 className='text-[28px] @min-[290px]/edit-assignment:text-3xl @min-[310px]/edit-assignment:text-[32px] @min-[340px]/edit-assignment:text-4xl @min-[450px]/edit-assignment:text-[40px] font-lusitana font-bold text-gray-900 leading-tight truncate'>
                        Edit Assignment
                    </h2>
                    <div className='text-gray-500 font-figtree text-[17px] @min-[380px]/horse-detail:text-lg font-medium truncate' title={horse.showName}>
                        {horse.barnName} • {horse.showName}
                    </div>
                </div>
                <div className='mt-6'>
                    <span className='font-bold uppercase text-lg text-gray-500'>Assigned Services</span>
                    <div className='space-y-2 mt-2 mb-4'>
                        {assignedServices
                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                            .sort((a: any, b: any) => (horse.assignment.canceledServiceIds.some((id: string) => id === a.id) ? -1 : 1))
                            .sort((a: any, b: any) => (horse.assignment.completedServiceIds.some((id: string) => id === a.id) ? -1 : 1))
                            .map((service: any) => {
                                const isServiceCompleted = horse.assignment.completedServiceIds.some((id: string) => id === service.id);
                                const isServiceCanceled = horse.assignment.canceledServiceIds.some((id: string) => id === service.id);

                                return (
                                    <div key={service.id + 'assigned'} className='flex items-center gap-2'>
                                        <div
                                            className={cn(
                                                'px-4 py-1.5 w-fit rounded-xl border font-semibold text-[15px] transition-all border-primary bg-primary-extra-light text-primary shadow-md',
                                                isServiceCompleted ? 'opacity-50 border-primary-extra-light cursor-not-allowed' : '',
                                                isServiceCanceled ? 'bg-red-50 text-red-400 border-red-100 opacity-50 cursor-not-allowed' : '',
                                            )}
                                        >
                                            {service.name} (
                                            {new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: 'USD',
                                            }).format(service.priceUSD)}
                                            {service.duration ? ` • ${service.duration} mins` : ''})
                                        </div>
                                        {isServiceCompleted ? (
                                            <CheckCircle2 className='min-w-5.5 min-h-5.5 text-primary opacity-50 cursor-not-allowed' />
                                        ) : isServiceCanceled ? (
                                            <X className='min-w-5.5 min-h-5.5 text-red-500 opacity-50 cursor-not-allowed' />
                                        ) : (
                                            assignedServices.filter((s: any) => !horse.assignment.canceledServiceIds.some((id: string) => id === s.id)).length > 1 && (
                                                <Trash2
                                                    className='min-w-5.5 min-h-5.5 text-red-500 hover:text-red-400 cursor-pointer transition-colors'
                                                    onClick={() => {
                                                        setAvailableServices([...availableServices, service]);
                                                        setAssignedServices(assignedServices.filter((s: any) => s.id !== service.id));
                                                    }}
                                                />
                                            )
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                    <span className='font-bold uppercase text-lg text-gray-500'>Available Services</span>
                    <div className='space-y-2 mt-2 mb-4'>
                        {availableServices
                            .sort((a: any, b: any) => a.name.localeCompare(b.name))
                            .map((service) => (
                                <div key={service.id + 'available'} className='flex items-center gap-2'>
                                    <div
                                        onClick={() => {
                                            setAssignedServices([...assignedServices, service]);
                                            setAvailableServices(availableServices.filter((s: any) => s.id !== service.id));
                                        }}
                                        className='px-4 py-1.5 w-fit rounded-xl border font-semibold text-[15px] transition-all cursor-pointer border-gray-200 shadow-sm text-gray-600 hover:border-primary-light hover:bg-primary/5 hover:text-primary-light'
                                    >
                                        {service.name} (
                                        {new Intl.NumberFormat('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                        }).format(service.priceUSD)}
                                        {service.duration ? ` • ${service.duration} mins` : ''})
                                    </div>
                                    <PlusCircle
                                        className='min-w-5.5 min-h-5.5 text-primary hover:text-primary-light cursor-pointer transition-colors'
                                        onClick={() => {
                                            setAssignedServices([...assignedServices, service]);
                                            setAvailableServices(availableServices.filter((s: any) => s.id !== service.id));
                                        }}
                                    />
                                </div>
                            ))}
                    </div>
                    <div className='flex @min-[430px]/edit-assignment:flex-row flex-col items-center gap-3'>
                        <button className='py-2 px-2 rounded-[14px] w-full text-lg bg-white primary-border-hover text-primary font-bold cursor-pointer' onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            disabled={
                                assignedServices.length === horse.assignment.services.length &&
                                horse.assignment.services.reduce((acc: number, service: any) => acc + (assignedServices.some((s: any) => s.id === service.id) ? 0 : 1), 0) === 0
                            }
                            onClick={handleSubmitChanges}
                            className='py-2 px-2 disabled:opacity-50 disabled:pointer-events-none rounded-[14px] w-full text-lg bg-primary-light primary-border-hover text-white font-bold cursor-pointer'
                        >
                            Submit Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditAssignmentForm;
