'use client';

import { X, Camera, Check, AlertCircle, Loader2, User, Shield, AtSign, ZoomOut, ZoomIn, Move, CircleAlert, Phone } from 'lucide-react';
import { Session } from 'next-auth';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { checkPublicIDAvailability, updateProfile, getUserSettings, deleteAccount } from '@/app/actions/settings';
import { cn } from '@/lib/utils';
import { failToast, successToast } from '../context';
import Modal from './Modal';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const SettingsModal = ({
    setOpen,
    session,
    update,
}: {
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    session: Session | null;
    update: (data?: any) => Promise<Session | null>;
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [name, setName] = useState('');
    const [publicID, setPublicID] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [finalImageBlob, setFinalImageBlob] = useState<Blob | null>(null);

    const originalInfo = useRef<{ name: string; publicID: string; image: string; phoneNumber: string }>({ name: '', publicID: '', image: '', phoneNumber: '' });

    const [deleteAccountModal, setDeleteAccountModal] = useState(false);

    const debouncedPublicID = useDebounce(publicID, 500);
    const [isIDAvailable, setIsIDAvailable] = useState<boolean | null>(null);
    const [isCheckingID, setIsCheckingID] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const data = await getUserSettings();
            if (data) {
                // Format the phone number coming from DB (digits only) to display format
                const formattedPhone = data.phoneNumber ? formatPhoneNumber(data.phoneNumber) : '';

                originalInfo.current = {
                    name: data.name || '',
                    publicID: data.publicID || '',
                    image: data.image || '',
                    phoneNumber: formattedPhone,
                };

                setName(data.name || '');
                setPublicID(data.publicID || '');
                setPhoneNumber(formattedPhone);
                setImagePreview(data.image);
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    useEffect(() => {
        const checkID = async () => {
            if (!debouncedPublicID) {
                setIsIDAvailable(null);
                return;
            }

            if (debouncedPublicID === originalInfo.current.publicID) {
                setIsIDAvailable(true);
                return;
            }

            setIsCheckingID(true);
            const available = await checkPublicIDAvailability(debouncedPublicID);
            setIsIDAvailable(available);
            setIsCheckingID(false);
        };

        checkID();
    }, [debouncedPublicID]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setIsCropping(true);
        }
    };

    const handleCropComplete = (croppedBlob: Blob, previewUrl: string) => {
        setFinalImageBlob(croppedBlob);
        setImagePreview(previewUrl);
        setIsCropping(false);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isIDAvailable === false) {
            failToast('Please choose a unique User ID');
            return;
        }

        setIsSaving(true);

        const formData: any = {};
        if (name !== originalInfo.current.name) formData.name = name;
        if (publicID !== originalInfo.current.publicID) formData.publicID = publicID;
        if (phoneNumber !== originalInfo.current.phoneNumber) formData.phoneNumber = phoneNumber;
        if (finalImageBlob) formData.image = finalImageBlob;

        const result = await updateProfile(formData);

        if (result.success) {
            successToast('Profile updated!');
            const updateData: any = {};
            if (formData.name && formData.name.length > 0) updateData.name = formData.name;
            if (result.image && result.image.length > 0) updateData.image = result.image;
            await update(updateData);

            setOpen(false);
        } else {
            failToast(result.error || 'Failed to update');
        }

        setIsSaving(false);
    };

    return (
        <>
            <div className='@container/settings'>
                <div className='flex justify-between items-center'>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Settings</h1>
                </div>

                <div className='flex-1 overflow-y-auto mt-2 p-2 @min-[275px]/settings:p-4 @min-[475px]/settings:p-8'>
                    {isLoading ? (
                        <div className='w-full h-full flex items-center justify-center'>
                            <span className='loader-primary'></span>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-6 @min-[315px]/settings:gap-8'>
                            <div className='flex flex-col items-center'>
                                <div className='relative group cursor-pointer'>
                                    <div className='w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100'>
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt='Profile' fill className='object-cover rounded-full' />
                                        ) : (
                                            <div className='w-full h-full flex items-center justify-center bg-primary/10 text-primary text-3xl font-bold'>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className='absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full'>
                                        <Camera size={24} />
                                    </div>
                                    <input type='file' accept='image/*' onChange={handleImageChange} className='absolute inset-0 opacity-0 cursor-pointer' />
                                </div>
                                <p className='text-xs text-gray-400 mt-3 font-figtree'>Click to change photo</p>
                            </div>
                            <form id='settings-form' onSubmit={handleSubmit} className='space-y-4 @min-[315px]/settings:space-y-6 max-w-md mx-auto w-full font-figtree'>
                                {/* Name */}
                                <div className='flex flex-col gap-2 w-full'>
                                    <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Display Name</label>
                                    <div className='relative'>
                                        <User className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', name.length > 0 ? 'text-black' : 'text-gray-400')} />
                                        <input
                                            className='w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                            name='name'
                                            value={name}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                            placeholder='Your Name'
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Phone Number */}
                                <div className='flex flex-col gap-2 w-full'>
                                    <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Phone Number</label>
                                    <div className='relative'>
                                        <Phone className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', phoneNumber.length > 0 ? 'text-black' : 'text-gray-400')} />
                                        <input
                                            className='w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                            name='phoneNumber'
                                            value={phoneNumber}
                                            onChange={handlePhoneChange}
                                            placeholder='(555) 123-4567'
                                            maxLength={14}
                                        />
                                    </div>
                                </div>

                                {/* Public ID */}
                                <div className='space-y-2'>
                                    <div className='ml-1'>
                                        <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Public ID</label>
                                        <p className='text-xs font-semibold text-gray-500 ml-1'>This will be used for connecting with others on the platform.</p>
                                    </div>

                                    <div className='relative'>
                                        <AtSign className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', publicID.length > 0 ? 'text-black' : 'text-gray-400')} />
                                        <input
                                            value={publicID}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                setPublicID(val);
                                            }}
                                            className={cn(
                                                'w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors',
                                                isIDAvailable === false
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                                    : isIDAvailable === true
                                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                                                    : 'border-gray-200 focus:border-primary focus:ring-primary/10'
                                            )}
                                            placeholder='username'
                                            required
                                            minLength={3}
                                        />

                                        <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                                            {isCheckingID ? (
                                                <Loader2 size={18} className='animate-spin text-gray-400' />
                                            ) : isIDAvailable === true ? (
                                                <Check size={18} className='text-green-500' />
                                            ) : isIDAvailable === false ? (
                                                <X size={18} className='text-red-500' />
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Availability Message */}
                                    <AnimatePresence>
                                        {isIDAvailable === false && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className='text-xs text-red-500 flex items-center gap-1 ml-1'
                                            >
                                                <AlertCircle size={12} />
                                                That ID is already taken.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Read Only Info */}
                                <div className='p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-3'>
                                    <Shield className='text-blue-500 shrink-0' size={20} />
                                    <div className='space-y-1'>
                                        <p className='text-sm font-bold text-blue-900'>Account Type</p>
                                        <p className='text-xs text-blue-700'>
                                            You are currently signed in as a <span className='uppercase font-bold'>{session?.user?.role || 'User'}</span>.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDeleteAccountModal(true)}
                                    type='button'
                                    className='w-full bg-red-50 text-red-500 border rounded-xl border-red-200 px-4 py-2 flex gap-2 cursor-pointer hover:bg-red-100 transition-colors'
                                >
                                    <CircleAlert className='w-6 h-6' />
                                    Delete Account
                                </button>
                            </form>
                        </div>
                    )}
                </div>
                <div className='grid grid-cols-1 @min-[275px]/settings:grid-cols-2 mt-4 gap-3 @min-[275px]:gap-2.5 @min-[315px]/settings:gap-4'>
                    <button
                        onClick={() => setOpen(false)}
                        className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[315px]/settings:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                    >
                        Cancel
                    </button>
                    <button
                        form='settings-form'
                        disabled={
                            isSaving ||
                            isIDAvailable === false ||
                            isLoading ||
                            (originalInfo.current.name === name &&
                                originalInfo.current.publicID === publicID &&
                                originalInfo.current.phoneNumber === phoneNumber &&
                                originalInfo.current.image === imagePreview)
                        }
                        type='submit'
                        className='disabled:opacity-50 disabled:cursor-not-allowed font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[315px]/settings:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                    >
                        {isSaving && <Loader2 size={16} className='animate-spin' />}
                        Save Changes
                    </button>
                </div>
            </div>
            <X onClick={() => setOpen(false)} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
            <Modal
                isOpen={isCropping && imageFile !== null}
                setIsOpen={setIsCropping}
                closeOnOutsideClick={false}
                className='rounded-[18px] primary-border-bold relative overflow-visible'
            >
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
            <Modal isOpen={deleteAccountModal} setIsOpen={setDeleteAccountModal} className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'>
                <DeleteAccountModal
                    setOpen={setDeleteAccountModal}
                    verification={originalInfo.current.publicID.length > 0 ? originalInfo.current.publicID : 'I confirm that I wish to delete this account'}
                />
            </Modal>
        </>
    );
};

const DeleteAccountModal = ({ setOpen, verification }: { setOpen: React.Dispatch<React.SetStateAction<boolean>>; verification: string }) => {
    const [typedVerification, setTypedVerification] = useState('');

    return (
        <div className='@container/delete-account'>
            <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
            <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                <span className='font-bold'>All user data</span> will be lost as a result of this action. This cannot be undone.
            </p>
            <div className='flex flex-col mt-4 gap-2 w-full font-figtree'>
                <label className='text-[15px] ml-1 text-gray-800'>
                    Type <span className='text-[13px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-mono'>{verification}</span> in order to verify your desire to delete this
                    account.
                </label>

                <div className='relative'>
                    <input
                        className={cn(
                            'w-full outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors',
                            typedVerification.toLowerCase() === verification.toLowerCase()
                                ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                                : 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        )}
                        name='typed-verification'
                        value={typedVerification}
                        onPaste={(e) => e.preventDefault()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTypedVerification(e.target.value)}
                        placeholder={verification}
                        required
                    />
                    <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                        {typedVerification.toLowerCase() === verification.toLowerCase() ? <Check size={18} className='text-green-500' /> : <X size={18} className='text-red-500' />}
                    </div>
                </div>
            </div>
            <div className='grid grid-cols-1 @min-[285px]/delete-account:grid-cols-2 mt-4 gap-3 @min-[285px]:gap-2.5 @min-[315px]/delete-account:gap-4'>
                <button
                    onClick={() => setOpen(false)}
                    className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[330px]/delete-account:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                >
                    Cancel
                </button>
                <button
                    onClick={async () => {
                        const result = await deleteAccount();
                        if (result.success) {
                            successToast('Account deleted');
                            signOut({ callbackUrl: '/login?mode=signin' });
                        } else {
                            failToast('Failed to delete');
                        }
                        setOpen(false);
                    }}
                    disabled={typedVerification.toLowerCase() !== verification.toLowerCase()}
                    className='disabled:opacity-50 disabled:cursor-not-allowed font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[330px]/delete-account:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover transition-all'
                >
                    Delete Account
                </button>
            </div>
        </div>
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
                    Save Photo
                </button>
            </motion.div>
            <X onClick={onCancel} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

export default SettingsModal;
