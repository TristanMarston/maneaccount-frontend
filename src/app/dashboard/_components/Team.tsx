'use client';

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { PlusCircle, Search, Trash2, User, Copy, Share2, Phone, Mail, Check, X, Clock, ArrowRight, ArrowLeft, Scissors, Loader2, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { getTeamMembers, inviteUser, removeMember, acceptRequest, getUserByPublicID, getTeamRequests } from '@/app/actions/team';
import QRCode from 'react-qr-code';
import { cn } from '@/lib/utils';
import { failToast, successToast } from '@/app/context';
import Link from 'next/link';
import Modal from '../Modal';
import useScreenWidth from '@/hooks/useScreenWidth';
import { markAllTypeAsRead } from '@/app/actions/notifications';
import { NotificationType } from '@prisma/client';
import { useNotifications } from '@/app/NotificationContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const getInitials = (name: string) => (name ? name.substring(0, 1).toUpperCase() : '?');

type TeamMember = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    publicID: string | null;
    phoneNumber: string | null;
    connectionID: string;
    joinedAt: Date;
};

type PendingMember = TeamMember & { sentAt: Date };

import { SubscriptionTier } from '@prisma/client';

const Team = ({
    userEmail,
    role,
    userPublicID,
    setSelectedPage,
    subscriptionTier,
}: {
    userEmail: string;
    role: string;
    userPublicID: string;
    setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
    subscriptionTier?: SubscriptionTier;
}) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [pending, setPending] = useState<{ incoming: PendingMember[]; outgoing: PendingMember[] }>({ incoming: [], outgoing: [] });
    const [loading, setLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteMode, setInviteMode] = useState<'id' | 'qr'>('id');
    const [inviteInput, setInviteInput] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [checkModal, setCheckModal] = useState<{ name: string; connectionID: string; open: boolean }>({ name: '', connectionID: '', open: false });
    const [checkAcceptModal, setCheckAcceptModal] = useState<{ open: boolean; name: string; callback: () => void; type: 'accept' | 'send' | null }>({
        open: false,
        name: '',
        callback: () => {},
        type: null,
    });

    const refreshDataFn = useCallback(async () => {
        setLoading(true);
        const [memberData, pendingData] = await Promise.all([getTeamMembers(userEmail), getTeamRequests(userEmail)]);

        // @ts-ignore
        setMembers(memberData);
        // @ts-ignore
        setPending(pendingData);
        setLoading(false);
    }, []);

    useAutoRefresh(refreshDataFn);

    const { refreshCounts } = useNotifications();

    useEffect(() => {
        const markRead = async () => {
            await markAllTypeAsRead(NotificationType.team_invite);
            await markAllTypeAsRead(NotificationType.team_status_change);
            refreshCounts();
        };
        markRead();
    }, [refreshCounts]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        const result = await inviteUser(inviteInput);

        if (result.success) {
            successToast(result.message);
            setIsInviting(false);
            setInviteInput('');
            refreshDataFn();
        } else {
            failToast(result.error || 'Failed to invite');
        }
        setInviteLoading(false);
    };

    const handleAccept = async (connectionID: string) => {
        const result = await acceptRequest(connectionID);
        if (result.success) {
            successToast('Request accepted!');
            refreshDataFn();
        } else {
            failToast('Failed to accept');
        }
    };

    const handleRemove = async (connectionID: string, isPending: boolean = false) => {
        const result = await removeMember(connectionID, isPending);

        if (result.success) {
            successToast(isPending ? 'Request denied' : 'Member removed');
            if (isPending) {
                setPending((prev) => ({
                    incoming: prev.incoming.filter((m) => m.connectionID !== connectionID),
                    outgoing: prev.outgoing.filter((m) => m.connectionID !== connectionID),
                }));
            } else {
                setMembers((prev) => prev.filter((m) => m.connectionID !== connectionID));
            }
        } else {
            failToast('Failed to remove');
        }

        setCheckModal({ name: '', connectionID: '', open: false });
    };

    return (
        <>
            <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-8 @container/team'>
                <header className='flex gap-6 mb-6 flex-col justify-start items-start @min-[490px]/team:gap-0 @min-[490px]/team:flex-row @min-[490px]/team:justify-between @min-[490px]/team:items-center'>
                    <div>
                        <h1 className='text-3xl @min-[280px]/team:text-[33px] @min-[310px]/team:text-4xl font-lusitana font-bold text-gray-900'>
                            {role === 'braider' ? 'My Subcontractors' : 'My Braiders'}
                        </h1>
                        <p className='text-gray-500 font-figtree mt-1 @min-[310px]/team:mt-1.5 text-[15px] @min-[300px]/team:text-base'>
                            {role === 'braider' ? 'Manage the team helping you cover your shows.' : 'Connect with braiders you are working for.'}
                        </p>
                    </div>
                    <div className='flex flex-col w-full @min-[375px]/team:w-auto @min-[375px]/team:flex-row gap-3 @min-[375px]/team:gap-4'>
                        <button
                            onClick={() => {
                                setLoading(true);
                                refreshDataFn();
                            }}
                            className='font-figtree w-full @min-[490px]/team:w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[275px]/team:text-lg text-nowrap rounded-[14px] @min-[490px]/team:rounded-[20px] @min-[735px]/team:rounded-[10px] py-2 px-6 @min-[490px]/team:p-3 @min-[735px]/team:py-2 @min-[735px]/team:px-6 bg-background text-primary primary-border-hover'
                        >
                            <RefreshCcw
                                className={cn('w-6 h-6 @min-[490px]/team:w-7 @min-[490px]/team:h-7 @min-[735px]/team:w-6 @min-[735px]/team:h-6', loading ? 'animate-spin' : '')}
                                strokeWidth={2.5}
                            />
                            <span className='block @min-[490px]/team:hidden @min-[735px]/team:block'>Refresh</span>
                        </button>
                        <button
                            onClick={() => {
                                if (role === 'braider' && subscriptionTier === 'professional' && members.length >= 10) {
                                    failToast('Professional plan is limited to 10 subcontractors.');
                                    return;
                                }
                                setIsInviting(true);
                            }}
                            className='font-figtree w-full @min-[490px]/team:w-auto cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[275px]/team:text-lg @min-[650px]/team:text-[19px] @min-[735px]/team:text-lg text-nowrap rounded-[14px] @min-[490px]/team:rounded-[20px] @min-[650px]/team:rounded-[14px] @min-[735px]/team:rounded-[10px] py-2 px-6 @min-[490px]/team:p-3 @min-[650px]/team:py-2 @min-[650px]/team:px-6 bg-primary-light text-background primary-border-hover'
                        >
                            <PlusCircle className='w-6 h-6 @min-[490px]/team:w-7 @min-[490px]/team:h-7 @min-[650px]/team:w-6 @min-[650px]/team:h-6' strokeWidth={2.5} />
                            <span className='block @min-[490px]/team:hidden @min-[650px]/team:block'>{role === 'braider' ? 'Invite Member' : 'Add Braider'}</span>
                        </button>
                    </div>
                </header>

                {(pending.incoming.length > 0 || pending.outgoing.length > 0) && (
                    <div className='space-y-2 mb-5'>
                        <h3 className='text-sm font-bold text-gray-500 uppercase tracking-wider font-figtree ml-1'>Pending Requests</h3>

                        <div className='grid grid-cols-1 @min-[650px]/team:grid-cols-2 gap-4'>
                            {loading ? (
                                <>
                                    {[1, 2].map((i) => (
                                        <div key={i} className='h-20 bg-gray-100 rounded-3xl animate-pulse' />
                                    ))}
                                </>
                            ) : (
                                <>
                                    {pending.incoming.map((req) => (
                                        <motion.div
                                            key={req.connectionID}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className='bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 @min-[330px]/team:gap-0 @min-[330px]/team:flex-row @min-[330px]/team:items-center justify-between font-figtree'
                                        >
                                            <div className='flex items-center gap-3 min-w-0'>
                                                {req.image ? (
                                                    <Image className='w-11 h-11 rounded-full' src={req.image} alt='profile' width={50} height={50} />
                                                ) : (
                                                    <div className='w-11 h-11 rounded-full bg-primary/80 text-background flex items-center justify-center text-lg font-bold shrink-0 font-figtree'>
                                                        {getInitials(req.name || '')}
                                                    </div>
                                                )}
                                                <div className='min-w-0 flex-1'>
                                                    <p className='font-bold text-gray-900 text-base truncate'>{req.name}</p>
                                                    <div className='flex items-center gap-1 text-[13px] text-primary font-medium'>
                                                        <ArrowLeft size={12} />
                                                        <span>Wants to add you</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className='grid grid-cols-2 @min-[330px]/team:flex gap-2 font-figtree font-semibold'>
                                                <button
                                                    onClick={() => handleRemove(req.connectionID, true)}
                                                    className='flex gap-2 items-center justify-center p-1.5 @min-[330px]/team:p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer'
                                                >
                                                    <X className='w-5 h-5' strokeWidth={3} />
                                                    <span className='block @min-[330px]/team:hidden'>Deny</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (role === 'braider' && subscriptionTier === 'professional' && members.length >= 10) {
                                                            failToast('Professional plan is limited to 10 subcontractors.');
                                                            return;
                                                        }
                                                        if (role === 'braider')
                                                            setCheckAcceptModal({ open: true, name: req.name || '', callback: () => handleAccept(req.connectionID), type: 'accept' });
                                                        else handleAccept(req.connectionID);
                                                    }}
                                                    className='flex gap-2 items-center justify-center p-1.5 @min-[330px]/team:p-2.5 rounded-xl bg-primary-light text-white hover:bg-primary transition-colors shadow-sm cursor-pointer'
                                                >
                                                    <Check className='w-5 h-5' strokeWidth={3} />
                                                    <span className='block @min-[330px]/team:hidden'>Accept</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {pending.outgoing.map((req, index) => (
                                        <div
                                            key={req.connectionID && req.connectionID.length > 0 ? req.connectionID : req.name || index}
                                            className='bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 @min-[330px]/team:gap-0 @min-[330px]/team:flex-row @min-[330px]/team:items-center justify-between font-figtree'
                                        >
                                            <div className='flex items-center gap-3 min-w-0'>
                                                {req.image ? (
                                                    <Image className='w-11 h-11 rounded-full' src={req.image} alt='profile' width={50} height={50} />
                                                ) : (
                                                    <div className='w-11 h-11 rounded-full bg-primary/80 text-background flex items-center justify-center text-lg font-bold shrink-0 font-figtree'>
                                                        {getInitials(req.name || '')}
                                                    </div>
                                                )}
                                                <div className='min-w-0 flex-1'>
                                                    <p className='font-bold text-gray-700 text-base truncate'>{req.name || 'Unknown'}</p>
                                                    <div className='flex items-center gap-1 text-[13px] text-primary'>
                                                        <ArrowRight size={12} />
                                                        <span>Invite Sent</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(req.connectionID, true)}
                                                className='text-sm cursor-pointer font-bold bg-red-50 hover:bg-red-100 text-red-500 px-4 py-1.5 border rounded-xl border-red-200 transition-colors'
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className='grid grid-cols-1 @min-[800px]/team:grid-cols-2 @min-[1200px]/team:grid-cols-3 gap-6 animate-pulse'>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={cn('h-40 bg-gray-100 rounded-3xl', i === 3 ? 'hidden @min-[800px]/team:block @min-[1200px]/team:hidden' : '')} />
                        ))}
                    </div>
                ) : members.length === 0 ? (
                    <>
                        <div className='flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-3xl px-4 border border-dashed border-gray-200'>
                            <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
                                <User className='text-gray-400' size={32} />
                            </div>
                            <h3 className='font-figtree text-[22px] @min-[285px]/team:text-2xl @min-[320px]/team:text-[27px] @min-[360px]/team:text-3xl font-bold text-gray-900 text-center'>
                                No Team <br className='block @min-[265px]/team:hidden' /> Members Yet
                            </h3>
                            <p className='text-gray-500 text-sm @min-[320px]/team:text-[15px] mt-1 mb-4 @min-[360px]/team:mt-2 @min-[360px]/team:mb-6 text-center max-w-sm font-figtree'>
                                Start building your network by inviting {role === 'braider' ? 'subcontractors' : 'braiders'} to join you.
                            </p>
                            <button
                                onClick={() => setIsInviting(true)}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-[17px] @min-[320px]/team:text-lg text-nowrap rounded-[10px] py-1.5 px-6 bg-background text-primary primary-border-hover'
                            >
                                <PlusCircle className='w-6 h-6' strokeWidth={2.5} />
                                Send your first invite
                            </button>
                        </div>
                        {role === 'braider' && (
                            <div
                                onClick={() => setSelectedPage('Barns')}
                                className='flex gap-2 w-fit items-start text-primary font-figtree py-2 px-4 rounded-full hover:bg-primary-extra-light cursor-pointer transition-all'
                            >
                                <ArrowRight className='w-6 h-6' />
                                <p>Looking for where to invite barns?</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className='grid grid-cols-1 @min-[800px]/team:grid-cols-2 @min-[1200px]/team:grid-cols-3 gap-6'>
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className='bg-white p-6 rounded-3xl border border-gray-100 shadow-sm group relative overflow-hidden flex flex-col justify-between @container/team-card'
                            >
                                <div>
                                    <div className='flex items-start justify-between mb-4'>
                                        <div className='flex items-center gap-4 min-w-0'>
                                            <div className='relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-inner'>
                                                {member.image ? (
                                                    <Image src={member.image} alt={member.name || ''} fill className='object-cover' />
                                                ) : (
                                                    <div className='bg-primary/80 text-background flex items-center justify-center text-xl font-bold w-full h-full font-figtree'>
                                                        {getInitials(member.name || '')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <h3 className='font-figtree text-[22px] @min-[260px]/team-card:text-2xl font-bold text-gray-900 truncate'>{member.name}</h3>
                                                <p className='text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded-md inline-block'>@{member.publicID || 'no-id'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setCheckModal({ name: member.name || '', connectionID: member.connectionID, open: true })}
                                            className='text-gray-300 cursor-pointer hover:text-red-500 transition-colors p-1 hidden @min-[290px]/team-card:block'
                                        >
                                            <Trash2 className='w-5 h-5' />
                                        </button>
                                    </div>

                                    <div className='space-y-2 pt-2 border-t border-gray-50'>
                                        {member.phoneNumber && (
                                            <Link
                                                href={`tel:+1${member.phoneNumber}`}
                                                className='flex items-center gap-3 text-sm text-gray-600 font-figtree cursor-pointer p-1.5 rounded-[14px] hover:bg-green-50 transition-all'
                                            >
                                                <div className='w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 transition-all'>
                                                    <Phone size={14} />
                                                </div>
                                                <span className='font-medium transition-all'>{`(${member.phoneNumber.slice(0, 3)}) ${member.phoneNumber.slice(
                                                    3,
                                                    6,
                                                )}-${member.phoneNumber.slice(6, 10)}`}</span>
                                            </Link>
                                        )}
                                        <Link
                                            href={`mailto:${member.email}`}
                                            className='flex items-center gap-3 text-sm text-gray-600 font-figtree cursor-pointer p-1.5 rounded-[14px] hover:bg-blue-50 transition-all'
                                        >
                                            <div className='w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600'>
                                                <Mail size={14} />
                                            </div>
                                            <span className='truncate max-w-[180px] font-medium'>{member.email}</span>
                                        </Link>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCheckModal({ name: member.name || '', connectionID: member.connectionID, open: true })}
                                    className='mt-3 text-red-500 font-figtree w-full cursor-pointer font-bold text-[17px] @min-[260px]/team-card:text-lg flex @min-[290px]/team-card:hidden justify-center items-center gap-2 text-nowrap rounded-[14px] red-border-hover py-1.5 @min-[260px]/team-card:py-2 transition-colors'
                                >
                                    <Trash2 className='w-5 h-5' />
                                    Remove
                                </button>
                                {/* {role === 'braider' && (
                                    <button className='mt-3 text-primary font-figtree w-full cursor-pointer font-bold text-[17px] @min-[260px]/team-card:text-lg flex justify-center items-center gap-2 text-nowrap rounded-[14px] primary-border-hover py-1.5 @min-[260px]/team-card:py-2 transition-colors'>
                                        <Scissors className='w-5 h-5' />
                                        Assign Work
                                    </button>
                                )} */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Modal isOpen={isInviting} setIsOpen={setIsInviting} className='max-w-lg p-6 min-[435px]:p-7 rounded-[18px] primary-border-bold relative overflow-visible'>
                <InviteModal
                    inviteMode={inviteMode}
                    setInviteMode={setInviteMode}
                    handleInvite={handleInvite}
                    publicID={userPublicID}
                    inviteInput={inviteInput}
                    setInviteInput={setInviteInput}
                    loading={inviteLoading}
                    setOpen={setIsInviting}
                    role={role}
                    setCheckAcceptModal={setCheckAcceptModal}
                />
            </Modal>
            <Modal
                isOpen={checkAcceptModal.open}
                setIsOpen={(open: boolean) => setCheckAcceptModal({ name: '', callback: () => {}, open, type: null })}
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative @container/check-accept'
            >
                {checkAcceptModal.type && role === 'braider' && (
                    <div>
                        <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                        <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                            This action will {checkAcceptModal.type} a connection request {checkAcceptModal.type === 'send' ? 'to' : 'from'}{' '}
                            <span className='font-bold'>{checkAcceptModal.name}</span>. Upon acceptance they will be able to view{' '}
                            <span className='font-bold'>all of your upcoming and ongoing calendar events.</span>
                        </p>
                        <div className='grid @min-[410px]/check-accept:grid-cols-2 gap-3 @min-[410px]/check-accept:gap-4 mt-4'>
                            <button
                                onClick={() => setCheckAcceptModal({ open: false, name: '', callback: () => {}, type: null })}
                                className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setCheckAcceptModal({ open: false, name: '', callback: () => {}, type: null });
                                    checkAcceptModal.callback();
                                }}
                                className='font-figtree cursor-pointer capitalize font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                            >
                                {checkAcceptModal.type} Invite
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            <Modal
                isOpen={checkModal.open}
                setIsOpen={(open: boolean) =>
                    setCheckModal((prev) => {
                        return { ...prev, open };
                    })
                }
                className='max-w-3xl p-7 rounded-[18px] primary-border-bold relative @container/check-team'
            >
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>Are you sure?</h1>
                    <p className='text-gray-800 text-[17px] font-figtree mt-2'>
                        This will delete your connection with <span className='font-bold'>{checkModal.name}</span> forever.
                    </p>
                    <div className='grid @min-[410px]/check-team:grid-cols-2 gap-3 @min-[410px]/check-team:gap-4 mt-4'>
                        <button
                            onClick={() => setCheckModal({ open: false, connectionID: '', name: '' })}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleRemove(checkModal.connectionID)}
                            className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                        >
                            Remove Connection
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

type InviteUserInfo = {
    name: string;
    image: string;
    publicID: string;
    tier?: 'starter' | 'professional' | 'enterprise';
};

const InviteModal = ({
    inviteMode,
    setInviteMode,
    handleInvite,
    publicID,
    inviteInput,
    setInviteInput,
    loading,
    setOpen,
    role,
    setCheckAcceptModal,
}: {
    inviteMode: 'id' | 'qr';
    setInviteMode: React.Dispatch<React.SetStateAction<'id' | 'qr'>>;
    handleInvite: (e: React.FormEvent<Element>) => Promise<void>;
    publicID: string;
    inviteInput: string;
    setInviteInput: React.Dispatch<React.SetStateAction<string>>;
    loading: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    role: string;
    setCheckAcceptModal: React.Dispatch<React.SetStateAction<{ open: boolean; name: string; callback: () => void; type: 'accept' | 'send' | null }>>;
}) => {
    const idRef = useRef<HTMLFormElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [idHeight, setIDHeight] = useState(0);
    const [qrHeight, setQRHeight] = useState(0);
    const screenWidth = useScreenWidth();
    const [invitedUser, setInvitedUser] = useState<InviteUserInfo>({ name: '', image: '', publicID: '' });
    const [loadingUser, setLoadingUser] = useState<'inactive' | 'loading' | 'success' | 'fail'>('inactive');

    const copyInviteLink = () => {
        const link = `${window.location.origin}/join/${publicID}`;
        navigator.clipboard.writeText(link);
        successToast('Link copied to clipboard');
    };

    const lastRequestValue = useRef('');

    const getUser = async (invitePublicID: string) => {
        lastRequestValue.current = invitePublicID;

        if (invitePublicID.length < 3) {
            setLoadingUser('inactive');
            setInvitedUser({ name: '', image: '', publicID: '' });
            return;
        }

        setLoadingUser('loading');
        try {
            const user = await getUserByPublicID(invitePublicID);

            if (invitePublicID !== lastRequestValue.current) return;

            if (!user || user.error || publicID === invitePublicID) {
                setLoadingUser('fail');
                setInvitedUser({ name: '', image: '', publicID: '' });
                return;
            } else if (user.user?.publicID === invitePublicID && user.user.role.toLowerCase() !== role.toLowerCase() && user.user.role.toLowerCase() !== 'barn') {
                const { name, image, subscriptionTier, role } = user.user;
                setInvitedUser({ publicID: user.user.publicID, name: name || '', image: image || '', tier: (role === 'braider' ? subscriptionTier : undefined) || undefined });
                setLoadingUser('success');
            } else {
                setLoadingUser('fail');
                setInvitedUser({ name: '', image: '', publicID: '' });
            }
        } catch (error) {
            if (invitePublicID === lastRequestValue.current) {
                setLoadingUser('fail');
                setInvitedUser({ name: '', image: '', publicID: '' });
            }
        }
    };

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${publicID}` : '';

    const idVariants: Variants = {
        closed: {
            x: -100,
            opacity: 0,
            height: 0,
            padding: 0,
            transition: { duration: 0.3, ease: 'easeOut' },
        },
        open: {
            x: 0,
            opacity: 1,
            height: idHeight + (screenWidth > 435 ? 36 : 0),
            padding: screenWidth > 435 ? '24px 24px 12px 24px' : 0,
            transition: { duration: 0.3, ease: 'easeOut' },
        },
    };

    const qrVariants: Variants = {
        closed: {
            x: 100,
            opacity: 0,
            height: 0,
            padding: 0,
            transition: { duration: 0.3, ease: 'easeOut' },
        },
        open: {
            x: 0,
            opacity: 1,
            height: qrHeight + (screenWidth > 435 ? 36 : 0),
            padding: screenWidth > 435 ? '24px 24px 12px 24px' : 0,
            transition: { duration: 0.3, ease: 'easeOut' },
        },
    };

    const updateHeight = (inviteMode: 'id' | 'qr') => {
        if (inviteMode === 'id') {
            if (idRef.current) setIDHeight(idRef.current.scrollHeight);
        } else if (inviteMode === 'qr') {
            if (qrRef.current) setQRHeight(qrRef.current.scrollHeight);
        }
    };

    useEffect(() => {
        updateHeight(inviteMode);
        setTimeout(() => updateHeight(inviteMode), 150);
        window.addEventListener('resize', () => updateHeight(inviteMode));

        return () => window.removeEventListener('resize', () => updateHeight(inviteMode));
    }, [inviteMode, loadingUser]);

    return (
        <>
            <motion.div layout className='@container/invite'>
                <div className='border-b pb-4 mb-4 min-[435px]:mb-0 border-gray-100 flex flex-col items-start @min-[375px]/invite:flex-row @min-[375px]/invite:items-center gap-2 @min-[375px]/invite:gap-4'>
                    <h1 className='text-3xl @min-[250px]/invite:text-[33px] @min-[265px]/invite:text-4xl font-lusitana font-bold text-gray-900'>Invite to Team</h1>
                    <div className='relative grid grid-cols-2 @min-[375px]/invite:flex w-full @min-[375px]/invite:w-fit items-center rounded-full bg-primary-extra-light p-2 font-figtree'>
                        <button
                            className={cn(
                                'cursor-pointer font-medium grid place-items-center pr-3.5 pl-3 transition-all relative w-full h-full',
                                inviteMode === 'id' ? 'text-background' : 'text-primary',
                            )}
                            onClick={() => setInviteMode('id')}
                        >
                            <span className='relative z-10 select-none text-base @min-[265px]/invite:text-[17px] @min-[375px]/invite:text-base w-full'>ID</span>
                        </button>
                        <button
                            className={cn(
                                'cursor-pointer font-medium grid place-items-center pl-4 pr-3 transition-all relative w-full h-full',
                                inviteMode === 'qr' ? 'text-background' : 'text-primary',
                            )}
                            onClick={() => setInviteMode('qr')}
                        >
                            <span className='relative z-10 select-none text-base @min-[265px]/invite:text-[17px] @min-[375px]/invite:text-base w-full'>QR</span>
                        </button>
                        <div className={`absolute p-1 inset-0 z-0 flex ${inviteMode === 'qr' ? 'justify-end' : 'justify-start'}`}>
                            <motion.span layout transition={{ type: 'spring', damping: 15, stiffness: 250 }} className='h-full w-1/2 rounded-full bg-primary' />
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {inviteMode === 'id' ? (
                        <motion.div key='id' initial='closed' animate={inviteMode === 'id' ? 'open' : 'closed'} exit='closed' variants={idVariants}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (role === 'braider') setCheckAcceptModal({ open: true, name: invitedUser?.name || '', callback: () => handleInvite(e), type: 'send' });
                                    else handleInvite(e);
                                }}
                                ref={idRef}
                            >
                                <p className='text-base text-gray-500 font-figtree'>
                                    Enter the unique <strong>Public ID</strong> of the person you want to add.
                                </p>
                                <div className='relative mt-2'>
                                    <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', inviteInput.length > 0 ? 'text-black' : 'text-gray-400')} />
                                    <input
                                        className={cn(
                                            'w-full outline-none font-figtree shadow-sm border border-gray-200 pl-8 pr-4 pt-[7px] pb-[9px] rounded-xl focus:border-primary transition-colors',
                                            loadingUser === 'fail' || invitedUser.tier === 'starter'
                                                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                                : loadingUser === 'success'
                                                  ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                                                  : 'border-gray-200 focus:border-primary focus:ring-primary/10',
                                        )}
                                        name='invite'
                                        value={inviteInput}
                                        onChange={(e) => {
                                            setInviteInput(e.target.value);
                                            getUser(e.target.value);
                                        }}
                                        placeholder='e.g. sarahb123'
                                        required
                                    />
                                    <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                                        {loadingUser === 'loading' ? (
                                            <Loader2 size={18} className='animate-spin text-gray-400' />
                                        ) : loadingUser === 'success' && (!invitedUser.tier || invitedUser.tier !== 'starter') ? (
                                            <Check size={18} className='text-green-500' />
                                        ) : loadingUser === 'fail' || invitedUser.tier === 'starter' ? (
                                            <X size={18} className='text-red-500' />
                                        ) : null}
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {invitedUser.name.length > 0 && invitedUser.publicID.length > 0 && loadingUser === 'success' && (
                                        <motion.div className='bg-white shadow-sm border border-gray-200 rounded-[14px] py-2.5 px-3 flex items-center gap-3 mt-4'>
                                            <div className='relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-inner'>
                                                {invitedUser.image.length > 0 ? (
                                                    <Image src={invitedUser.image} alt={invitedUser.name || ''} fill className='object-cover' />
                                                ) : (
                                                    <div className='w-full h-full bg-primary/80 text-background flex items-center justify-center text-xl font-bold font-figtree'>
                                                        {getInitials(invitedUser.name || '')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className=''>
                                                <h4 className='font-figtree text-xl font-bold truncate'>{invitedUser.name}</h4>
                                                <h4 className='font-figtree text-xs font-semibold text-gray-600 truncate'>
                                                    {invitedUser.tier === 'starter'
                                                        ? 'Braider cannot add subcontractors'
                                                        : role === 'braider'
                                                          ? 'Add as a subcontractor'
                                                          : 'Add as a braider'}
                                                </h4>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className='w-full grid @min-[375px]/invite:grid-cols-2 gap-3 mt-4'>
                                    <button
                                        type='button'
                                        onClick={copyInviteLink}
                                        className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-1.5 px-6 bg-background text-primary primary-border-hover'
                                    >
                                        <Copy className='w-4 h-4' strokeWidth={3} />
                                        Copy Link
                                    </button>
                                    <button
                                        type='submit'
                                        disabled={!inviteInput || loading || invitedUser.name.length === 0 || invitedUser.tier === 'starter'}
                                        className='disabled:opacity-50 disabled:cursor-not-allowed font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                                    >
                                        {loading ? 'Sending...' : 'Send Invite'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div key='qr' initial='closed' animate={inviteMode === 'qr' ? 'open' : 'closed'} exit='closed' variants={qrVariants}>
                            <div ref={qrRef} className='flex flex-col items-center space-y-6 font-figtree'>
                                <div className='p-4 bg-white rounded-2xl border-2 border-primary/10 shadow-sm'>
                                    <QRCode value={inviteLink} size={200} fgColor='#171717' bgColor='#FFFFFF' level='M' />
                                </div>
                                <div className='text-center space-y-1'>
                                    <p className='font-bold text-gray-900 text-xl'>Scan to Connect</p>
                                    <p className='text-sm text-gray-500 max-w-[200px] mx-auto'>
                                        Have them scan this code to instantly add {role === 'braider' ? 'them to your network' : 'you to their network'}.
                                    </p>
                                </div>
                                <button
                                    type='button'
                                    onClick={copyInviteLink}
                                    className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-1.5 px-6 bg-background text-primary primary-border-hover'
                                >
                                    <Share2 className='w-4 h-4' strokeWidth={3} />
                                    Share Link
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            <X onClick={() => setOpen(false)} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};

export default Team;
