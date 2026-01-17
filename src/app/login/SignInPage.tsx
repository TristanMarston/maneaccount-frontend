'use client';

import { getProviders, signIn, useSession } from 'next-auth/react';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, Scissors, Users, Building2, LucideProps, Warehouse } from 'lucide-react'; // Added icons
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { GradientBackground } from '../_components/GradientBackground';
import { failToast, scrollVariants, successToast } from '../context';
import Logo from '../_components/_navbar/Logo';
import { cn } from '@/lib/utils';
import Modal from '../dashboard/Modal';
import { requestPasswordReset, verifyResetCode, resetPassword } from '../actions/verification';
import toast from 'react-hot-toast';
import { Mail, Lock, Key, CheckCircle2, ArrowRight, Loader2, KeyRound } from 'lucide-react';

type UserRole = 'braider' | 'subcontractor' | 'barn';

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
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const { data: session, status } = useSession();

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (status === 'authenticated' && session) {
            if (session.user && session.user.role === 'admin') router.push('/admin');
            else router.push('/dashboard');
        }

        const error = searchParams.get('error');
        if (error === 'AccountNotFound') {
            failToast('Account not found. Please select a role and use the sign up form!');
        }
    }, [session, status, searchParams]);

    const passedMode = searchParams.get('mode');
    const validRoles = searchParams.get('validRoles')?.split(',') || ['barn', 'braider', 'subcontractor'];
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
        document.cookie = `auth_intent=signup; path=/; max-age=300`;

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
                                        { id: 'barn', label: 'Barn', icon: Warehouse },
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
                                            else if (mode === 'signin') {
                                                document.cookie = `auth_intent=signin; path=/; max-age=300`;
                                                signIn(provider.id, { callbackUrl: '/dashboard' });
                                            }
                                        }}
                                        className='shadow-sm border border-gray-200 bg-white w-full flex justify-center items-center gap-3 px-4 py-1.5 lg:py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors mb-4 lg:mb-6'
                                    >
                                        <Image src='/google-logo.png' alt='Google Logo' width={24} height={24} />
                                        <span className='text-gray-700 font-semibold'>Continue with {provider.name}</span>
                                    </button>
                                ) : null,
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

                            {mode === 'signin' && (
                                <p className='text-gray-500 mt-2 text-center text-sm'>
                                    Forgot password?{' '}
                                    <span className='cursor-pointer text-primary font-bold hover:underline' onClick={() => setResetModalOpen(true)}>
                                        Reset it
                                    </span>
                                </p>
                            )}

                            <div className='w-full flex justify-center mt-4 lg:mt-8'>
                                <Logo />
                            </div>
                        </motion.div>
                    ) : (
                        <div className='loader'></div>
                    )}
                </AnimatePresence>
            </GradientBackground>

            <ResetPasswordModal isOpen={resetModalOpen} setIsOpen={setResetModalOpen} initialEmail={formData.email} />
        </>
    );
};

const ResetPasswordModal = ({ isOpen, setIsOpen, initialEmail }: { isOpen: boolean; setIsOpen: (open: boolean) => void; initialEmail: string }) => {
    const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'success'>('request');
    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordShown, setPasswordShown] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEmail(initialEmail);
            setStep('request');
            setCode('');
            setNewPassword('');
        }
    }, [isOpen, initialEmail]);

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await requestPasswordReset(email);
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
        const res = await verifyResetCode(email, code);
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
        const res = await resetPassword(email, code, newPassword);
        if (res.success) {
            successToast('Password reset successfully!');
            setStep('success');
            setTimeout(() => {
                setIsOpen(false);
            }, 2000);
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
                                <p className='text-gray-500 text-center'>
                                    Enter your email and we&apos;ll send you a code to reset your password. Check your spam folder if you don&apos;t see it.
                                </p>
                            </div>
                            <form onSubmit={handleRequestCode} className='space-y-4'>
                                <div className='relative'>
                                    <Mail className={cn('absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4', email.length > 0 ? 'text-black' : 'text-gray-400')} />
                                    <input
                                        className='w-full outline-none shadow-sm border border-gray-200 pl-10 pr-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                        type='email'
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder='Email Address'
                                        autoCorrect='off'
                                        autoComplete='off'
                                        spellCheck={false}
                                        required
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
                                <p className='text-gray-500'>We sent a 6-digit verification code to {email}</p>
                            </div>
                            <form onSubmit={handleVerifyCode} className='space-y-4'>
                                <InputOTP code={code} setCode={setCode} />
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
                            <p className='text-gray-500'>Your password has been reset successfully. You can now sign in.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};

const InputOTP = ({ code, setCode }: { code: string; setCode: React.Dispatch<React.SetStateAction<string>> }) => {
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
                        className='w-full aspect-square text-center text-xl font-figtree font-semibold border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary-extra-light outline-none transition-all'
                        aria-label={`Digit ${index + 1}`}
                    />
                    {index === 2 && <div className='min-w-4 h-[3px] mx-1 bg-gray-500 rounded-full hidden min-[380px]:block' />}
                </Fragment>
            ))}
        </div>
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
