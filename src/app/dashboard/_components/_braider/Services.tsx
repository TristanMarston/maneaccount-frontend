'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Clock, DollarSign, Tag, X, PlusCircle, ChevronDown, Check, Pencil } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { addService, deleteService, editService, getServices } from '@/app/actions/services';
import Modal from '../../Modal';
import { cn } from '@/lib/utils';
import { failToast, successToast } from '@/app/context';

const braidOptions = ['Basic Braids', 'Show Braids', 'Jumper Braids', 'Western Braids', 'Dressage Braids', 'Additional Services', 'Hunter Braids', 'Other'];

type Service = {
    id: string;
    name: string;
    category: string;
    priceUSD: number;
    duration: number;
};

type ServiceFormData = {
    name: string;
    category: string;
    priceUSD: string;
    duration: number;
};

const Services = ({ userEmail }: { userEmail: string }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [checkModal, setCheckModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
    const [formData, setFormData] = useState<ServiceFormData>({ name: '', category: 'Basic Braids', priceUSD: '', duration: 0 });
    const [editModal, setEditModal] = useState<{ open: boolean; id: string }>({
        open: false,
        id: '',
    });
    const [editModalData, setEditModalData] = useState<ServiceFormData>({ name: '', category: 'Basic Braids', priceUSD: '', duration: 0 });
    const [previousData, setPreviousData] = useState<ServiceFormData>({ name: '', category: 'Basic Braids', priceUSD: '', duration: 0 });

    useEffect(() => {
        const loadServices = async () => {
            const data = await getServices(userEmail);
            console.log(data);
            setServices(data);
            setLoading(false);
        };
        loadServices();
    }, [userEmail]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { name, category, duration } = formData;
        const price = parseFloat(formData.priceUSD);

        if (!name || !price || !category || !duration) {
            failToast('Please fill in all fields.');
            return;
        }

        const returnData = { name, category, price, duration };

        const result = await addService(returnData);

        if (result.success) {
            successToast('Service added successfully');
            setServiceModalOpen(false);
            setFormData({ name: '', category: 'Basic Braids', priceUSD: '', duration: 0 });

            const updated = await getServices(userEmail);
            setServices(updated);
        } else {
            failToast(result.error || 'Failed to add service');
        }
    };

    const handlePatch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { name, category, duration } = editModalData;
        const price = parseFloat(editModalData.priceUSD);

        const returnData: any = {};
        if (name !== previousData.name) returnData.name = name;
        if (category !== previousData.category) returnData.category = category;
        if (duration !== previousData.duration) returnData.duration = duration;
        if (price !== parseFloat(previousData.priceUSD)) returnData.priceUSD = price;

        const result = await editService(returnData, editModal.id);

        if (result.success) {
            successToast('Service changed successfully');
            setEditModal({
                open: false,
                id: '',
            });
            setEditModalData({ name: '', category: 'Basic Braids', priceUSD: '', duration: 0 });

            const updated = await getServices(userEmail);
            setServices(updated);
        } else {
            failToast(result.error || 'Failed to add service');
        }
    };

    return (
        <>
            <div className='w-full px-8 min-[450px]:px-12 pt-8 pb-28 dashboard-sm:py-8 @lg/services:px-16 @lg/services:py-12 space-y-4 @sm/services:space-y-8 @container/services'>
                <header className='flex gap-6 flex-col justify-start items-start @sm/services:gap-0 @sm/services:flex-row @sm/services:justify-between @sm/services:items-center'>
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Services & Pricing</h1>
                        <p className='text-gray-500 font-figtree mt-1.5'>Manage the services you offer to clients.</p>
                    </div>
                    <button
                        onClick={() => setServiceModalOpen(true)}
                        className='font-figtree w-full @sm/services:w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] @sm/services:rounded-[20px] @lg/services:rounded-[10px] py-2 px-6 @sm/services:p-3 @lg/services:py-2 @lg/services:px-6 bg-primary-light text-background primary-border-hover'
                    >
                        <PlusCircle className='w-6 h-6 @sm/services:w-7 @sm/services:h-7 @lg/services:w-6 @lg/services:h-6' strokeWidth={2.5} />
                        <span className='block @sm/services:hidden @lg/services:block'>Add Service</span>
                    </button>
                </header>

                {loading ? (
                    <div className='grid @min-[550px]/services:grid-cols-2 @4xl/services:grid-cols-3 gap-4 animate-pulse'>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className='h-40 bg-gray-100 rounded-2xl' />
                        ))}
                    </div>
                ) : services.length === 0 ? (
                    <div className='grid @min-[550px]/services:grid-cols-2 @4xl/services:grid-cols-3'>
                        <div
                            onClick={() => setServiceModalOpen(true)}
                            className='grid place-items-center text-center py-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                        >
                            <PlusCircle className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                            <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-lg mt-2'>Add your first service.</p>
                        </div>
                    </div>
                ) : (
                    <div className='grid @min-[550px]/services:grid-cols-2 @4xl/services:grid-cols-3 gap-4'>
                        {services.map((service, i) => (
                            <div key={service.id} className='bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative'>
                                <div className='flex justify-between items-start mb-4'>
                                    <span className='inline-flex rounded-full items-center font-figtree gap-1 px-3 py-1 text-xs font-bold bg-blue-50 text-blue-600'>
                                        <Tag size={12} />
                                        {service.category}
                                    </span>
                                    <span className='flex gap-2'>
                                        <button
                                            onClick={() => {
                                                setPreviousData({ name: service.name, category: service.category, priceUSD: service.priceUSD.toString(), duration: service.duration });
                                                setEditModal({
                                                    open: true,
                                                    id: service.id,
                                                });
                                                setEditModalData({ name: service.name, category: service.category, priceUSD: service.priceUSD.toString(), duration: service.duration });
                                            }}
                                            className='text-gray-300 cursor-pointer hover:text-primary transition-colors p-1'
                                        >
                                            <Pencil className='w-5 h-5' />
                                        </button>
                                        <button
                                            onClick={() => setCheckModal({ open: true, id: service.id, name: service.name })}
                                            className='text-gray-300 cursor-pointer hover:text-red-500 transition-colors p-1'
                                        >
                                            <Trash2 className='w-5 h-5' />
                                        </button>
                                    </span>
                                </div>

                                <h3 className='font-figtree text-2xl font-bold text-gray-800 mb-1'>{service.name}</h3>

                                <div className='flex items-center gap-4 mt-4 pt-4 border-t border-gray-50 font-figtree'>
                                    <div className='flex items-center gap-1 text-background font-medium bg-green-600 shadow-sm px-3 py-0.5 rounded-full'>
                                        <DollarSign className='text-background w-4 h-4' />

                                        {service.priceUSD.toString().indexOf('.') === -1
                                            ? `${service.priceUSD}.00`
                                            : service.priceUSD.toString().indexOf('.') !== -1 && service.priceUSD.toString().split('.')[1].length === 1
                                            ? `${service.priceUSD}0`
                                            : service.priceUSD.toString()}
                                    </div>
                                    <div className='w-px h-4 bg-gray-200' />
                                    <div className='flex items-center gap-1.5 text-gray-500 text-sm'>
                                        <Clock size={16} />
                                        {service.duration} min
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Modal
                isOpen={checkModal.open}
                setIsOpen={(open: boolean) =>
                    setCheckModal((prev) => {
                        return { ...prev, open };
                    })
                }
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                        This will delete the &apos;<span className='font-bold'>{checkModal.name}</span>&apos; service forever.
                    </p>
                    <div className='grid grid-cols-2 gap-4'>
                        <button
                            onClick={() => setCheckModal({ open: false, id: '', name: '' })}
                            className='font-figtree mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                const result = await deleteService(checkModal.id);
                                if (result.success) {
                                    successToast('Service deleted');
                                    setServices((prev) => prev.filter((s) => s.id !== checkModal.id));
                                } else {
                                    failToast('Failed to delete');
                                }
                                setCheckModal({ open: false, id: '', name: '' });
                            }}
                            className='font-figtree mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Delete Service
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={editModal.open}
                setIsOpen={(open: boolean) =>
                    setEditModal((prev) => {
                        return { ...prev, open };
                    })
                }
                className='max-w-3xl p-6 min-[450px]:p-7 rounded-[18px] primary-border-bold relative overflow-visible'
            >
                <ServiceModal
                    type='edit'
                    handleSubmit={handlePatch}
                    data={editModalData}
                    setData={setEditModalData}
                    setModalOpen={(open: boolean) => {
                        setEditModal((prev) => {
                            return { ...prev, open };
                        });
                    }}
                />
            </Modal>
            <Modal isOpen={serviceModalOpen} setIsOpen={setServiceModalOpen} className='max-w-3xl p-6 min-[450px]:p-7 rounded-[18px] primary-border-bold relative overflow-visible'>
                <ServiceModal type='add' handleSubmit={handleSubmit} data={formData} setData={setFormData} setModalOpen={(open: boolean) => setServiceModalOpen(open)} />
            </Modal>
        </>
    );
};

const ServiceModal = ({
    type,
    handleSubmit,
    data,
    setData,
    setModalOpen,
}: {
    type: 'add' | 'edit';
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
    data: ServiceFormData;
    setData: React.Dispatch<React.SetStateAction<ServiceFormData>>;
    setModalOpen: (open: boolean) => void;
}) => {
    return (
        <>
            <div className='@container/service'>
                <h1 className='text-3xl @min-[250px]/service:text-4xl font-lusitana font-bold text-gray-900'>{type === 'add' ? 'Add a' : 'Edit'} Service</h1>
                {type === 'add' && <p className='text-gray-500 font-figtree mt-1'>Ensure that your customers get exactly what they want.</p>}
                <form onSubmit={handleSubmit} className='mt-6 flex flex-col @min-[450px]:grid @min-[450px]/service:grid-cols-2 gap-4 font-figtree'>
                    <div className='flex flex-col gap-2 w-full'>
                        <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Service Name</label>
                        <input
                            className='w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                            name='name'
                            value={data.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const { name, value } = e.target;
                                setData((prev) => {
                                    return {
                                        ...prev,
                                        [name]: value,
                                    };
                                });
                            }}
                            placeholder='Name'
                            required
                        />
                    </div>
                    <div className='flex flex-col gap-2 w-full'>
                        <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Braid Category</label>
                        <CategorySelect
                            value={data.category}
                            onChange={(val) =>
                                setData((prev) => {
                                    return { ...prev, category: val };
                                })
                            }
                        />
                        <input className='sr-only' required value={data.category} onChange={() => {}} tabIndex={-1} />
                    </div>
                    <div className='flex flex-col gap-2 w-full'>
                        <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Price</label>
                        <div className='relative'>
                            <DollarSign className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', data.priceUSD.length > 0 ? 'text-black' : 'text-gray-400')} />
                            <input
                                className='w-full flex items-center outline-none shadow-sm border border-gray-200 pl-8 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='price'
                                inputMode='numeric'
                                value={data.priceUSD}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    let val = e.target.value.replace(/[^0-9.]/g, '');

                                    if (val.split('.').length > 2) val = val.substring(0, val.length - 1);
                                    if (val.indexOf('.') !== -1 && val.substring(val.indexOf('.') + 1).length > 2) val = val.substring(0, val.length - 1);

                                    setData((prev) => {
                                        return { ...prev, priceUSD: val };
                                    });
                                }}
                                placeholder='00.00'
                                required
                            />
                        </div>
                    </div>
                    <div className='flex flex-col gap-2 w-full'>
                        <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Duration in minutes</label>
                        <div className='relative'>
                            <Clock className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', data.duration > 0 ? 'text-black' : 'text-gray-400')} />
                            <input
                                className='w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='duration'
                                inputMode='numeric'
                                value={data.duration === 0 ? '' : data.duration}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const numVal = val === '' ? 0 : parseInt(val, 10);
                                    setData((prev) => {
                                        return { ...prev, duration: numVal };
                                    });
                                }}
                                placeholder='0'
                                required
                            />
                        </div>
                    </div>
                    <button
                        type='submit'
                        className='font-figtree capitalize col-span-2 mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                    >
                        {type} Service
                    </button>
                </form>
            </div>
            <X onClick={() => setModalOpen(false)} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

const CategorySelect = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCustom, setIsCustom] = useState(false);
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
        if (option.toLowerCase() === 'other') {
            setIsCustom(true);
            onChange('');
        } else {
            setIsCustom(false);
            onChange(option);
        }
        setIsOpen(false);
    };

    if (isCustom) {
        return (
            <div className='relative flex items-center z-100'>
                <input
                    autoFocus
                    className='w-full outline-none shadow-sm border border-gray-200 pl-4 pr-10 py-1.5 lg:py-2 rounded-xl focus:border-primary transition-colors'
                    placeholder='Enter custom category...'
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <button
                    type='button'
                    onClick={() => {
                        setIsCustom(false);
                        onChange('');
                    }}
                    className='absolute right-3 text-gray-400 hover:text-red-500 transition-colors'
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className='relative z-100' ref={containerRef}>
            <button
                type='button'
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between outline-none shadow-sm border px-4 py-1.5 lg:py-2 rounded-xl transition-all ${
                    isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-gray-300'
                } bg-white`}
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || 'Select Category'}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className='absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden'
                    >
                        {braidOptions.map((cat) => (
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

export default Services;
