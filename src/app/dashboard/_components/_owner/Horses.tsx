'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Upload, Info, AlertTriangle, PlusCircle, ChevronDown, Check, Move, ZoomOut, ZoomIn, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { getHorses, addHorse, deleteHorse, editHorse } from '@/app/actions/horses';
import Modal from '../../Modal';
import { failToast, successToast } from '@/app/context';
import { createClient } from '@/app/api/supabase/client/client';

type Gender = 'mare' | 'gelding' | 'stallion' | 'filly' | 'colt';

type Horse = {
    id: string;
    name: string;
    gender: Gender;
    color?: string | null;
    profileImage?: string | null;
    notes?: string | null;
};

type FormData = {
    name: string;
    gender: string;
    color: string;
    notes: string;
};

const genderOptions = ['Mare', 'Gelding', 'Stallion', 'Filly', 'Colt'];

const Horses = ({ userEmail }: { userEmail: string }) => {
    const [horses, setHorses] = useState<Horse[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkModal, setCheckModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

    const [formData, setFormData] = useState<FormData>({
        name: '',
        gender: 'Gelding',
        color: '',
        notes: '',
    });
    const [editModal, setEditModal] = useState<{ open: boolean; id: string; profileImage: string; croppedBlob: Blob | null }>({
        open: false,
        id: '',
        profileImage: '',
        croppedBlob: null,
    });
    const [editModalData, setEditModalData] = useState<FormData>({ name: '', gender: 'Gelding', color: '', notes: '' });
    const [previousData, setPreviousData] = useState<FormData>({ name: '', gender: 'Gelding', color: '', notes: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [finalImageBlob, setFinalImageBlob] = useState<Blob | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [horseModalOpen, setHorseModalOpen] = useState(false);

    useEffect(() => {
        const loadHorses = async () => {
            const data = await getHorses(userEmail);
            setHorses(data);
            setLoading(false);
        };
        loadHorses();
    }, [userEmail]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            setIsCropping(true);
            e.target.value = '';
        }
    };

    const handleCropComplete = (croppedBlob: Blob, previewUrl: string) => {
        if (editModal.open) {
            setEditModal((prev) => {
                return { ...prev, profileImage: previewUrl, croppedBlob: croppedBlob };
            });
            setIsCropping(false);
        } else {
            setFinalImageBlob(croppedBlob);
            setImagePreview(previewUrl);
            setIsCropping(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { name, gender, color, notes } = formData;

            const data: any = { name, gender: gender.toLowerCase(), color, notes };
            if (finalImageBlob) data.profileImage = finalImageBlob;

            if (!name || !gender) {
                failToast('Please fill in all required fields.');
                return;
            }
            const result = await addHorse(data);

            if (result && !result.error) {
                successToast(`${formData.name} added to the stable`);
                setHorseModalOpen(false);
                resetForm();

                const updated = await getHorses(userEmail);
                setHorses(updated);
            } else {
                failToast(result?.error || 'Failed to add horse');
            }
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        }
    };

    const handlePatch = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, gender, color, notes } = editModalData;

        const returnData: any = {};
        if (name !== previousData.name) returnData.name = name;
        if (gender !== previousData.gender) returnData.gender = gender.toLowerCase();
        if (color !== previousData.color) returnData.color = color;
        if (notes !== previousData.notes) returnData.notes = notes;
        if (editModal.croppedBlob) returnData.profileImage = editModal.croppedBlob;

        const result = await editHorse(returnData, editModal.id);

        if (result.success) {
            successToast('Horse changed successfully');
            setEditModal({
                open: false,
                id: '',
                profileImage: '',
                croppedBlob: null,
            });
            setEditModalData({ name: '', gender: 'Gelding', color: '', notes: '' });
            setImageFile(null);
            setImagePreview(null);
            setFinalImageBlob(null);

            const updated = await getHorses(userEmail);
            setHorses(updated);
        } else {
            failToast(result.error || 'Failed to add service');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', gender: 'Gelding', color: '', notes: '' });
        setImageFile(null);
        setImagePreview(null);
        setFinalImageBlob(null);
    };

    return (
        <>
            <div className='w-full px-8 min-[450px]:px-12 pt-8 pb-28 dashboard-sm:py-8 @lg/horses:px-16 @lg/horses:py-12 space-y-4 @sm/horses:space-y-8 @container/horses'>
                <header className='flex flex-col justify-start items-start gap-6 @sm/horses:gap-0 @sm/horses:flex-row @sm/horses:justify-between @sm/horses:items-center'>
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>My Stable</h1>
                        <p className='text-gray-500 font-figtree mt-1.5'>Manage horses for braiding and billing.</p>
                    </div>
                    <button
                        onClick={() => setHorseModalOpen((prev) => !prev)}
                        className='font-figtree w-full @sm/horses:w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[14px] @sm/horses:rounded-[20px] @lg/horses:rounded-[10px] py-2 px-6 @sm/horses:p-3 @lg/horses:py-2 @lg/horses:px-6 bg-primary-light text-background primary-border-hover'
                    >
                        <PlusCircle className='w-6 h-6 @sm/horses:w-7 @sm/horses:h-7 @lg/horses:w-6 @lg/horses:h-6' strokeWidth={2.5} />
                        <span className='block @sm/horses:hidden @lg/horses:block'>Add Horse</span>
                    </button>
                </header>

                {loading ? (
                    <div className='grid grid-cols-1 @min-[825px]/horses:grid-cols-2 @min-[1250px]/horses:grid-cols-3 gap-4 animate-pulse'>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className='h-40 bg-gray-100 rounded-2xl' />
                        ))}
                    </div>
                ) : horses.length === 0 ? (
                    <div className='hidden @sm/horses:grid grid-cols-1 @min-[825px]/horses:grid-cols-2 @min-[1250px]/horses:grid-cols-3'>
                        <div
                            onClick={() => setHorseModalOpen(true)}
                            className='grid place-items-center text-center py-8 bg-gray-50 rounded-3xl border border-dashed group border-gray-400 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                        >
                            <PlusCircle className='text-gray-500 group-hover:text-primary w-20 h-20' strokeWidth={1.5} />
                            <p className='text-gray-500 group-hover:text-primary font-figtree font-semibold text-lg mt-2'>Add your first horse.</p>
                        </div>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 @min-[825px]/horses:grid-cols-2 @min-[1250px]/horses:grid-cols-3 gap-6'>
                        {horses.map((horse: Horse, i) => (
                            <HorseCard
                                key={horse.id}
                                horse={horse}
                                onDelete={() => setCheckModal({ open: true, id: horse.id, name: horse.name })}
                                onEdit={() => {
                                    const data = {
                                        name: horse.name,
                                        gender: `${horse.gender[0].toUpperCase()}${horse.gender.substring(1)}`,
                                        color: horse.color === null || horse.color === undefined ? '' : horse.color,
                                        notes: horse.notes === null || horse.notes === undefined ? '' : horse.notes,
                                    };
                                    setPreviousData(data);
                                    setEditModalData(data);
                                    setEditModal({
                                        open: true,
                                        id: horse.id,
                                        profileImage: horse.profileImage === null || horse.profileImage === undefined ? '' : horse.profileImage,
                                        croppedBlob: null,
                                    });
                                }}
                            />
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
                        This will delete <span className='font-bold'>{checkModal.name}</span> forever.
                    </p>
                    <div className='w-full min-[450px]:grid grid-cols-2 gap-4'>
                        <button
                            onClick={() => setCheckModal({ open: false, id: '', name: '' })}
                            className='font-figtree w-full mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                const result = await deleteHorse(checkModal.id);
                                if (result.success) {
                                    successToast('Horse deleted');
                                    setHorses((prev) => prev.filter((s) => s.id !== checkModal.id));
                                } else {
                                    failToast('Failed to delete');
                                }
                                setCheckModal({ open: false, id: '', name: '' });
                            }}
                            className='font-figtree w-full mt-4 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Delete Horse
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={horseModalOpen} setIsOpen={setHorseModalOpen} className='max-w-4xl p-7 rounded-[18px] primary-border-bold relative overflow-visible'>
                <HorseModal
                    type='add'
                    handleSubmit={handleSubmit}
                    imagePreview={imagePreview}
                    handleFileSelect={handleFileSelect}
                    data={formData}
                    setData={setFormData}
                    setOpen={(open: boolean) => setHorseModalOpen(open)}
                />
            </Modal>
            <Modal
                isOpen={editModal.open}
                setIsOpen={(open: boolean) =>
                    setEditModal((prev) => {
                        return { ...prev, open };
                    })
                }
                className='max-w-4xl p-7 rounded-[18px] primary-border-bold relative overflow-visible'
            >
                <HorseModal
                    type='edit'
                    handleSubmit={handlePatch}
                    imagePreview={editModal.profileImage}
                    handleFileSelect={handleFileSelect}
                    data={editModalData}
                    setData={setEditModalData}
                    setOpen={(open: boolean) =>
                        setEditModal((prev) => {
                            return { ...prev, open: open };
                        })
                    }
                />
            </Modal>
            <Modal isOpen={isCropping && imageFile !== null} setIsOpen={setIsCropping} closeOnOutsideClick={false} className='rounded-[18px] primary-border-bold relative overflow-visible'>
                {isCropping && imageFile && (
                    <ImageCropper
                        file={imageFile}
                        onCancel={() => {
                            setIsCropping(false);
                            setImageFile(null);
                        }}
                        onComplete={handleCropComplete}
                    />
                )}
            </Modal>
        </>
    );
};

const HorseModal = ({
    type,
    handleSubmit,
    imagePreview,
    handleFileSelect,
    data,
    setData,
    setOpen,
}: {
    type: 'edit' | 'add';
    handleSubmit: (e: React.FormEvent<Element>) => Promise<void>;
    imagePreview: string | null;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    data: FormData;
    setData: React.Dispatch<React.SetStateAction<FormData>>;
    setOpen: (open: boolean) => void;
}) => {
    return (
        <>
            <div className='@container/horse'>
                <h1 className='text-3xl @min-[250px]/horse:text-4xl font-lusitana font-bold text-gray-900 capitalize'>{type === 'add' ? 'Add a' : 'Edit'} Horse</h1>
                <form onSubmit={handleSubmit} className='relative mt-6'>
                    <div className='flex flex-col @xs/horse:grid @xs/horse:grid-cols-[1.5fr_1fr_1fr] @lg/horse:grid-cols-3 gap-4 @xs/horse:gap-8'>
                        <div className='flex flex-col gap-2 items-center text-center font-figtree'>
                            <div className='relative w-32 h-32 rounded-full overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300 hover:border-primary transition-colors group cursor-pointer'>
                                {imagePreview ? (
                                    <Image src={imagePreview} alt='Preview' fill className='object-cover' />
                                ) : (
                                    <div className='flex flex-col items-center justify-center h-full text-gray-400'>
                                        <Upload size={24} />
                                        <span className='text-xs font-bold mt-2'>Upload Photo</span>
                                    </div>
                                )}
                                <input type='file' accept='image/*' onChange={handleFileSelect} className='absolute inset-0 opacity-0 cursor-pointer' />
                            </div>
                            <p className='text-xs text-gray-400'>Tap to upload</p>
                        </div>

                        <div className='col-span-2 grid grid-cols-1 @lg/horse:grid-cols-2 gap-4'>
                            <div className='flex flex-col gap-2'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Horse Name</label>
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

                            <div className='flex flex-col gap-2'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Gender</label>
                                <CategorySelect
                                    value={data.gender}
                                    onChange={(val) =>
                                        setData((prev) => {
                                            return { ...prev, gender: val };
                                        })
                                    }
                                />
                            </div>

                            <div className='flex-col gap-2 col-span-2 hidden @lg/horse:flex'>
                                <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Color / Markings</label>
                                <input
                                    className='w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                    name='color'
                                    value={data.color}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const { name, value } = e.target;
                                        setData((prev) => {
                                            return {
                                                ...prev,
                                                [name]: value,
                                            };
                                        });
                                    }}
                                    placeholder='Color'
                                />
                            </div>
                        </div>

                        <div className='flex-col gap-2 col-span-3 flex @lg/horse:hidden'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Color / Markings</label>
                            <input
                                className='w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='color'
                                value={data.color}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const { name, value } = e.target;
                                    setData((prev) => {
                                        return {
                                            ...prev,
                                            [name]: value,
                                        };
                                    });
                                }}
                                placeholder='Color'
                            />
                        </div>

                        <div className='flex flex-col gap-2 col-span-3 @xs/horse:-mt-4 @lg/horse:mt-0'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Notes (Optional)</label>
                            <textarea
                                className='w-full outline-none max-h-32 h-18 min-h-[42px] shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='notes'
                                value={data.notes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    const { name, value } = e.target;
                                    setData((prev) => {
                                        return {
                                            ...prev,
                                            [name]: value,
                                        };
                                    });
                                }}
                                placeholder='Any behavioral notes or braiding preferences'
                            />
                        </div>
                    </div>

                    <button
                        type='submit'
                        className='font-figtree capitalize w-full mt-6 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                    >
                        {type} Horse
                    </button>
                </form>
            </div>
            <X onClick={() => setOpen(false)} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

const ImageCropper = ({ file, onCancel, onComplete }: { file: File; onCancel: () => void; onComplete: (blob: Blob, url: string) => void }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [aspect, setAspect] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(new window.Image());

    useEffect(() => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setImageSrc(result);
            imgRef.current.src = result;
        };
        reader.readAsDataURL(file);
    }, [file]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setAspect(naturalWidth / naturalHeight);
    };

    const handleSave = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx || !imgRef.current) return;

        const size = 400;
        canvas.width = size;
        canvas.height = size;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        const scaleFactor = size / (containerRef.current?.offsetWidth || 256);

        ctx.translate(size / 2, size / 2);
        ctx.translate(position.x * scaleFactor, position.y * scaleFactor);
        ctx.scale(zoom, zoom);

        const naturalWidth = imgRef.current.naturalWidth;
        const naturalHeight = imgRef.current.naturalHeight;

        const baseScale = Math.max(size / naturalWidth, size / naturalHeight);

        ctx.scale(baseScale, baseScale);
        ctx.drawImage(imgRef.current, -naturalWidth / 2, -naturalHeight / 2);

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const preview = URL.createObjectURL(blob);
                    onComplete(blob, preview);
                }
            },
            'image/jpeg',
            0.9
        );
    };

    return (
        <>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className='w-full flex flex-col gap-6 @container/horse-photo'>
                <div className='flex justify-between items-center'>
                    <h3 className='font-lusitana text-3xl font-bold'>Adjust Photo</h3>
                </div>

                <div className='relative w-full flex justify-center items-center bg-gray-100 rounded-2xl p-2 @min-[275px]/horse-photo:p-4 overflow-hidden select-none h-80'>
                    <div
                        ref={containerRef}
                        className='relative z-10 aspect-square w-52 h-52 @min-[275px]/horse-photo:w-60 @min-[275px]/horse-photo:h-60 @min-[290px]/horse-photo:w-64 @min-[290px]/horse-photo:h-64 cursor-move flex items-center justify-center'
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={(e) => {
                            const touch = e.touches[0];
                            setIsDragging(true);
                            setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
                        }}
                        onTouchMove={(e) => {
                            if (!isDragging) return;
                            const touch = e.touches[0];
                            const newX = touch.clientX - dragStart.x;
                            const newY = touch.clientY - dragStart.y;
                            setPosition({ x: newX, y: newY });
                        }}
                        onTouchEnd={() => setIsDragging(false)}
                    >
                        {imageSrc && (
                            <img
                                src={imageSrc}
                                alt='Crop'
                                draggable={false}
                                onLoad={onImageLoad}
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                    transformOrigin: 'center',
                                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                    minWidth: aspect < 1 ? '100%' : 'auto',
                                    minHeight: aspect >= 1 ? '100%' : 'auto',
                                    width: aspect < 1 ? '100%' : 'auto',
                                    height: aspect >= 1 ? '100%' : 'auto',
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                }}
                                className='pointer-events-none'
                            />
                        )}

                        <div className='absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none'>
                            <Move className='text-white drop-shadow-md' />
                        </div>
                    </div>

                    <div className='absolute z-20 aspect-square w-52 h-52 @min-[275px]/horse-photo:w-60 @min-[275px]/horse-photo:h-60 @min-[290px]/horse-photo:w-64 @min-[290px]/horse-photo:h-64 rounded-full border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none'></div>
                </div>

                <div className='space-y-4 px-2 font-figtree'>
                    <div className='flex justify-between text-sm font-bold text-gray-500 uppercase'>
                        <span>Zoom</span>
                        <span>{Math.round(zoom * 100)}%</span>
                    </div>
                    <div className='flex items-center gap-4'>
                        <ZoomOut
                            className='text-gray-400 w-4 h-4 cursor-pointer hover:scale-105 transition-all'
                            onClick={() => setZoom((prev) => (prev - 0.1 < 1 ? prev : prev - 0.1))}
                        />
                        <input
                            type='range'
                            min='1'
                            max='3'
                            step='0.1'
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className='flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary'
                        />
                        <ZoomIn
                            className='text-gray-400 w-4 h-4 cursor-pointer hover:scale-105 transition-all'
                            onClick={() => setZoom((prev) => (prev + 0.1 > 3 ? prev : prev + 0.1))}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className='font-figtree w-full mt-2 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                >
                    <Check className='w-4.5 h-4.5' />
                    Add Horse
                </button>
            </motion.div>
            <X onClick={onCancel} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

const HorseCard = ({ horse, onDelete, onEdit }: { horse: Horse; onDelete: () => void; onEdit: () => void }) => {
    const [notesHovered, setNotesHovered] = useState<{ clamp: boolean; open: boolean }>({ clamp: false, open: false });
    const notesRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (notesRef && notesRef.current) {
            if (notesRef.current.scrollHeight > notesRef.current.clientHeight) {
                setNotesHovered((prev) => {
                    return { ...prev, clamp: true };
                });
            }
        }
    }, [notesRef]);

    return (
        <div className='bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all group relative overflow-visible @container/horse-card-parent'>
            <div className='flex flex-col items-start gap-4 @container/horse-card @min-[325px]/horse-card-parent:flex-row'>
                <div className='relative w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100'>
                    {horse.profileImage ? (
                        <Image src={horse.profileImage} alt={horse.name} fill className='object-cover' />
                    ) : (
                        <div className='w-full font-figtree h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-gray-50'>
                            {horse.name.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className='flex-1 min-w-0 w-full'>
                    <div className='flex justify-between items-start'>
                        <h3 className='font-figtree text-2xl font-bold text-gray-900 truncate pr-2'>{horse.name}</h3>
                        <span className='gap-2 hidden @xs/horse-card:flex'>
                            <button onClick={onEdit} className='text-gray-300 cursor-pointer hover:text-primary transition-colors p-1'>
                                <Pencil className='w-5 h-5' />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className='text-gray-300 cursor-pointer hover:text-red-500 transition-colors p-1'
                            >
                                <Trash2 className='w-5 h-5' />
                            </button>
                        </span>
                    </div>

                    <div className='flex flex-wrap gap-2 mt-2 font-figtree'>
                        <GenderBadge gender={horse.gender} />
                        {horse.color && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200'>
                                {horse.color}
                            </span>
                        )}
                    </div>
                    {horse.notes && (
                        <motion.div
                            onMouseEnter={() =>
                                setNotesHovered((prev) => {
                                    return { ...prev, open: true };
                                })
                            }
                            onMouseLeave={() =>
                                setNotesHovered((prev) => {
                                    return { ...prev, open: false };
                                })
                            }
                            className='font-figtree relative mt-4 p-3 bg-amber-50 rounded-xl border w-full border-amber-100/50 flex gap-2 items-start'
                        >
                            <Info className='text-amber-500 w-4 h-4 mt-0.5 shrink-0' />
                            <p className='text-xs text-amber-800 font-medium leading-relaxed line-clamp-1 w-full' ref={notesRef}>
                                {horse.notes}
                            </p>
                            <AnimatePresence>
                                {notesHovered.open && notesHovered.clamp && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        transition={{ duration: 0.2 }}
                                        className='absolute bottom-full text-amber-800 text-sm mb-2 bg-amber-50 rounded-xl px-3 py-2 shadow-xl'
                                    >
                                        {horse.notes}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </div>
            <div className='flex flex-col @min-[250px]/horse-card-parent:flex-row @xs/horse-card-parent:hidden gap-2 w-full mt-4'>
                <button
                    onClick={onEdit}
                    className='font-figtree w-full cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] text-nowrap rounded-[10px] py-1 px-6 bg-background text-primary primary-border-hover'
                >
                    <Pencil className='w-4.5 h-4.5' />
                    Edit
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className='font-figtree w-full cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] text-nowrap rounded-[10px] py-1 px-6 bg-background text-primary primary-border-hover'
                >
                    <Trash2 className='w-4.5 h-4.5' />
                    Delete
                </button>
            </div>
        </div>
    );
};

const GenderBadge = ({ gender }: { gender: Gender }) => {
    const styles = {
        mare: 'bg-pink-50 text-pink-700 border-pink-200',
        filly: 'bg-pink-50 text-pink-700 border-pink-200',
        gelding: 'bg-blue-50 text-blue-700 border-blue-200',
        colt: 'bg-blue-50 text-blue-700 border-blue-200',
        stallion: 'bg-red-50 text-red-700 border-red-200',
    };

    const labels = {
        mare: 'Mare',
        filly: 'Filly',
        gelding: 'Gelding',
        colt: 'Colt',
        stallion: 'Stallion',
    };

    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${styles[gender]}`}>{labels[gender]}</span>;
};

const CategorySelect = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
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
                        {genderOptions.map((cat) => (
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

export default Horses;
