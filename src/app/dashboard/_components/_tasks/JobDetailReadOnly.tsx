'use client';

import React from 'react';
import { MapPin, X, User, Info, CheckSquare, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { format } from 'date-fns';
import { Job, statusColors } from './Tasks';

export const JobDetailReadOnly = ({ job, role, onClose, goToTasks, userEmail }: { job: Job; role: string; onClose: () => void; goToTasks?: () => void; userEmail: string }) => {
    return (
        <div className='flex flex-col bg-white h-full max-h-[90vh]'>
            <div className='flex justify-between items-start p-7 pb-2 border-b border-gray-50 shrink-0'>
                <div className='min-w-0'>
                    <h2 className='text-3xl font-lusitana font-bold text-gray-900 truncate'>{job.show.name}</h2>
                    <span className='text-gray-500 flex gap-1 items-center mt-0.5'>
                        <MapPin className='min-w-5 w-5' />
                        <p className='font-figtree truncate'>
                            {job.show.city}, {job.show.state}
                        </p>
                    </span>
                </div>
                <button onClick={onClose} className='p-2 cursor-pointer text-gray-500 hover:scale-105 transition-all'>
                    <X size={20} />
                </button>
            </div>

            <div className='flex-1 overflow-y-auto px-7 py-5 space-y-4 font-figtree @container/job-detail'>
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
                            'text-xs absolute -top-3 right-2 font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide my-1',
                            statusColors[job.paidAt ? 'paid' : job.status]
                        )}
                    >
                        {job.paidAt ? 'paid' : job.status}
                    </span>
                </div>

                {job.scheduledDate && (
                    <div className='flex flex-col @min-[450px]/job-detail:flex-row @min-[450px]/job-detail:items-center gap-2 w-full justify-between p-4 bg-primary-extra-light/60 border border-[#dae3de] shadow-sm rounded-[14px]'>
                        <div>
                            <p className='font-bold text-primary-dark'>Expected Completion Date</p>
                            <h3 className='text-[13px] font-bold text-primary uppercase'>{format(new Date(job.scheduledDate), 'PPPP')}</h3>
                        </div>
                    </div>
                )}

                {job.subcontractors.length > 0 && role === 'braider' ? (
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
                                            'text-xs absolute -top-4 right-2 font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide my-1 bg-white',
                                            finishedAllServices ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                                        )}
                                    >
                                        {completedHorses.length}/{horses.length} Completed
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    job.subcontractors.length > 0 &&
                    role === 'subcontractor' && (
                        <div className='flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100 shadow-sm rounded-[14px]'>
                            <div className='relative min-w-10 h-10 rounded-full overflow-hidden bg-blue-100'>
                                {job.braider.image ? (
                                    <Image src={job.braider.image} alt='Braider' fill className='object-cover' />
                                ) : (
                                    <User className='w-full h-full p-2 text-blue-300' />
                                )}
                            </div>
                            <div className='min-w-0'>
                                <p className='text-xs text-blue-500 uppercase font-bold'>Assigned By</p>
                                <p className='font-bold text-blue-900 truncate'>{job.braider.name}</p>
                            </div>
                        </div>
                    )
                )}

                <div>
                    <h3 className='text-sm font-bold text-gray-500 uppercase mb-3'>Assignments • {format(new Date(job.createdAt), 'P')}</h3>
                    <div className='space-y-4 px-2'>
                        {job.assignments
                            .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                            .sort((a, b) => a.horse.barnName.localeCompare(b.horse.barnName.toUpperCase()))
                            .map((assignment, i) => {
                                const activeServices = assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id));
                                const isAssignmentCanceled = !!assignment.canceledAt || activeServices.length === 0;

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            'bg-white rounded-2xl border border-gray-200 p-4 shadow-sm',
                                            isAssignmentCanceled ? 'opacity-60 bg-gray-50' : '',
                                            !isAssignmentCanceled &&
                                                activeServices.length === [...new Set(assignment.completedServiceIds.filter((id) => !assignment.canceledServiceIds.includes(id)))].length
                                                ? 'bg-primary-extra-light border-primary/20'
                                                : ''
                                        )}
                                    >
                                        <div className='flex justify-between items-center gap-1 mb-3'>
                                            <div className='flex items-center gap-3 min-w-0'>
                                                <div className='min-w-10 min-h-10 grid place-items-center rounded-full bg-gray-100 overflow-hidden relative'>
                                                    {assignment.horse.profileImage ? (
                                                        <Image src={assignment.horse.profileImage} alt={assignment.horse.barnName} fill className='object-cover' />
                                                    ) : (
                                                        <div className='w-full h-full flex items-center justify-center bg-primary/5 text-primary font-bold text-xs font-figtree'>
                                                            {assignment.horse.barnName[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='flex flex-col min-w-0 flex-1'>
                                                    <span className='font-bold text-gray-900 truncate'>{assignment.horse.barnName}</span>
                                                    <span className='text-gray-500 text-[13px] truncate -mt-0.5'>{assignment.horse.showName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='space-y-2 pl-1'>
                                            {assignment.services.map((service, idx) => {
                                                const isCompleted = assignment.completedServiceIds?.includes(service.id);
                                                const isCanceled = assignment.canceledServiceIds?.includes(service.id);

                                                return (
                                                    <div key={idx} className='flex justify-between items-center text-sm min-w-0 py-1'>
                                                        <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                            {isCompleted && <CheckCircle2 size={16} className='text-primary' />}
                                                            <span
                                                                className={cn(
                                                                    'text-gray-700 font-medium truncate',
                                                                    isCompleted || (isCanceled && 'text-gray-400 line-through'),
                                                                    assignment.services.length === [...new Set(assignment.completedServiceIds)].length ? 'text-primary-light/80' : ''
                                                                )}
                                                            >
                                                                {service.name}
                                                                {isCanceled && ' (Canceled)'}
                                                            </span>
                                                        </div>
                                                        <span className={cn('font-bold font-lusitana text-primary pl-2', isCanceled && 'text-gray-400 line-through')}>
                                                            ${service.priceUSD}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            <div className='border-t border-dashed border-gray-200 my-2' />
                                            <div className='flex justify-between items-center'>
                                                <span
                                                    className={cn(
                                                        'text-xs font-bold text-gray-400 uppercase tracking-wider',
                                                        assignment.services.length === [...new Set(assignment.completedServiceIds)].length ? 'text-primary-light' : ''
                                                    )}
                                                >
                                                    Subtotal
                                                </span>
                                                <span className='font-bold text-gray-900 font-lusitana'>
                                                    ${assignment.services.filter((s) => !assignment.canceledServiceIds.includes(s.id)).reduce((a, b) => a + b.priceUSD, 0)}
                                                </span>
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
                                    .filter((a) => role !== 'subcontractor' || a.subcontractor?.email === userEmail)
                                    .reduce(
                                        (acc, a) => acc + a.services.filter((s) => !a.canceledServiceIds.includes(s.id) && !a.canceledAt).reduce((sAcc, s) => sAcc + s.priceUSD, 0),
                                        0
                                    )}
                            </span>
                        </div>
                    </div>
                </div>

                {goToTasks && (
                    <div
                        onClick={goToTasks}
                        className='w-full grid place-items-center font-figtree font-bold text-primary bg-background primary-border-hover rounded-[10px] py-1.5 text-lg cursor-pointer'
                    >
                        Go to {role === 'barn' ? 'Services' : 'Tasks'}
                    </div>
                )}
            </div>
        </div>
    );
};
