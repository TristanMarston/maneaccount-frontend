import { useEffect, useState } from 'react';
import Image from 'next/image';
import { GradientBackground } from '@/app/_components/GradientBackground';
import Logo from '@/app/_components/_navbar/Logo';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Shield, User, Users, Briefcase, Scissors } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { signOut, useSession } from 'next-auth/react';
import { getConnection, getIDByEmail, getIDByPublicID, getUserByPublicID } from '@/app/actions/join';

type Inviter = {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
    publicID: string | null;
};

const Join = ({ inviterID }: { inviterID: string }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [inviter, setInviter] = useState<Inviter>();
    const [existingConnection, setExistingConnection] = useState(false);
    const [addingOneself, setAddingOneself] = useState(false);
    const { data: session, status } = useSession();

    useEffect(() => {
        const checkExistingConnection = async (publicID: string) => {
            if (status === 'authenticated' && session) {
                const userEmail = session.user?.email;
                if (userEmail) {
                    const userID = await getIDByEmail(userEmail);
                    const targetID = await getIDByPublicID(publicID);

                    if (userID && userID.success && userID.success.id && targetID && targetID.success && targetID.success.id) {
                        if (userID.success.id === targetID.success.id) {
                            setAddingOneself(true);
                            setLoading(false);
                            return;
                        }

                        const existing = await getConnection(userID.success.id, targetID.success.id);
                        if (existing.success) setExistingConnection(true);
                        setLoading(false);
                    }
                }
            }
        };

        checkExistingConnection(inviterID);
    }, [session, status]);

    useEffect(() => {
        const getSendingUser = async (publicID: string) => {
            const { user, error } = await getUserByPublicID(publicID);
            if (!error) setInviter(user);
            setLoading(false);
        };

        getSendingUser(inviterID);
    }, []);

    if (!inviter && !loading) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-stone-50 font-figtree'>
                <div className='text-center font-figtree'>
                    <h1 className='text-2xl font-bold text-gray-900'>Link Expired or Invalid</h1>
                    <p className='text-gray-500 mt-2'>We couldn't find the user you're looking for.</p>
                    <a href='/' className='mt-4 inline-block text-primary font-bold hover:underline'>
                        Go Home
                    </a>
                </div>
            </div>
        );
    } else if (existingConnection) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-stone-50 font-figtree'>
                <div className='text-center font-figtree'>
                    <h1 className='text-2xl font-bold text-gray-900'>Connection Already Exists</h1>
                    <p className='text-gray-500 mt-2'>It appears that the person you&apos;re trying to connect with has already added you.</p>
                    <a href='/dashboard' className='mt-4 inline-block text-primary font-bold hover:underline'>
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    } else if (addingOneself) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-stone-50 font-figtree'>
                <div className='text-center font-figtree'>
                    <h1 className='text-2xl font-bold text-gray-900'>Cannot Add Yourself</h1>
                    <p className='text-gray-500 mt-2'>It appears that you&apos;re trying to add youself.</p>
                    <a href='/dashboard' className='mt-4 inline-block text-primary font-bold hover:underline'>
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    } else if (loading) {
        return <div className='loader'></div>;
    }

    let validRoles: string[] = [];
    const senderRole = inviter?.role.toLowerCase();

    if (senderRole === 'braider') validRoles = ['subcontractor', 'client'];
    else if (senderRole === 'subcontractor') validRoles = ['braider'];
    else if (senderRole === 'client') validRoles = ['braider'];

    const setJoinCookie = () => {
        document.cookie = `join_request_user=${inviter?.publicID}; path=/; max-age=3600; SameSite=Lax`;
    };

    const handleJoin = (action: 'signin' | 'signup' | 'dashboard') => {
        setLoading(true);
        setJoinCookie();
        const stringValidRoles = validRoles.join(',');

        if (action === 'dashboard') router.push('/dashboard');
        else if (action === 'signin') router.push(`/login?mode=signin&validRoles=${stringValidRoles}`);
        else if (action === 'signup') router.push(`/login?mode=signup&validRoles=${stringValidRoles}`);
    };

    const getRoleText = () => {
        const role = inviter?.role.toLowerCase();
        const userRole = session?.user.role;
        if (userRole) {
            if (role === 'braider') {
                if (userRole === 'subcontractor') return { label: 'Braider', icon: Scissors, action: 'join their team' };
                if (userRole === 'client') return { label: 'Braider', icon: Scissors, action: 'hire them' };
            }
            if (role === 'subcontractor') return { label: 'Subcontractor', icon: Users, action: 'add them to your team' };
            if (role === 'client') return { label: 'Client', icon: Briefcase, action: 'work for them' };
        } else {
            if (role === 'braider') return { label: 'Braider', icon: Scissors, action: 'join their team or hire them' };
            if (role === 'subcontractor') return { label: 'Subcontractor', icon: Users, action: 'add them to your team' };
            if (role === 'client') return { label: 'Client', icon: Briefcase, action: 'work for them' };
        }
        return { label: 'User', icon: User, action: 'connect with them' };
    };

    const roleInfo = getRoleText();
    const RoleIcon = roleInfo.icon;

    return (
        <GradientBackground
            gradient='from-primary-dark/50 via-primary/50 to-primary-light/50'
            className='flex flex-col items-center justify-center fixed inset-0 h-dvh overflow-hidden py-10'
        >
            <AnimatePresence>
                {inviter && !existingConnection && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className='bg-white rounded-2xl p-0 shadow-lg font-figtree w-[90%] max-w-[480px] max-h-[90dvh] overflow-y-auto relative'
                    >
                        <div className='h-32 w-full rounded-t-2xl bg-primary-extra-light border-b border-gray-100 relative overflow-hidden'>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] opacity-80"></div>
                            <div className='absolute inset-0 bg-linear-to-b from-transparent to-black/5'></div>
                        </div>

                        <div className='absolute top-16 left-1/2 -translate-x-1/2'>
                            <div className='relative'>
                                <div className='w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white'>
                                    {inviter.image ? (
                                        <Image src={inviter.image} alt={inviter.name || 'Inviter'} fill className='object-cover rounded-full' />
                                    ) : (
                                        <div className='w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl'>
                                            {inviter.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className='absolute bottom-1 right-1 bg-white rounded-full p-1.5 shadow-sm border border-gray-100'>
                                    <RoleIcon size={16} className='text-primary' />
                                </div>
                            </div>
                        </div>

                        <div className='px-8 pt-16 pb-8 text-center flex flex-col items-center'>
                            <h2 className='text-3xl font-lusitana font-bold text-gray-900 mt-2'>{inviter.name}</h2>
                            <p className='text-sm font-figtree font-bold text-gray-400 uppercase tracking-wider mt-1 mb-4 flex items-center gap-1.5 justify-center'>
                                <Shield size={12} />
                                Verified {roleInfo.label}
                            </p>

                            <p className='text-gray-600 font-figtree text-lg leading-relaxed mb-8 max-w-sm'>
                                You've been invited to {roleInfo.action} on <strong>ManeAccount</strong>.
                            </p>

                            {session ? (
                                <div className='w-full space-y-3'>
                                    <div className='bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4 flex items-center gap-3 text-left'>
                                        {session.user.image ? (
                                            <Image src={session.user.image} width={40} height={40} className='rounded-full' alt='You' />
                                        ) : (
                                            <div className='w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold'>
                                                {session.user.name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-xs text-gray-500 font-bold uppercase'>Signed in as</p>
                                            <p className='font-bold text-gray-900 truncate'>{session.user.name}</p>
                                        </div>
                                        <Check className='text-green-500' />
                                    </div>

                                    <button
                                        onClick={() => handleJoin('dashboard')}
                                        disabled={loading}
                                        className='w-full cursor-pointer bg-primary flex gap-2 justify-center items-center font-figtree text-white font-bold py-2 lg:py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition-all mt-2 disabled:opacity-70 disabled:cursor-not-allowed'
                                    >
                                        {loading ? 'Connecting...' : 'Accept Invitation'} <ArrowRight size={18} />
                                    </button>

                                    <span className='text-xs text-gray-400 mt-4'>
                                        Not you?{' '}
                                        <span onClick={() => signOut({ callbackUrl: '/login?mode=signin' })} className='underline hover:text-gray-600 cursor-pointer'>
                                            Sign out
                                        </span>
                                    </span>
                                </div>
                            ) : (
                                <div className='w-full space-y-3'>
                                    <button
                                        onClick={() => handleJoin('signup')}
                                        disabled={loading}
                                        className='w-full cursor-pointer bg-primary flex gap-2 justify-center items-center font-figtree text-white font-bold py-2 lg:py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition-all mt-2 disabled:opacity-70 disabled:cursor-not-allowed'
                                    >
                                        Create Account
                                    </button>
                                    <button
                                        onClick={() => handleJoin('signin')}
                                        disabled={loading}
                                        className='w-full cursor-pointer bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 flex gap-2 justify-center items-center font-figtree font-bold py-2 lg:py-2.5 rounded-xl shadow-sm active:scale-[0.98] transition-all mt-2 disabled:opacity-70 disabled:cursor-not-allowed'
                                    >
                                        Log In
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className='w-full flex justify-center mb-8'>
                            <Logo />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </GradientBackground>
    );
};

export default Join;
