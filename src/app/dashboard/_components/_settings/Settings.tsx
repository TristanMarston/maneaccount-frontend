'use client';

import {
    X,
    Camera,
    Check,
    AlertCircle,
    Loader2,
    User,
    Shield,
    AtSign,
    ZoomOut,
    ZoomIn,
    Move,
    CircleAlert,
    Phone,
    Mail,
    CreditCard,
    Bell,
    CheckCircle2,
    Eye,
    EyeOff,
    Key,
    Lock,
    KeyRound,
    Sparkles,
    ArrowUpRight,
} from 'lucide-react';
import { Session } from 'next-auth';
import React, { useState, useEffect, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { checkPublicIDAvailability, updateProfile, getUserSettings, deleteAccount, switchAccountRole } from '@/app/actions/settings';
import { cn } from '@/lib/utils';
import { failToast, successToast } from '../../../context';
import Modal from '../../Modal';
import { signOut } from 'next-auth/react';
import { requestPasswordReset, requestVerificationEmail, resetPassword, verifyResetCode, verifyToken } from '../../../actions/verification';
import SubscriptionSettings from './SubscriptionSettings';
import { SubscriptionStatus, SubscriptionTier } from '@prisma/client';
import { Tab } from '../_braider/BraiderDashboard';

enum NotificationType {
    calendar_invite = 'calendar_invite',
    job_request = 'job_request',
    job_status_change = 'job_status_change',
    job_completed = 'job_completed',
    barn_invite = 'barn_invite',
    barn_status_change = 'barn_status_change',
    team_invite = 'team_invite',
    team_status_change = 'team_status_change',
    new_message = 'new_message',
    limit_approaching = 'limit_approaching',
    limit_exceeded = 'limit_exceeded',
}

type NotificationMap = {
    text: string;
    type: NotificationType;
    visibility: ('braider' | 'subcontractor' | 'barn')[];
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

type ZelleOption = 'email' | 'phone' | 'disabled';
type ZelleUpsetOption = 'phone' | 'email';

const Settings = ({
    update,
    role: propRole,
    setUnsavedChanges,
    activeTab,
    setActiveTab,
    userEmail,
    updateSubscriptionTier,
}: {
    update: (data?: any) => Promise<Session | null>;
    role: string;
    setUnsavedChanges?: (isDirty: boolean) => void;
    activeTab: Tab;
    setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
    userEmail: string;
    updateSubscriptionTier?: (
        sub: {
            subscriptionTier: SubscriptionTier;
            subscriptionStatus: SubscriptionStatus;
            trialEndsAt: Date | null;
            currentPeriodEnd: Date | null;
            stripeCustomerId: string | null;
            subscriptionInterval: string;
        } | null,
    ) => void;
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [publicID, setPublicID] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [emailVerified, setEmailVerified] = useState<Date | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStep, setVerificationStep] = useState<'idle' | 'sent'>('idle');
    const [verificationCode, setVerificationCode] = useState('');
    const [role, setRole] = useState<'braider' | 'subcontractor' | 'barn' | 'admin'>('barn');
    const [roleModal, setRoleModal] = useState(false);

    const [venmoLink, setVenmoLink] = useState('');
    const [venmo, setVenmo] = useState('');
    const [venmoEnabled, setVenmoEnabled] = useState(false);
    const [venmoUpset, setVenmoUpset] = useState(false);
    const [zelle, setZelle] = useState<ZelleOption>('disabled');
    const [zelleUpset, setZelleUpset] = useState<ZelleUpsetOption[]>([]);
    const [thanksMessage, setThanksMessage] = useState('');
    const [thanksMessageWords, setThanksMessageWords] = useState(0);

    const [allowedNotifications, setAllowedNotifications] = useState<NotificationType[]>([]);

    const [imagePreview, setImagePreview] = useState<string>('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [finalImageBlob, setFinalImageBlob] = useState<Blob | null>(null);

    const originalInfo = useRef<{
        name: string;
        publicID: string;
        image: string;
        phoneNumber: string;
        role: string;
        thanksMessage: string;
        venmo: string;
        zelle: ZelleOption;
        venmoEnabled: boolean;
        allowedNotifications: NotificationType[];
    }>({
        name: '',
        publicID: '',
        image: '',
        phoneNumber: '',
        role: '',
        venmo: '',
        thanksMessage: '',
        zelle: 'disabled',
        venmoEnabled: false,
        allowedNotifications: [],
    });
    const [deleteAccountModal, setDeleteAccountModal] = useState(false);

    const debouncedPublicID = useDebounce(publicID, 500);
    const [isIDAvailable, setIsIDAvailable] = useState<boolean | null>(null);
    const [isCheckingID, setIsCheckingID] = useState(false);
    const [resetModalOpen, setResetModalOpen] = useState(false);

    useEffect(() => {
        if (venmo.length >= 5 && venmo.length <= 30) {
            setVenmoLink(`https://venmo.com/u/${venmo}`);
            setVenmoUpset(false);
        }
    }, [venmo]);

    useEffect(() => {
        if (zelle !== 'disabled') setZelleUpset([]);
    }, [zelle]);

    useEffect(() => {
        const loadData = async () => {
            const data = await getUserSettings();
            if (data) {
                const formattedPhone = data.phoneNumber ? formatPhoneNumber(data.phoneNumber) : '';

                originalInfo.current = {
                    name: data.name || '',
                    publicID: data.publicID || '',
                    image: data.image || '',
                    phoneNumber: formattedPhone,
                    role: data.role,
                    venmo: data.venmo || '',
                    thanksMessage: data.thanksMessage || '',
                    zelle: data.zelle || 'disabled',
                    venmoEnabled: data.venmoEnabled,
                    allowedNotifications: (data.allowedNotifications as NotificationType[]) || [],
                };

                setName(data.name || '');
                setPublicID(data.publicID || '');
                setThanksMessage(data.thanksMessage || '');
                setThanksMessageWords(data.thanksMessage ? data.thanksMessage.split(' ').filter((s) => s.trim().length > 0).length : 0);

                setEmailVerified(data.emailVerified);
                setEmail(data.email || '');
                setPhoneNumber(formattedPhone);
                setImagePreview(data.image || '');
                setRole(data.role);

                setVenmoLink(data.venmo || '');
                setVenmo(data.venmo?.substring(data.venmo?.indexOf('/u/') + 3) || '');
                setVenmoEnabled(data.venmoEnabled);
                setZelle(data.zelle || 'disabled');
                setAllowedNotifications((data.allowedNotifications as NotificationType[]) || []);
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

    const isDirty =
        originalInfo.current.name !== name ||
        originalInfo.current.publicID !== publicID ||
        originalInfo.current.phoneNumber !== phoneNumber ||
        originalInfo.current.image !== imagePreview ||
        originalInfo.current.role !== role ||
        (role === 'braider' && originalInfo.current.thanksMessage !== thanksMessage) ||
        (role === 'braider' && (originalInfo.current.venmo !== venmoLink || originalInfo.current.zelle !== zelle || originalInfo.current.venmoEnabled !== venmoEnabled)) ||
        JSON.stringify(originalInfo.current.allowedNotifications.sort()) !== JSON.stringify(allowedNotifications.sort());

    useEffect(() => {
        if (setUnsavedChanges) {
            setUnsavedChanges(isDirty);
        }

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, setUnsavedChanges]);

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

    const handleVerificationRequest = async () => {
        setIsVerifying(true);
        const res = await requestVerificationEmail();
        if (res.success) {
            successToast('Code sent!');
            setVerificationStep('sent');
        } else {
            failToast('Failed to send email');
        }
        setIsVerifying(false);
    };

    const handleVerifyCode = async () => {
        setIsVerifying(true);
        const res = await verifyToken(verificationCode);
        if (res.success) {
            successToast('Email verified successfully!');
            setEmailVerified(new Date());
            setVerificationStep('idle');
        } else {
            failToast(res.error || 'Verification failed');
        }
        setIsVerifying(false);
    };

    const handleNotificationToggle = (type: NotificationType) => {
        if (!emailVerified) return; // Cannot toggle if not verified

        setAllowedNotifications((prev) => {
            if (prev.includes(type)) {
                return prev.filter((t) => t !== type);
            } else {
                return [...prev, type];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isIDAvailable === false) {
            failToast('Please choose a unique User ID');
            return;
        }

        if (!isDirty) {
            failToast('Update at least one field to save changes');
            return;
        }

        if (role === 'braider' && venmoEnabled ? venmo.length < 5 || venmo.length > 30 : false) {
            failToast('Venmo username must be between 5 and 30 characters');
            return;
        }

        if (thanksMessageWords > 150) {
            failToast('Thank you message must be less than 150 words');
            return;
        }

        setIsSaving(true);
        let switchResult = null;

        const formData: any = {};
        if (name !== originalInfo.current.name) formData.name = name;
        if (publicID !== originalInfo.current.publicID) formData.publicID = publicID;
        if (phoneNumber !== originalInfo.current.phoneNumber) formData.phoneNumber = phoneNumber;
        if (venmoLink !== originalInfo.current.venmo) formData.venmo = venmoLink;
        if (zelle !== originalInfo.current.zelle) formData.zelle = zelle;
        if (venmoEnabled !== originalInfo.current.venmoEnabled) formData.venmoEnabled = venmoEnabled;
        if (thanksMessage !== originalInfo.current.thanksMessage) formData.thanksMessage = thanksMessage.trim();
        if (JSON.stringify(originalInfo.current.allowedNotifications.sort()) !== JSON.stringify(allowedNotifications.sort())) {
            formData.allowedNotifications = allowedNotifications;
        }
        if (role !== originalInfo.current.role) switchResult = await switchAccountRole();

        if (finalImageBlob) formData.image = finalImageBlob;

        if (Object.keys(formData).length > 0) {
            const result = await updateProfile(formData);

            if (result.success) {
                successToast('Profile updated!');
                const updateData: any = {};
                if (formData.name && formData.name.length > 0) updateData.name = formData.name;
                if (result.image && result.image.length > 0) updateData.image = result.image;
                await update(updateData);

                originalInfo.current = {
                    ...originalInfo.current,
                    name: name,
                    publicID: publicID,
                    phoneNumber: phoneNumber,
                    image: imagePreview,
                    role: role,
                    venmo: venmoLink,
                    zelle: zelle,
                    venmoEnabled: venmoEnabled,
                    thanksMessage: thanksMessage.trim(),
                    allowedNotifications: [...allowedNotifications],
                };
            } else {
                failToast(result.error || 'Failed to update');
            }
        } else if (switchResult && switchResult.success && switchResult.newRole) {
            successToast('Profile updated!');
            await update({ role: switchResult.newRole });
            originalInfo.current.role = role;
        } else {
            failToast('Failed to update');
        }

        setIsSaving(false);
    };

    return (
        <>
            <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 @min-[745px]/content:space-y-8 @container/settings relative'>
                <div className='flex justify-between items-center'>
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Settings</h1>
                        <p className='text-gray-500 font-figtree mt-1'>Manage your account preferences and notifications.</p>
                    </div>
                </div>

                <div className='flex flex-col @min-[650px]/settings:flex-row flex-1 overflow-hidden mt-4 gap-6 items-start'>
                    <div className='w-full @min-[650px]/settings:w-64 bg-gray-50 border rounded-[18px] border-gray-100 p-4 flex flex-col gap-2 shrink-0 sticky top-0'>
                        <NavTab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label='Profile' />
                        <NavTab active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={Shield} label='Account' />
                        {propRole === 'braider' && <NavTab active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')} icon={Sparkles} label='Subscription' />}
                        {propRole === 'braider' && <NavTab active={activeTab === 'invoicing'} onClick={() => setActiveTab('invoicing')} icon={CreditCard} label='Invoicing' />}
                        <NavTab active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={Bell} label='Notifications' />
                        <motion.div className={cn('flex mt-1 flex-col gap-3', isDirty ? '' : 'pointer-events-none')} initial={{ opacity: 0.3 }} animate={{ opacity: isDirty ? 1 : 0.3 }}>
                            <button
                                onClick={() => {
                                    setName(originalInfo.current.name);
                                    setPublicID(originalInfo.current.publicID);
                                    setPhoneNumber(originalInfo.current.phoneNumber);
                                    setImagePreview(originalInfo.current.image);
                                    setRole(originalInfo.current.role as any);
                                    setVenmoLink(originalInfo.current.venmo);
                                    setZelle(originalInfo.current.zelle);
                                    setVenmoEnabled(originalInfo.current.venmoEnabled);
                                    setAllowedNotifications(originalInfo.current.allowedNotifications);
                                    setVenmo(originalInfo.current.venmo?.substring(originalInfo.current.venmo?.indexOf('/u/') + 3) || '');
                                    setFinalImageBlob(null);
                                    setIsIDAvailable(true);
                                }}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[15px] text-primary text-nowrap rounded-[10px] py-2 px-4 primary-border-hover'
                            >
                                Discard
                            </button>
                            <button
                                form='settings-form'
                                type='submit'
                                disabled={isSaving || isIDAvailable === false || isLoading}
                                className='disabled:opacity-50 disabled:cursor-not-allowed font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[15px] text-nowrap rounded-[10px] py-2 px-4 bg-primary-light text-white primary-border-hover'
                            >
                                {isSaving && <Loader2 size={16} className='animate-spin' />}
                                Save Changes
                            </button>
                        </motion.div>
                    </div>

                    <div className={cn('flex-1 w-full relative dashboard-sm:pb-8', isLoading ? 'min-h-[300px]' : '')}>
                        {isLoading ? (
                            <div className='absolute inset-0 flex items-center justify-center'>
                                <span className='loader-primary'></span>
                            </div>
                        ) : (
                            <form id='settings-form' onSubmit={handleSubmit} className='w-full max-w-2xl space-y-8 pb-0.5 pr-0.5'>
                                {activeTab === 'subscription' && role === 'braider' && updateSubscriptionTier && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className='space-y-6 @container/subscription font-figtree'
                                    >
                                        <SubscriptionSettings updateSubscriptionTier={updateSubscriptionTier} />
                                    </motion.div>
                                )}

                                {activeTab === 'profile' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className='space-y-8 font-figtree @container/profile'
                                    >
                                        <div className='flex flex-col @min-[400px]/profile:flex-row items-center gap-6'>
                                            <div className='relative group cursor-pointer shrink-0'>
                                                <div className='w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100'>
                                                    {imagePreview && imagePreview.length > 0 ? (
                                                        <Image src={imagePreview} alt='Profile' fill className='object-cover rounded-full' />
                                                    ) : (
                                                        <div className='w-full h-full bg-primary/80 text-background flex items-center justify-center text-4xl font-bold'>
                                                            {name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full'>
                                                    <Camera size={20} />
                                                </div>
                                                <input type='file' accept='image/*' onChange={handleImageChange} className='absolute inset-0 opacity-0 cursor-pointer' />
                                            </div>
                                            <div className='text-center @min-[400px]/profile:text-left'>
                                                <h3 className='font-bold font-figtree text-xl text-gray-900'>Profile Picture</h3>
                                                <p className='text-sm text-gray-500 font-figtree'>Click the image to upload a new photo.</p>
                                            </div>
                                        </div>

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
                                                        const val = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
                                                        setPublicID(val);
                                                    }}
                                                    className={cn(
                                                        'w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors',
                                                        isIDAvailable === false
                                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                                            : isIDAvailable === true
                                                              ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                                                              : 'border-gray-200 focus:border-primary focus:ring-primary/10',
                                                    )}
                                                    placeholder='public-id'
                                                    autoCorrect='off'
                                                    autoComplete='off'
                                                    spellCheck={false}
                                                    required
                                                    minLength={3}
                                                    maxLength={30}
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
                                    </motion.div>
                                )}

                                {activeTab === 'account' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className='space-y-6 @container/account font-figtree'
                                    >
                                        <div className='flex flex-col gap-2 w-full'>
                                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Email Address</label>
                                            <div className='bg-gray-50 shadow-sm border border-gray-200 rounded-xl p-3 @min-[350px]/account:p-4 font-figtree'>
                                                <div className='flex flex-col @min-[500px]/account:flex-row @min-[500px]/account:items-center justify-between gap-4 w-full'>
                                                    <div className='flex items-center gap-3'>
                                                        <div
                                                            className={cn(
                                                                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                                                emailVerified ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600',
                                                            )}
                                                        >
                                                            <Mail size={18} />
                                                        </div>
                                                        <div className='min-w-0 flex-1'>
                                                            <p className='font-semibold text-gray-900 truncate min-w-0 flex-1'>{email}</p>
                                                            <p className={cn('text-[12.5px] font-bold uppercase', emailVerified ? 'text-green-600' : 'text-amber-600')}>
                                                                {emailVerified ? 'Verified' : 'Unverified'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {!emailVerified && verificationStep === 'idle' && (
                                                        <button
                                                            type='button'
                                                            onClick={handleVerificationRequest}
                                                            disabled={isVerifying}
                                                            className='px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm cursor-pointer rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                                                        >
                                                            {isVerifying ? 'Sending...' : 'Verify'}
                                                        </button>
                                                    )}
                                                </div>
                                                {!emailVerified && verificationStep === 'sent' && (
                                                    <InputOTP code={verificationCode} setCode={setVerificationCode} onSubmit={handleVerifyCode} />
                                                )}
                                            </div>
                                        </div>

                                        <div className='flex flex-col gap-2 w-full'>
                                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Account Type</label>
                                            <div className='bg-blue-50 shadow-sm border border-blue-100 rounded-xl p-3 @min-[350px]/account:p-4 font-figtree'>
                                                <div className='flex flex-col @min-[500px]/account:flex-row @min-[500px]/account:items-center justify-between gap-4 w-full'>
                                                    <div className='flex items-center gap-3'>
                                                        <div className='w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-blue-500 bg-blue-100'>
                                                            <Shield size={18} />
                                                        </div>
                                                        <div className='min-w-0 flex-1'>
                                                            <p className='font-semibold text-gray-900 truncate min-w-0 flex-1'>{name}</p>
                                                            <p className='text-[12.5px] font-bold uppercase text-blue-500'>{role}</p>
                                                        </div>
                                                    </div>

                                                    {role !== 'barn' && originalInfo.current.role === role && (
                                                        <button
                                                            type='button'
                                                            onClick={() => setRoleModal(true)}
                                                            className='px-4 py-2 bg-white border border-blue-200 text-blue-700 font-bold text-sm cursor-pointer rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                                                        >
                                                            Change
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className='flex flex-col gap-2 w-full'>
                                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Phone Number</label>
                                            <div className='relative'>
                                                <Phone className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', phoneNumber.length > 0 ? 'text-black' : 'text-gray-400')} />
                                                <input
                                                    className='w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                                    name='phoneNumber'
                                                    type='tel'
                                                    value={phoneNumber}
                                                    onChange={handlePhoneChange}
                                                    placeholder='(555) 123-4567'
                                                    maxLength={14}
                                                    autoCorrect='off'
                                                    autoComplete='off'
                                                    spellCheck={false}
                                                />
                                            </div>
                                        </div>

                                        <hr className='border-gray-100 my-6' />

                                        <button
                                            onClick={() => setResetModalOpen(true)}
                                            type='button'
                                            className='w-full bg-amber-50 mb-2 text-amber-500 font-figtree border rounded-xl border-amber-200 px-4 py-2 flex gap-2 cursor-pointer hover:bg-amber-100 transition-colors'
                                        >
                                            <Lock className='w-6 h-6' />
                                            Change Password
                                        </button>
                                        <button
                                            onClick={() => setDeleteAccountModal(true)}
                                            type='button'
                                            className='w-full bg-red-50 text-red-500 font-figtree border rounded-xl border-red-200 px-4 py-2 flex gap-2 cursor-pointer hover:bg-red-100 transition-colors'
                                        >
                                            <CircleAlert className='w-6 h-6' />
                                            Delete Account
                                        </button>
                                    </motion.div>
                                )}

                                {activeTab === 'invoicing' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className='space-y-6 @container/payments font-figtree'
                                    >
                                        <div className='flex flex-col gap-4'>
                                            <div className='ml-1'>
                                                <label className='text-sm font-bold text-gray-500 uppercase'>Payment Links</label>
                                                <p className='text-xs font-semibold text-gray-500'>Add links to your Venmo or Zelle to easily receive payments from barns.</p>
                                            </div>

                                            <div className='flex flex-col gap-4'>
                                                <div className='flex flex-col gap-2 w-full'>
                                                    <div className='flex items-center flex-wrap gap-2'>
                                                        <label className='text-xs font-bold ml-1 text-gray-500 uppercase flex items-center gap-1.5'>
                                                            <Image src='/venmo-logo.png' alt='venmo' width={20} height={20} className='w-4 h-4' />
                                                            Venmo
                                                        </label>
                                                        <button
                                                            type='button'
                                                            onClick={() => {
                                                                if (venmoEnabled) setVenmoEnabled(false);
                                                                else if (venmo.length >= 5 && venmo.length <= 30) setVenmoEnabled(true);
                                                                else setVenmoUpset(true);
                                                            }}
                                                            className={`relative cursor-pointer flex items-center rounded-full p-1 transition-colors duration-200 h-5 w-9 ${
                                                                venmoEnabled ? 'bg-[#008cff]' : 'bg-gray-300'
                                                            }`}
                                                        >
                                                            <motion.div
                                                                className='h-3 w-3 rounded-full bg-white shadow-sm'
                                                                animate={{ x: venmoEnabled ? 16 : 0 }}
                                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                            />
                                                        </button>
                                                        <div className='uppercase text-nowrap text-xs font-semibold bg-blue-50 border shadow-sm text-[#008cff] border-blue-200 px-3 py-[3px] rounded-full'>
                                                            Most Convenient
                                                        </div>
                                                    </div>

                                                    <span className='text-sm ml-4 text-gray-500'>
                                                        Type your Venmo <span className='font-semibold'>username</span> and we&apos;ll handle the rest.
                                                    </span>
                                                    <div className='relative ml-4'>
                                                        <AtSign
                                                            className={cn(
                                                                'absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4',
                                                                venmo && venmo.length > 0 ? 'text-black' : 'text-gray-400',
                                                            )}
                                                        />
                                                        <input
                                                            value={venmo}
                                                            onChange={(e) => {
                                                                const val = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
                                                                if (val.length === 0) {
                                                                    setVenmo('');
                                                                    setVenmoEnabled(false);
                                                                } else if (val.length <= 30) {
                                                                    setVenmo(val);
                                                                    if (val.length >= 5) setVenmoEnabled(true);
                                                                    else setVenmoEnabled(false);
                                                                }
                                                            }}
                                                            className={cn(
                                                                'w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors',
                                                                venmo && venmo.length >= 5 && venmo.length <= 30
                                                                    ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                                                                    : venmoUpset
                                                                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                                                      : 'border-gray-200 focus:border-primary focus:ring-primary/10',
                                                            )}
                                                            placeholder='venmo-username'
                                                            autoCorrect='off'
                                                            autoComplete='off'
                                                            spellCheck={false}
                                                            minLength={5}
                                                        />
                                                    </div>
                                                </div>

                                                <div className='flex flex-col gap-2 w-full mt-2'>
                                                    <div className='flex items-center gap-2'>
                                                        <label className='text-xs font-bold ml-1 text-gray-500 uppercase flex items-center gap-1.5'>
                                                            <Image src='/zelle-logo.png' alt='zelle' width={20} height={20} className='w-4 h-4' />
                                                            Zelle
                                                        </label>
                                                        <button
                                                            type='button'
                                                            onClick={() => {
                                                                if (zelle !== 'disabled') setZelle('disabled');
                                                                else setZelleUpset(['phone', 'email']);
                                                            }}
                                                            className={`relative cursor-pointer flex items-center rounded-full p-1 transition-colors duration-200 h-5 w-9 ${
                                                                zelle !== 'disabled' ? 'bg-[#6c1cd3]' : 'bg-gray-300'
                                                            }`}
                                                        >
                                                            <motion.div
                                                                className='h-3 w-3 rounded-full bg-white shadow-sm'
                                                                animate={{ x: zelle !== 'disabled' ? 16 : 0 }}
                                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                            />
                                                        </button>
                                                    </div>

                                                    <span className='text-sm ml-4 text-gray-500 mb-2'>
                                                        <span>Use email or phone number.</span>
                                                        <span className='block text-xs text-gray-400 mt-1'>(You must have Zelle set up in order to do this)</span>
                                                    </span>

                                                    <div className='grid grid-cols-1 gap-3 @min-[500px]/payments:grid-cols-2 @min-[500px]/payments:gap-4 ml-4'>
                                                        <div className={cn('flex flex-col gap-2 w-full', originalInfo.current.phoneNumber.length > 0 ? '' : 'cursor-not-allowed')}>
                                                            <div
                                                                className={cn(
                                                                    'flex items-center gap-2',
                                                                    originalInfo.current.phoneNumber.length > 0 ? '' : 'pointer-events-none opacity-50',
                                                                )}
                                                            >
                                                                <label className='text-xs font-bold text-gray-500 uppercase'>Phone Number</label>
                                                                <button
                                                                    type='button'
                                                                    onClick={() => setZelle((prev) => (prev === 'phone' ? 'disabled' : 'phone'))}
                                                                    className={`relative cursor-pointer flex items-center rounded-full p-1 transition-colors duration-200 h-5 w-9 ${
                                                                        zelle === 'phone' ? 'bg-[#6c1cd3]' : 'bg-gray-300'
                                                                    }`}
                                                                >
                                                                    <motion.div
                                                                        className='h-3 w-3 rounded-full bg-white shadow-sm'
                                                                        animate={{ x: zelle === 'phone' ? 16 : 0 }}
                                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                    />
                                                                </button>
                                                            </div>

                                                            <div
                                                                onClick={() => {
                                                                    if (originalInfo.current.phoneNumber.length === 0) {
                                                                        setActiveTab('account');
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    'w-full truncate min-w-0 outline-none cursor-not-allowed text-gray-400 bg-gray-50 shadow-sm border border-gray-200 px-3 pb-1 pt-1.5 text-[15px] rounded-xl focus:border-primary transition-colors',
                                                                    zelleUpset.includes('phone') ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : '',
                                                                    originalInfo.current.phoneNumber.length > 0 ? '' : 'cursor-pointer',
                                                                )}
                                                            >
                                                                {originalInfo.current.phoneNumber.length > 0 ? (
                                                                    originalInfo.current.phoneNumber
                                                                ) : (
                                                                    <span className='flex items-center gap-1'>
                                                                        Set phone number <ArrowUpRight className='w-4.5 h-4.5' />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className={cn('flex flex-col gap-2 w-full', originalInfo.current.phoneNumber.length > 0 ? 'col-span-1' : 'col-span-2')}>
                                                            <div className='flex items-center gap-2'>
                                                                <label className='text-xs font-bold text-gray-500 uppercase'>Email</label>
                                                                <button
                                                                    type='button'
                                                                    onClick={() => setZelle((prev) => (prev === 'email' ? 'disabled' : 'email'))}
                                                                    className={`relative cursor-pointer flex items-center rounded-full p-1 transition-colors duration-200 h-5 w-9 ${
                                                                        zelle === 'email' ? 'bg-[#6c1cd3]' : 'bg-gray-300'
                                                                    }`}
                                                                >
                                                                    <motion.div
                                                                        className='h-3 w-3 rounded-full bg-white shadow-sm'
                                                                        animate={{ x: zelle === 'email' ? 16 : 0 }}
                                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                                    />
                                                                </button>
                                                            </div>

                                                            <div
                                                                className={cn(
                                                                    'w-full truncate min-w-0 outline-none cursor-not-allowed text-gray-400 bg-gray-50 shadow-sm border border-gray-200 px-3 pb-1 pt-1.5 text-[15px] rounded-xl focus:border-primary transition-colors',
                                                                    zelleUpset.includes('email') ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : '',
                                                                )}
                                                            >
                                                                {email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='space-y-2'>
                                                <div className='ml-1'>
                                                    <label className='text-sm font-bold text-gray-500 uppercase'>Thank-you Message</label>
                                                    <p className='text-xs font-semibold text-gray-500'>Write a custom thank-you message for your clients to see in an invoice.</p>
                                                </div>

                                                <textarea
                                                    value={thanksMessage}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const words = value.split(' ').filter((s) => s.trim().length > 0).length;
                                                        if (words > 150) return;
                                                        setThanksMessage(e.target.value);
                                                        setThanksMessageWords(words);
                                                    }}
                                                    className='w-full outline-none shadow-sm border h-[90px] max-h-[90px] min-h-[42px] overflow-y-auto border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                                    placeholder={`e.g. "Thanks for doing business with me!"`}
                                                    autoCorrect='on'
                                                    autoComplete='on'
                                                    spellCheck={true}
                                                    required
                                                />
                                                <p className={cn('text-xs -mt-1 ml-1 text-gray-500', thanksMessageWords === 150 ? 'text-red-400' : '')}>
                                                    {thanksMessageWords} / 150 words
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'notifications' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className='space-y-6 @container/notifications font-figtree'
                                    >
                                        <div className='ml-1'>
                                            <label className='text-sm font-bold text-gray-500 uppercase'>Email Notifications</label>
                                            <p className='text-xs font-semibold text-gray-500'>
                                                Choose which updates you want to receive via email. You must verify your email to enable these.
                                            </p>
                                        </div>

                                        {!emailVerified && (
                                            <div className='bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 flex items-start gap-3'>
                                                <AlertCircle className='w-5 h-5 shrink-0 mt-0.5' />
                                                <div>
                                                    <h4 className='font-bold text-sm'>Email Verification Required</h4>
                                                    <p className='text-xs mt-1'>
                                                        Please verify your email address in the{' '}
                                                        <span className='font-bold cursor-pointer underline' onClick={() => setActiveTab('account')}>
                                                            Account
                                                        </span>{' '}
                                                        tab to enable email notifications.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className={cn('space-y-4', !emailVerified ? 'opacity-50' : '')}>
                                            {notificationTypes
                                                .filter((n) => n.visibility.includes(propRole as 'braider' | 'subcontractor' | 'barn'))
                                                .map(({ text, type }) => (
                                                    <div key={text} className='flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm'>
                                                        <span className='font-semibold text-gray-700 capitalize'>{text}</span>
                                                        <button
                                                            type='button'
                                                            onClick={() => handleNotificationToggle(type)}
                                                            disabled={!emailVerified}
                                                            className={cn(
                                                                'relative cursor-pointer flex items-center rounded-full p-1 transition-colors duration-200 h-6 w-11 shrink-0',
                                                                !emailVerified
                                                                    ? 'bg-gray-200 cursor-not-allowed opacity-50'
                                                                    : allowedNotifications.includes(type)
                                                                      ? 'bg-primary'
                                                                      : 'bg-gray-300',
                                                            )}
                                                        >
                                                            <motion.div
                                                                className='h-4 w-4 rounded-full bg-white shadow-sm'
                                                                animate={{ x: allowedNotifications.includes(type) ? 20 : 0 }}
                                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                            />
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </motion.div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </div>
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
            <Modal isOpen={roleModal} setIsOpen={setRoleModal} className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative'>
                <div className='@container/change-role'>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                        {originalInfo.current.role === 'subcontractor' ? (
                            <span>
                                You are currently a subcontractor. By switching to braider, you will gain barn management features but{' '}
                                <span className='font-bold'>lose access to subcontractor functionalities and user connections.</span> You may switch back at any time.
                            </span>
                        ) : (
                            originalInfo.current.role === 'braider' && (
                                <span>
                                    You are currently a braider. By switching to subcontractor, you will{' '}
                                    <span className='font-bold'>lose barn management features and any existing user connections.</span> You may switch back at any time.
                                </span>
                            )
                        )}
                    </p>
                    <div className='grid grid-cols-1 @min-[285px]/change-role:grid-cols-2 mt-4 gap-3 @min-[285px]:gap-2.5 @min-[315px]/change-role:gap-4'>
                        <button
                            onClick={() => setRoleModal(false)}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[330px]/change-role:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setRole((prev) => (prev === 'braider' ? 'subcontractor' : prev === 'subcontractor' ? 'braider' : prev));
                                setRoleModal(false);
                            }}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[330px]/change-role:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover transition-all'
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            </Modal>
            <ResetPasswordModal isOpen={resetModalOpen} setIsOpen={setResetModalOpen} initialEmail={userEmail} />
        </>
    );
};

const ResetPasswordModal = ({ isOpen, setIsOpen, initialEmail }: { isOpen: boolean; setIsOpen: (open: boolean) => void; initialEmail: string }) => {
    const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'success'>('request');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordShown, setPasswordShown] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep('request');
            setCode('');
            setNewPassword('');
        }
    }, [isOpen, initialEmail]);

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await requestPasswordReset(initialEmail);
        if (res.success) {
            successToast('Code sent!');
            setStep('verify');
        } else {
            failToast(String(res.error || 'Failed to send reset code'));
        }
        setLoading(false);
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await verifyResetCode(initialEmail, code);
        if (res.success) {
            setStep('reset');
        } else {
            failToast(res.error || 'Invalid code');
        }
        setLoading(false);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await resetPassword(initialEmail, code, newPassword);
        if (res.success) {
            successToast('Password reset successfully!');
            setStep('success');
            setTimeout(() => {
                setIsOpen(false);
            }, 5000);
        } else {
            failToast(res.error || 'Failed to reset password');
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} className='max-w-md p-0 overflow-hidden rounded-2xl primary-border-bold'>
            <div className='p-6 lg:p-8 font-figtree'>
                <AnimatePresence mode='wait'>
                    {step === 'request' && (
                        <motion.div key='request' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className='space-y-4'>
                            <div className='text-center flex flex-col items-center space-y-2'>
                                <div className='w-16 h-16 bg-primary-light primary-border rounded-full flex items-center justify-center mb-4'>
                                    <KeyRound className='w-7 h-7 text-background' />
                                </div>
                                <h2 className='text-2xl font-bold'>Reset Password</h2>
                                <p className='text-gray-500 text-center'>We&apos;ll send you a code to reset your password. Check your spam folder if you don&apos;t see it.</p>
                            </div>
                            <form onSubmit={handleRequestCode} className='space-y-4'>
                                <div className='relative opacity-60 pointer-events-none'>
                                    <Mail className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700')} />
                                    <input
                                        className='w-full text-gray-700 bg-gray-50 outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                        type='email'
                                        value={initialEmail}
                                        placeholder='Email Address'
                                        autoCorrect='off'
                                        autoComplete='off'
                                        spellCheck={false}
                                        required
                                        disabled
                                    />
                                </div>
                                <button
                                    type='submit'
                                    disabled={loading}
                                    className='w-full cursor-pointer bg-primary-light text-white font-bold py-2 text-[17px] rounded-[10px] primary-border-hover flex items-center justify-center gap-2'
                                >
                                    {loading ? <Loader2 className='w-5 h-5 animate-spin' /> : 'Send Code'}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'verify' && (
                        <motion.div key='verify' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className='space-y-4'>
                            <div className='text-center flex flex-col items-center space-y-2'>
                                <div className='w-16 h-16 bg-primary-light primary-border rounded-full flex items-center justify-center mb-4'>
                                    <Key className='w-7 h-7 text-background' />
                                </div>
                                <h2 className='text-2xl font-bold'>Check your email</h2>
                                <p className='text-gray-500'>We sent a 6-digit verification code to {initialEmail}</p>
                            </div>
                            <form onSubmit={handleVerifyCode} className='space-y-4'>
                                <InputOTP code={code} setCode={setCode} onSubmit={() => {}} resetPassword />
                                <button
                                    type='submit'
                                    disabled={loading || code.length !== 6}
                                    className='w-full cursor-pointer bg-primary-light text-white font-bold py-2 text-[17px] rounded-[10px] primary-border-hover flex items-center justify-center gap-2'
                                >
                                    {loading ? <Loader2 className='w-5 h-5 animate-spin' /> : 'Verify Code'}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'reset' && (
                        <motion.div key='reset' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className='space-y-4'>
                            <div className='text-center flex flex-col items-center space-y-2'>
                                <div className='w-16 h-16 bg-primary-light primary-border rounded-full flex items-center justify-center mb-4'>
                                    <Lock className='w-7 h-7 text-background' />
                                </div>
                                <h2 className='text-2xl font-bold'>New Password</h2>
                                <p className='text-gray-500'>Choose a strong password for your account.</p>
                            </div>
                            <form onSubmit={handleResetPassword} className='space-y-4'>
                                <div className='relative'>
                                    <Lock className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', newPassword.length > 0 ? 'text-black' : 'text-gray-400')} />
                                    <input
                                        className='w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                        type={passwordShown ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder='New Password'
                                        autoCorrect='off'
                                        autoComplete='off'
                                        spellCheck={false}
                                        required
                                    />
                                    <button
                                        type='button'
                                        onClick={() => setPasswordShown(!passwordShown)}
                                        className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary'
                                    >
                                        {passwordShown ? <Eye className='w-5 h-5' /> : <EyeOff className='w-5 h-5' />}
                                    </button>
                                </div>
                                <button
                                    type='submit'
                                    disabled={loading}
                                    className='w-full cursor-pointer bg-primary-light text-white font-bold py-2 text-[17px] rounded-[10px] primary-border-hover flex items-center justify-center gap-2'
                                >
                                    {loading ? <Loader2 className='w-5 h-5 animate-spin' /> : 'Reset Password'}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key='success' initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='text-center space-y-4 py-4'>
                            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto'>
                                <CheckCircle2 className='w-10 h-10 text-green-600' />
                            </div>
                            <h2 className='text-2xl font-bold'>All set!</h2>
                            <p className='text-gray-500'>Your password has been reset successfully. Next time you sign in, make sure to use your new password.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

const InputOTP = ({
    code,
    setCode,
    onSubmit,
    resetPassword = false,
}: {
    code: string;
    setCode: React.Dispatch<React.SetStateAction<string>>;
    onSubmit: () => void;
    resetPassword?: boolean;
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const focusInput = (index: number) => {
        if (inputRefs.current[index]) {
            inputRefs.current[index]?.focus();
            inputRefs.current[index]?.select();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;
        if (!/^\d*$/.test(value)) return;
        if (code.length < index) return;

        const codeArray = code.split('').concat(Array(6).fill('')).slice(0, 6);
        codeArray[index] = value.slice(-1);

        const newCode = codeArray.join('');
        setCode(newCode);

        if (value && index < 5 && code.length >= index) {
            focusInput(index + 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (index < 5) focusInput(index + 1);
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (index > 0) focusInput(index - 1);
        }

        if (e.key === 'Backspace') {
            if (!code[index] && index > 0) {
                e.preventDefault();
                focusInput(index - 1);

                const codeArray = code.split('');
                codeArray[index - 1] = '';
                setCode(codeArray.join(''));
            }
        }

        if (e.key === 'Enter' && onSubmit && !resetPassword) {
            onSubmit();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replaceAll(/–/g, '').slice(0, 6);
        if (/^\d+$/.test(pastedData)) {
            setCode(pastedData);
            const nextIndex = Math.min(pastedData.length, 5);
            focusInput(nextIndex === 6 ? 5 : nextIndex);
        }
    };

    return (
        <div className='flex flex-col items-start @min-[465px]/account:flex-row @min-[465px]:items-center gap-2 @min-[290px]/account:gap-4 mt-4'>
            <div className='flex items-center pb-0 gap-1 @min-[365px]/account:gap-2'>
                {Array.from({ length: 6 }).map((_, index) => (
                    <Fragment key={index}>
                        <input
                            key={index}
                            ref={(el) => {
                                inputRefs.current[index] = el;
                            }}
                            type='text'
                            maxLength={1}
                            inputMode='numeric'
                            value={code[index] || ''}
                            onChange={(e) => handleChange(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onPaste={handlePaste}
                            className='w-full aspect-square @min-[315px]/account:h-10 @min-[365px]/account:w-11 @min-[365px]/account:h-11 text-center text-[17px] @min-[250px]/account:text-lg @min-[315px]/account:text-xl font-figtree font-semibold border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary-extra-light outline-none transition-all'
                            aria-label={`Digit ${index + 1}`}
                        />
                        {index === 2 && (
                            <div className={cn('min-w-4 h-[3px] bg-gray-500 rounded-full', resetPassword ? 'hidden min-[380px]:block' : 'hidden @min-[270px]/account:block')} />
                        )}
                    </Fragment>
                ))}
            </div>

            {!resetPassword && (
                <button
                    type='button'
                    onClick={onSubmit}
                    className='px-3 py-1.5 @min-[290px]/account:px-4 @min-[290px]/account:py-2 w-full @min-[465px]/account:h-11 bg-white border border-gray-200 text-gray-700 font-bold text-[13px] @min-[290px]/account:text-sm cursor-pointer rounded-lg hover:bg-gray-50 transition-colors'
                >
                    Submit
                </button>
            )}
        </div>
    );
};

const NavTab = ({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) => (
    <button
        onClick={onClick}
        type='button'
        className={cn(
            'flex items-center gap-3 px-3 pl-4 @min-[520px]/settings:pr-12 py-2 rounded-xl transition-all w-full text-left font-figtree cursor-pointer',
            active ? 'bg-white shadow-sm text-primary border border-gray-200 font-semibold' : 'text-gray-500 hover:bg-primary-extra-light hover:text-primary-dark font-normal',
        )}
    >
        <Icon className={cn('min-w-4.5 w-4.5 h-4.5', active ? 'stroke-[2.5px]' : '')} />
        {label}
    </button>
);

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
                                : 'border-red-300 focus:border-red-500 focus:ring-red-100',
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
                    className='disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[330px]/delete-account:text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover transition-all'
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
            0.9,
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

const notificationTypes: NotificationMap[] = [
    {
        text: 'Calendar Invitations',
        type: NotificationType.calendar_invite,
        visibility: ['subcontractor', 'barn'],
    },
    {
        text: 'Job Requests',
        type: NotificationType.job_request,
        visibility: ['braider', 'subcontractor'],
    },
    {
        text: 'Job Invitation Responses',
        type: NotificationType.job_status_change,
        visibility: ['barn'],
    },

    {
        text: 'Barn Connection Requests',
        type: NotificationType.barn_invite,
        visibility: ['braider'],
    },
    {
        text: 'Braider Connection Requests',
        type: NotificationType.barn_invite,
        visibility: ['barn'],
    },
    {
        text: 'Barn Connection Responses',
        type: NotificationType.barn_status_change,
        visibility: ['braider'],
    },
    {
        text: 'Braider Connection Responses',
        type: NotificationType.barn_status_change,
        visibility: ['barn'],
    },

    {
        text: 'Subcontractor Join Requests',
        type: NotificationType.team_invite,
        visibility: ['braider'],
    },
    {
        text: 'Braider Connection Requests',
        type: NotificationType.team_invite,
        visibility: ['subcontractor'],
    },
    {
        text: 'Subcontractor Join Responses',
        type: NotificationType.team_status_change,
        visibility: ['braider'],
    },
    {
        text: 'Braider Connection Responses',
        type: NotificationType.team_status_change,
        visibility: ['subcontractor'],
    },

    {
        text: 'Job Notes',
        type: NotificationType.new_message,
        visibility: ['subcontractor', 'barn', 'braider'],
    },
    {
        text: 'Approaching Horse Limit',
        type: NotificationType.limit_approaching,
        visibility: ['braider'],
    },
    {
        text: 'Exceeded Horse Limit',
        type: NotificationType.limit_exceeded,
        visibility: ['braider'],
    },
];

export default Settings;
