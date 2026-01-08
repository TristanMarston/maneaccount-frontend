'use client';

import { getProviders, signIn, useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, Scissors, Users, Building2, LucideProps, Briefcase } from 'lucide-react'; // Added icons
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { GradientBackground } from '../_components/GradientBackground';
import { failToast, scrollVariants } from '../context';
import Logo from '../_components/_navbar/Logo';
import { cn } from '@/lib/utils';

type UserRole = 'braider' | 'subcontractor' | 'client';

type FormData = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: UserRole;
};

const SignInPage = () => {
    const [providers, setProviders] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [passwordShown, setPasswordShown] = useState(false);
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'authenticated' && session) {
            if (session.user && session.user.role === 'admin') router.push('/admin');
            else router.push('/dashboard');
        }
    }, [session, status]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const passedMode = searchParams.get('mode');
    const validRoles = searchParams.get('validRoles')?.split(',') || ['client', 'braider', 'subcontractor'];
    const [mode, setMode] = useState<'signin' | 'signup'>(passedMode === 'signin' || passedMode === 'signup' ? passedMode : 'signup');

    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: undefined,
    });

    useEffect(() => {
        getProviders().then((res) => setProviders(res));
    }, []);

    useEffect(() => {
        router.push(`/login?mode=${mode}&validRoles=${validRoles.join(',')}`);
    }, [mode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleGoogleSignIn = (providerId: string) => {
        document.cookie = `signup_role=${formData.role}; path=/; max-age=300`;

        signIn(providerId, { callbackUrl: '/dashboard' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { email, password, firstName, lastName, role } = formData;
            const name = `${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()} ${lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase()}`.trim();

            if (mode === 'signup' && role === undefined) {
                return failToast('Please select a role to sign up.');
            }

            if (mode === 'signup') {
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.toLowerCase(), password, name, role }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    let message = 'Signup failed, please try again.';
                    if (data.error === 'email_required') message = 'Please input an email address.';
                    if (data.error === 'password_required') message = 'Please input a password.';
                    if (data.error === 'name_required') message = 'Please enter first and last name.';
                    if (data.error === 'role_required') message = 'Please select a role to sign up.';
                    if (data.error === 'existing_user') message = 'Account already exists! Please sign in.';

                    failToast(message);
                    return;
                }
            }

            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                let message = 'Something went wrong. Please try again.';
                if (result.error === 'wrong_password') message = 'Incorrect password.';
                if (result.error === 'no_user') message = 'No user found with that email.';
                if (result.error === 'no_password_set') message = 'This email only has a Google account.';
                failToast(message);
                return;
            }

            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toaster />
            <GradientBackground
                gradient='from-primary-dark/50 via-primary/50 to-primary-light/50'
                className='flex flex-col items-center justify-center fixed inset-0 h-dvh overflow-hidden py-10'
            >
                <AnimatePresence>
                    {providers ? (
                        <motion.div
                            initial='hidden'
                            animate='visible'
                            variants={scrollVariants()}
                            className='bg-white rounded-2xl p-6 lg:p-8 shadow-lg font-figtree w-[90%] max-w-xl max-h-[90dvh] overflow-y-scroll'
                        >
                            <h1 className='text-[33px] lg:text-4xl font-bold text-center mb-2'>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h1>
                            <p className='text-gray-500 text-center mb-4 lg:mb-6'>{mode === 'signin' ? 'Welcome back to ManeAccount' : 'Select an account type to get started'}</p>

                            {mode === 'signup' && (
                                <div className='max-w-3xl grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 mb-4'>
                                    {[
                                        { id: 'braider', label: 'Braider', icon: Scissors },
                                        { id: 'subcontractor', label: 'Subcontractor', icon: Users },
                                        { id: 'client', label: 'Client', icon: Briefcase },
                                    ].map((type) => (
                                        <ShiftButton
                                            key={type.id}
                                            disabled={validRoles.indexOf(type.id) === -1}
                                            role={type.id as UserRole}
                                            selectedRole={formData.role}
                                            setSelectedRole={setFormData}
                                            icon={type.icon}
                                        />
                                    ))}
                                </div>
                            )}

                            {Object.values(providers).map((provider: any) =>
                                provider.name.toLowerCase() === 'google' ? (
                                    <button
                                        key={provider.name}
                                        onClick={() => {
                                            if (formData.role !== undefined && mode === 'signup') handleGoogleSignIn(provider.id);
                                            else if (formData.role === undefined && mode === 'signup') failToast('Please select a role to sign up.');
                                            else if (mode === 'signin') signIn(provider.id, { callbackUrl: '/dashboard' });
                                        }}
                                        className='shadow-sm border border-gray-200 bg-white w-full flex justify-center items-center gap-3 px-4 py-1.5 lg:py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors mb-4 lg:mb-6'
                                    >
                                        <Image src='/google-logo.png' alt='Google Logo' width={24} height={24} />
                                        <span className='text-gray-700 font-semibold'>Continue with {provider.name}</span>
                                    </button>
                                ) : null
                            )}

                            <div className='flex items-center gap-4 mb-4 lg:mb-6'>
                                <div className='h-px flex-1 bg-gray-200' />
                                <span className='text-gray-400 text-sm'>or</span>
                                <div className='h-px flex-1 bg-gray-200' />
                            </div>

                            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
                                {mode === 'signup' && (
                                    <div className='flex gap-3'>
                                        <input
                                            className='w-full outline-none shadow-sm border border-gray-200 px-4 py-1.5 lg:py-2 rounded-xl focus:border-primary transition-colors'
                                            name='firstName'
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder='First Name'
                                            required
                                        />
                                        <input
                                            className='w-full outline-none shadow-sm border border-gray-200 px-4 py-1.5 lg:py-2 rounded-xl focus:border-primary transition-colors'
                                            name='lastName'
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            placeholder='Last Name'
                                            required
                                        />
                                    </div>
                                )}

                                <input
                                    className='w-full outline-none shadow-sm border border-gray-200 px-4 py-1.5 lg:py-2 rounded-xl focus:border-primary transition-colors'
                                    name='email'
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder='Email Address'
                                    required
                                />

                                <div className='relative'>
                                    <input
                                        className='w-full outline-none shadow-sm border border-gray-200 px-4 py-1.5 lg:py-2 rounded-xl focus:border-primary transition-colors'
                                        name='password'
                                        type={passwordShown ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder='Password'
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
                                    className='w-full cursor-pointer bg-primary text-white font-bold py-2 lg:py-2.5 rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition-all mt-2 disabled:opacity-70 disabled:cursor-not-allowed'
                                >
                                    {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                                </button>
                            </form>

                            <p className='text-gray-500 mt-4 lg:mt-6 text-center text-sm'>
                                {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}
                                <span className='cursor-pointer text-primary font-bold ml-1 hover:underline' onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
                                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                                </span>
                            </p>

                            <div className='w-full flex justify-center mt-4 lg:mt-8'>
                                <Logo />
                            </div>
                        </motion.div>
                    ) : (
                        <div className='loader'></div>
                    )}
                </AnimatePresence>
            </GradientBackground>
        </>
    );
};

const ShiftButton = (props: {
    role: UserRole;
    selectedRole: UserRole | undefined;
    setSelectedRole: React.Dispatch<React.SetStateAction<FormData>>;
    icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;
    disabled: boolean;
}) => {
    const { role, selectedRole, setSelectedRole, disabled } = props;

    return (
        <button
            disabled={disabled}
            className={cn('bg-primary rounded-[10px] cursor-pointer w-full disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none')}
            onClick={() => {
                if (!disabled) {
                    setSelectedRole((data) => {
                        return { ...data, role: role };
                    });
                }
            }}
        >
            <motion.div
                variants={rowHoverVariants}
                initial={'unhovered'}
                whileHover={selectedRole === role ? 'selected' : 'hovered'}
                animate={selectedRole === role ? 'selected' : 'unhovered'}
                className='font-figtree capitalize hidden lg:flex flex-col gap-2 text-primary font-bold text-sm bg-white rounded-[10px] px-2 py-2 xl:py-1.5 2xl:py-2 border-[1.9px] border-primary w-full h-full items-center justify-center'
            >
                <props.icon className='w-6 h-6' strokeWidth={2.5} />
                {role}
            </motion.div>
            <motion.div
                variants={columnHoverVariants}
                initial={'unhovered'}
                whileHover={selectedRole === role ? 'selected' : 'hovered'}
                animate={selectedRole === role ? 'selected' : 'unhovered'}
                className='font-figtree font-semibold lg:hidden capitalize text-primary text-lg bg-white rounded-[10px] px-2 py-1.5 sm:py-2 border-[1.9px] border-primary w-full h-full flex gap-2 items-center justify-center'
            >
                <props.icon className='w-5.5 h-5.5' strokeWidth={2.5} />
                {role}
            </motion.div>
        </button>
    );
};

const rowHoverVariants: Variants = {
    unhovered: {
        rotate: 0,
        y: 0,
        transition: { duration: 0.2 },
    },
    hovered: {
        rotate: -1.5,
        y: -3,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
    selected: {
        y: -4,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
};

const columnHoverVariants: Variants = {
    unhovered: {
        rotate: 0,
        y: 0,
        transition: { duration: 0.2 },
    },
    hovered: {
        rotate: -1,
        y: -4,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
    selected: {
        y: -3,
        transition: { type: 'spring', stiffness: 300, damping: 10, duration: 0.2 },
    },
};

export default SignInPage;
