'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Check, Loader2, CircleAlert, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addToGoogleCalendar } from '@/app/actions/google-calendar';
import { generateShowICS } from '@/app/actions/apple-calendar';
import { failToast, successToast } from '@/app/context';
import Image from 'next/image';
import Modal from '../../Modal';
import { signIn } from 'next-auth/react';

const CalendarIntegrationModal = ({
    isOpen,
    onClose,
    showId,
    showName,
    onAppleClick,
    alreadySynced,
}: {
    isOpen: boolean;
    onClose: () => void;
    showId: string;
    showName: string;
    onAppleClick?: () => void;
    alreadySynced: { google: boolean; apple: boolean };
}) => {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isAppleLoading, setIsAppleLoading] = useState(false);
    const [appleWarningHover, setAppleWarningHover] = useState(false);
    const [googleAuthState, setGoogleAuthState] = useState<'idle' | 'require_connect' | 'require_reconnect'>('idle');

    const handleGoogleClick = async () => {
        if (googleAuthState === 'require_connect' || googleAuthState === 'require_reconnect') {
            const authParams: Record<string, string> = { prompt: 'consent' };
            const callbackUrl = new URL(window.location.href);
            callbackUrl.searchParams.set('google_connected', 'true');
            signIn('google', { callbackUrl: callbackUrl.toString() }, authParams);
            return;
        }

        setIsGoogleLoading(true);
        try {
            const res = await addToGoogleCalendar(showId);
            if (res.success) {
                successToast('Added to Google Calendar!');
                onClose();
            } else if (res.error === 'REQUIRE_CONNECT') {
                setGoogleAuthState('require_connect');
            } else if (res.error === 'REQUIRE_RECONNECT') {
                setGoogleAuthState('require_reconnect');
            } else {
                failToast(res.error || 'Failed to add to Google Calendar');
            }
        } catch (error) {
            failToast('An unexpected error occurred');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleAppleClick = async () => {
        if (onAppleClick) {
            onAppleClick();
            onClose();
            return;
        }

        setIsAppleLoading(true);
        try {
            const res = await generateShowICS(showId);
            if (res.success && res.icsData) {
                const blob = new Blob([res.icsData], { type: 'text/calendar;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.filename || 'show.ics';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                successToast('Downloaded ICS file');
                onClose();
            } else {
                failToast(res.error || 'Failed to generate ICS file');
            }
        } catch (error) {
            failToast('Failed to download calendar file');
        } finally {
            setIsAppleLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <button onClick={onClose} className='absolute right-6 top-6 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors'>
                <X className='w-5 h-5' />
            </button>

            <div className='text-center flex flex-col items-center space-y-2 mb-6'>
                <div className='w-16 h-16 bg-primary-light primary-border rounded-full flex items-center justify-center mb-4'>
                    <CalendarIcon className='w-7 h-7 text-background' />
                </div>
                <h2 className='text-2xl font-bold'>Add to Calendar</h2>
                <p className='text-gray-500'>
                    Would you like to add <span className='font-semibold text-gray-900'>{showName}</span> to your personal calendar?
                </p>
            </div>

            <div className='space-y-4'>
                <div className='space-y-2'>
                    <button
                        onClick={handleGoogleClick}
                        disabled={isGoogleLoading || isAppleLoading}
                        className={cn(
                            'w-full flex items-center relative cursor-pointer justify-center gap-3 px-4 py-3 border border-gray-200 shadow-sm rounded-[14px] transition-all disabled:cursor-not-allowed group font-semibold',
                            googleAuthState !== 'idle' || alreadySynced.google
                                ? 'bg-primary-extra-light text-primary border-primary/20 hover:bg-primary-extra-light/80'
                                : 'text-gray-700 hover:bg-gray-50',
                            alreadySynced.google ? 'pointer-events-none' : '',
                        )}
                    >
                        {isGoogleLoading ? (
                            <Loader2 className='w-5 h-5 animate-spin text-gray-500' />
                        ) : (
                            <>
                                {googleAuthState === 'idle' ? (
                                    <>
                                        <Image
                                            src='https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'
                                            alt='Google Calendar'
                                            width={24}
                                            height={24}
                                        />
                                        <span>Google Calendar</span>
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className='w-5 h-5' />
                                        <span>{googleAuthState === 'require_connect' ? 'Connect Google Account' : 'Reconnect Google Account'}</span>
                                    </>
                                )}
                            </>
                        )}
                        {alreadySynced.google && (
                            <span className='absolute border border-amber-200 -top-3.5 text-nowrap -translate-x-1/2 left-1/2 py-0.5 px-2 bg-amber-100 text-amber-700 rounded-full text-[11px] uppercase font-figtree font-bold'>
                                Already Synced
                            </span>
                        )}
                    </button>
                    {googleAuthState !== 'idle' && (
                        <p className='text-[11px] text-center text-gray-400 px-2'>
                            {googleAuthState === 'require_connect'
                                ? 'Connect your Google account to sync events automatically. This account must use the same email as your ManeAccount.'
                                : 'We need you to sign in again to grant permission to manage your ManeAccount calendar.'}
                        </p>
                    )}
                </div>

                <div className={cn('relative', alreadySynced.apple && !alreadySynced.google ? 'mt-5' : '')}>
                    <button
                        onClick={handleAppleClick}
                        disabled={isGoogleLoading || isAppleLoading}
                        className={cn(
                            'w-full relative flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 shadow-sm rounded-[14px] text-gray-700 cursor-pointer font-semibold hover:bg-gray-50 transition-all disabled:cursor-not-allowed group',
                            alreadySynced.apple ? 'bg-primary-extra-light text-primary border-primary/20 pointer-events-none' : '',
                        )}
                    >
                        {isAppleLoading ? (
                            <Loader2 className='w-5 h-5 animate-spin text-gray-500' />
                        ) : (
                            <>
                                <Image
                                    src='https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/8f/83/88/8f83887d-87c5-d85a-c80e-d114f7f6205b/Placeholder.mill/400x400bb-75.webp'
                                    alt='Apple Calendar'
                                    width={24}
                                    height={24}
                                />
                                <span>Apple Calendar</span>
                            </>
                        )}
                        {alreadySynced.apple && (
                            <span className='absolute border border-amber-200 -top-3.5 text-nowrap -translate-x-1/2 left-1/2 py-0.5 px-2 bg-amber-100 text-amber-700 rounded-full text-[11px] uppercase font-figtree font-bold'>
                                Already Added
                            </span>
                        )}
                    </button>
                    <div
                        onMouseOver={() => setAppleWarningHover(true)}
                        onMouseLeave={() => setAppleWarningHover(false)}
                        className='absolute -left-2 -top-2 bg-white rounded-full xs:left-4 xs:top-1/2 xs:-translate-y-1/2 cursor-default'
                    >
                        <CircleAlert className='w-5.5 h-5.5 text-red-400' />
                        <AnimatePresence>
                            {appleWarningHover && (
                                <motion.div
                                    initial={{ y: 5, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 5, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className='absolute left-6 -translate-y-1/2 top-1/2 xs:translate-none xs:-top-9 xs:left-0 px-3 py-1.5 rounded-lg border bg-gray-50 border-red-200 shadow-sm text-gray-700 text-xs text-nowrap z-50'
                                >
                                    Will not sync if changes are made
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <button onClick={onClose} className='w-full cursor-pointer mt-6 text-gray-400 text-sm hover:text-primary-light font-medium transition-colors'>
                Maybe later
            </button>
        </>
    );
};

export default CalendarIntegrationModal;
