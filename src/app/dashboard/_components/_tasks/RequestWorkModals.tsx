import { getRelations } from '@/app/actions/barn-relations';
import { getBraiderData } from '@/app/actions/jobs';
import { cn } from '@/lib/utils';
import { MapPin, X, CalendarIcon, CircleArrowRight, PlusCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

import Image from 'next/image';
import { getHorses } from '@/app/actions/horses';

export const ViewShowDetailsModal = ({
    show,
    setShowDetailsModal,
    onSelect,
}: {
    show: any;
    setShowDetailsModal: React.Dispatch<React.SetStateAction<{ open: boolean; show: any; onSelect: () => void }>>;
    onSelect: () => void;
}) => {
    return (
        <div>
            <div className='p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50'>
                <div className='min-w-0'>
                    <h3 className='text-2xl font-bold font-lusitana text-gray-900 truncate'>{show.name}</h3>
                    <div className='flex items-center gap-2 mt-1 text-sm text-gray-500 font-figtree'>
                        <MapPin size={14} className='text-primary flex-none' />
                        <span className='truncate'>
                            {show.city}, {show.state || show.country}
                        </span>
                    </div>
                </div>
                <X
                    onClick={() => setShowDetailsModal(() => ({ open: false, show: null, onSelect: () => {} }))}
                    className='text-gray-500 min-w-6 cursor-pointer hover:scale-105 transition-all'
                />
            </div>
            <div className='p-5 font-figtree space-y-4'>
                <div className='flex items-center gap-3 p-3 bg-primary-extra-light/50 rounded-xl border border-primary/10'>
                    <div className='p-2 bg-white rounded-lg shadow-sm text-primary'>
                        <CalendarIcon size={18} />
                    </div>
                    <div>
                        <p className='text-xs font-bold text-primary uppercase tracking-wide'>Dates</p>
                        <p className='text-sm font-medium text-gray-900'>
                            {format(new Date(show.startDate), 'MMM d')} - {format(new Date(show.endDate), 'MMM d, yyyy')}
                        </p>
                    </div>
                </div>

                <div className='grid grid-cols-2 items-center gap-2 mt-2 font-figtree'>
                    <button
                        onClick={() => setShowDetailsModal(() => ({ open: false, show: null, onSelect: () => {} }))}
                        className='primary-border-hover bg-background text-primary text-[15px] font-bold px-1 py-1.5 rounded-[10px] cursor-pointer'
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onSelect();
                            setShowDetailsModal(() => ({ open: false, show: null, onSelect: () => {} }));
                        }}
                        className='primary-border-hover bg-primary-light text-background text-[15px] font-bold px-1 py-1.5 rounded-[10px] cursor-pointer'
                    >
                        Select
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RequestWorkModal = ({
    userEmail,
    onClose,
    onSubmit,
    setSelectedHorse,
    setShowDetailsModal,
}: {
    userEmail: string;
    onClose: () => void;
    onSubmit: (data: any) => void;
    setSelectedHorse: React.Dispatch<React.SetStateAction<any | null>>;
    setShowDetailsModal: React.Dispatch<React.SetStateAction<{ open: boolean; show: any; onSelect: () => void }>>;
}) => {
    const [braiders, setBraiders] = useState<any[]>([]);
    const [selectedBraider, setSelectedBraider] = useState<any>(null);
    const [shows, setShows] = useState<any[]>([]);
    const [selectedShow, setSelectedShow] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);

    const [assignments, setAssignments] = useState<{ horseId: string; serviceIds: string[] }[]>([]);
    const [isAddingAssignment, setIsAddingAssignment] = useState(false);

    const [horses, setHorses] = useState<any[]>([]);
    const [loadingHorses, setLoadingHorses] = useState(false);
    const [braidersLoading, setBraidersLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);

    const [tempHorse, setTempHorse] = useState<any | null>(null);
    const [tempServices, setTempServices] = useState<string[]>([]);

    useEffect(() => {
        const fetchBraiders = async () => {
            const rels = await getRelations(userEmail);
            setBraiders(rels.filter((r) => r.role === 'braider'));
            setBraidersLoading(false);
        };
        fetchBraiders();
    }, [userEmail]);

    useEffect(() => {
        const getBraider = async () => {
            setLoadingData(true);
            const data = await getBraiderData(selectedBraider.id);

            if (data) {
                setShows(data.shows);
                setServices(data.services);
            }
            setLoadingData(false);
        };

        if (selectedBraider) getBraider();
    }, [selectedBraider]);

    useEffect(() => {
        const getHorsesData = async () => {
            setLoadingHorses(true);
            const data = await getHorses(userEmail);
            if (data) setHorses(data);
            setLoadingHorses(false);
        };
        getHorsesData();
    }, [userEmail]);

    const handleAddAssignment = () => {
        if (tempHorse && tempServices.length > 0) {
            setAssignments((prev) => [...prev, { horseId: tempHorse.id, serviceIds: tempServices }]);
            setIsAddingAssignment(false);
            setTempHorse(null);
            setTempServices([]);
        }
    };

    const handleRemoveAssignment = (index: number) => {
        setAssignments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        onSubmit({
            braiderId: selectedBraider.id,
            showId: selectedShow.id,
            assignments,
        });
    };

    // Helper to get horse/service details for display
    const getHorseDetails = (id: string) => horses.find((h) => h.id === id);
    const getServiceDetails = (id: string) => services.find((s) => s.id === id);

    return (
        <>
            <div className='font-figtree @container/request h-full flex flex-col'>
                <h1 className='text-[28px] @min-[240px]/request:text-3xl @min-[260px]/request:text-[33px] @min-[300px]/request:text-4xl font-lusitana font-bold text-gray-900 leading-[1.111111] shrink-0'>
                    Request Service
                </h1>

                <div className='flex-1 overflow-y-auto mt-6 custom-scrollbar pr-1'>
                    <div className='space-y-4'>
                        {!isAddingAssignment && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='flex flex-col gap-2'>
                                <label className='text-sm font-bold text-gray-500 uppercase'>Select Braider</label>
                                <div className='grid grid-cols-1 @lg/request:grid-cols-2 overflow-y-auto max-h-[140px] pb-1 gap-3 px-1.5'>
                                    {braidersLoading ? (
                                        <div className='animate-pulse px-4 py-2 rounded-xl col-span-1 bg-gray-100 flex gap-3 items-center'>
                                            <div className='w-8 h-8 aspect-square rounded-full bg-gray-200'></div>
                                            <div className='w-full h-4 bg-gray-200 rounded'></div>
                                        </div>
                                    ) : braiders.length > 0 ? (
                                        braiders.map((b) => (
                                            <div
                                                key={b.id}
                                                onClick={() => {
                                                    if (selectedBraider?.id !== b.id) {
                                                        setSelectedBraider(b);
                                                        setSelectedShow(null);
                                                        setAssignments([]);
                                                    }
                                                }}
                                                className={cn(
                                                    'px-4 py-2 rounded-xl shadow-sm border cursor-pointer flex items-center gap-3 transition-all',
                                                    selectedBraider?.id === b.id ? 'bg-primary-extra-light border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
                                                )}
                                            >
                                                <div className='min-w-8 min-h-8 grid place-items-center rounded-full bg-gray-100 overflow-hidden relative'>
                                                    {b.image ? (
                                                        <Image src={b.image} alt={b.name} fill className='object-cover' />
                                                    ) : (
                                                        <div className='w-full h-full flex items-center justify-center bg-primary/5 text-primary font-bold text-xs font-figtree'>
                                                            {b.name[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className='font-medium text-gray-900 truncate'>{b.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className='text-[15px] text-red-500 pl-1 col-span-2'>No braiders found. Connect with braiders to request services.</div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {selectedBraider && !isAddingAssignment && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='flex flex-col gap-2'>
                                <label className='text-sm font-bold text-gray-500 uppercase'>Select Show</label>
                                <div className='grid grid-cols-1 @xl/request:grid-cols-2 max-h-[174px] overflow-y-auto overflow-x-hidden gap-3 pb-1 px-1.5'>
                                    {loadingData ? (
                                        <div className='animate-pulse px-4 py-2 rounded-xl col-span-1 bg-gray-100 flex gap-3 items-center'>
                                            <div className='w-full h-4 bg-gray-200 rounded'></div>
                                        </div>
                                    ) : shows.length > 0 ? (
                                        shows.map((show) => (
                                            <div
                                                key={show.id}
                                                onClick={() => {
                                                    if (selectedShow?.id !== show.id) {
                                                        setSelectedShow(show);
                                                        setAssignments([]);
                                                    }
                                                }}
                                                className={cn(
                                                    'pl-4 pr-2.5 py-2 rounded-xl shadow-sm border cursor-pointer flex items-center justify-between gap-3 transition-all',
                                                    selectedShow?.id === show.id ? 'bg-primary-extra-light border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
                                                )}
                                            >
                                                <div className='flex flex-col min-w-0 truncate'>
                                                    <span className='font-medium text-gray-900 truncate'>{show.name}</span>
                                                    <span className='text-gray-500 flex gap-1 items-center text-[13px] truncate'>
                                                        <MapPin className='min-w-4 w-4' />
                                                        <span className='min-w-0 truncate'>
                                                            {show.city}, {show.state}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDetailsModal({
                                                            open: true,
                                                            show,
                                                            onSelect: () => {
                                                                if (selectedShow?.id !== show.id) {
                                                                    setSelectedShow(show);
                                                                    setAssignments([]);
                                                                }
                                                            },
                                                        });
                                                    }}
                                                    className={cn(
                                                        'rounded-full p-1.5 transition-all',
                                                        selectedShow?.id === show.id ? 'bg-primary-extra-light hover:bg-white' : 'bg-white hover:bg-primary-extra-light'
                                                    )}
                                                >
                                                    <CircleArrowRight size={32} className='text-primary' />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className='text-[15px] text-red-500 pl-1'>This braider has no upcoming shows listed.</p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {selectedShow && !isAddingAssignment && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='flex flex-col gap-3'>
                                <div className='flex flex-col gap-1.5 @min-[260px]/request:gap-0 @min-[260px]/request:flex-row @min-[260px]/request:justify-between @min-[260px]/request:items-end'>
                                    <label className='text-sm font-bold text-gray-500 uppercase'>Assignments</label>
                                    <button
                                        onClick={() => setIsAddingAssignment(true)}
                                        className='text-sm font-bold text-primary cursor-pointer hover:bg-primary/5 flex items-center gap-1 bg-background border border-gray-200 shadow-sm px-3 py-1.5 rounded-[10px] transition-colors'
                                    >
                                        <PlusCircle size={16} strokeWidth={2.25} /> Add Horse
                                    </button>
                                </div>

                                <div className='space-y-3 px-1.5 pb-1 overflow-y-auto max-h-[400px]'>
                                    {assignments.length === 0 ? (
                                        <div className='text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50'>
                                            <p className='text-gray-400 font-medium'>No horses added yet.</p>
                                            <p className='text-gray-400 text-sm'>Add a horse and select services to build your request.</p>
                                        </div>
                                    ) : (
                                        assignments.map((assignment, idx) => {
                                            const horse = getHorseDetails(assignment.horseId);
                                            return (
                                                <div key={idx} className='bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group overflow-hidden'>
                                                    <div className='flex items-center gap-3 mb-3'>
                                                        <div className='w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden relative shrink-0'>
                                                            {horse?.profileImage ? (
                                                                <Image src={horse.profileImage} alt={horse.barnName} fill className='object-cover' />
                                                            ) : (
                                                                <span className='font-bold text-gray-400'>{horse?.barnName?.[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className='min-w-0 pr-3.5'>
                                                            <h4 className='font-bold text-gray-900 truncate min-w-0'>{horse?.barnName}</h4>
                                                            <p className='text-xs text-gray-500 font-medium truncate'>{horse?.showName}</p>
                                                        </div>
                                                    </div>

                                                    <div className='flex flex-wrap gap-2'>
                                                        {assignment.serviceIds.map((servId) => {
                                                            const serv = getServiceDetails(servId);
                                                            return (
                                                                <span key={servId} className='text-xs font-medium px-2 py-1 bg-gray-50 text-gray-700 rounded-md border border-gray-100'>
                                                                    {serv?.name} (${serv?.priceUSD})
                                                                </span>
                                                            );
                                                        })}
                                                    </div>

                                                    <button
                                                        onClick={() => handleRemoveAssignment(idx)}
                                                        className='absolute cursor-pointer top-2 right-2 p-2 text-gray-300 hover:text-red-500 transition-colors'
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 3.1 Add Assignment View */}
                        {isAddingAssignment && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className='flex flex-col gap-4 h-full'>
                                <div className='flex items-center justify-between border-b pb-2'>
                                    <h3 className='font-bold text-lg text-gray-800'>Add to Request</h3>
                                    <button
                                        onClick={() => {
                                            setIsAddingAssignment(false);
                                            setTempHorse(null);
                                            setTempServices([]);
                                        }}
                                        className='bg-background cursor-pointer hover:bg-primary-extra-light text-primary px-3 py-1 rounded-[10px] border border-gray-200 shadow-sm text-sm font-bold transition-colors'
                                    >
                                        Cancel
                                    </button>
                                </div>

                                <div className='flex flex-col'>
                                    <label className='text-sm font-bold text-gray-400 uppercase'>Which Horse?</label>
                                    <div className='grid pt-2 grid-cols-1 @min-[230px]/request:grid-cols-2 @min-[345px]/request:grid-cols-3 @min-[460px]/request:grid-cols-4 @min-[580px]/request:grid-cols-5 gap-3 max-h-[130px] overflow-y-auto overflow-x-hidden pb-1 px-2'>
                                        {horses.map((horse) => (
                                            <div
                                                key={horse.id}
                                                onClick={() => setTempHorse(horse)}
                                                className={cn(
                                                    'p-3 rounded-xl relative border flex flex-col shadow-sm items-center gap-2 cursor-pointer transition-all',
                                                    tempHorse?.id === horse.id ? 'bg-primary-extra-light border-primary' : 'bg-white border-gray-200 hover:border-primary/50',
                                                    assignments.some((assignment) => assignment.horseId === horse.id) ? 'opacity-50 pointer-events-none' : ''
                                                )}
                                                title={horse.barnName}
                                            >
                                                <div className='w-12 h-12 rounded-full bg-gray-100 overflow-hidden relative'>
                                                    {horse.profileImage ? (
                                                        <Image src={horse.profileImage} alt={horse.barnName} fill className='object-cover' />
                                                    ) : (
                                                        <div className='w-full h-full flex items-center justify-center text-gray-400 font-bold'>{horse.barnName[0]}</div>
                                                    )}
                                                </div>
                                                <p className='font-bold text-sm text-center truncate w-full'>{horse.barnName}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedHorse(horse);
                                                    }}
                                                    className='absolute cursor-pointer -top-2.5 -right-2.5 text-gray-300 hover:text-primary transition-colors bg-gray-100 border border-gray-100 rounded-full shadow-sm'
                                                >
                                                    <Info className='w-6.5 h-6.5' />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2: Select Services */}
                                {tempHorse && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='flex-1 min-h-0 flex flex-col gap-2'>
                                        <label className='text-sm font-bold text-gray-400 uppercase'>What Services?</label>
                                        <div className='flex-1 overflow-y-auto max-h-[230px] space-y-2 px-2 pb-1'>
                                            {services.map((service) => (
                                                <div
                                                    key={service.id}
                                                    onClick={() => {
                                                        setTempServices((prev) => (prev.includes(service.id) ? prev.filter((id) => id !== service.id) : [...prev, service.id]));
                                                    }}
                                                    className={cn(
                                                        'p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all shadow-sm',
                                                        tempServices.includes(service.id) ? 'bg-primary-extra-light border-primary' : 'bg-white border-gray-200 hover:border-primary/30'
                                                    )}
                                                >
                                                    <div className='flex flex-col'>
                                                        <span className='font-bold text-sm'>{service.name}</span>
                                                        <span className='text-xs text-gray-500'>{service.duration ? `${service.duration}m` : 'Duration Varies'}</span>
                                                    </div>
                                                    <span className='font-bold text-primary'>${service.priceUSD}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                <button
                                    disabled={!tempHorse || tempServices.length === 0}
                                    onClick={handleAddAssignment}
                                    className='w-full py-2 mb-1 bg-primary-light cursor-pointer text-lg text-background primary-border-hover rounded-[10px] font-bold disabled:opacity-50 disabled:pointer-events-none'
                                >
                                    Add Horse to Request
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>

                {!isAddingAssignment && (
                    <div className='grid grid-cols-1 @min-[350px]/request:grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-100 shrink-0'>
                        <button onClick={onClose} className='px-6 py-2 rounded-[10px] text-lg cursor-pointer bg-background text-primary font-bold primary-border-hover'>
                            Cancel
                        </button>
                        <button
                            disabled={!selectedBraider || !selectedShow || assignments.length === 0}
                            onClick={handleSubmit}
                            className='px-6 py-2 rounded-[10px] text-lg cursor-pointer bg-primary-light text-background font-bold disabled:opacity-50 disabled:cursor-not-allowed primary-border-hover'
                        >
                            Submit
                        </button>
                    </div>
                )}
            </div>
            <X onClick={onClose} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all z-50' />
        </>
    );
};
