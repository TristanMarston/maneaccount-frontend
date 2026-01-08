'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    ChevronRight,
    Clock,
    DollarSign,
    Users,
    ClipboardCheck,
    Briefcase,
    Scissors,
    UserPlus,
    Banknote,
    BadgeDollarSign,
    MapPin,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    Bell,
    BellOff,
    MailCheck,
    SquareArrowOutUpRight,
    Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { getDashboardData } from '@/app/actions/dashboard';
import { Show } from './_calendar/Calendar';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { deleteNotification, getNotifications, markAsRead } from '@/app/actions/notifications';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import Image from 'next/image';
import { failToast, successToast } from '@/app/context';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const DashboardHome = ({ role, name, userEmail, setSelectedPage }: { role: string; name: string; userEmail: string; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

    const [shows, setShows] = useState<Show[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!userEmail) return;
        setLoading(true);

        try {
            const result = await getDashboardData(role);

            if (result.error) {
                console.error(result.error);
                return;
            }

            const { shows: showsData, jobs: jobsData } = result;

            const mappedJobs: Show[] = (jobsData as any[])
                .map((job) => {
                    return {
                        id: job.id,
                        name: job.show?.name || 'Job',
                        city: job.show?.city || '',
                        state: job.show?.state || '',
                        country: 'USA',
                        startDate: job.scheduledDate,
                        endDate: job.scheduledDate,
                        type: 'job' as 'show' | 'job',
                        jobData: job,
                        isOwner: true,
                    };
                })
                .filter((item) => item !== null);

            // @ts-ignore
            setShows([...showsData, ...mappedJobs].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
            // @ts-ignore
            setJobs(jobsData);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchData();
    }, [role, userEmail]);
    
    useAutoRefresh(fetchData);

    const upcomingShows = shows
        .filter((s) => new Date(s.endDate) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3);

    return (
        <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-4 h-full @container/home'>
            <header className='flex flex-row justify-between gap-x-4 flex-wrap'>
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>
                        {greeting}, {name.split(' ')[0]}.
                    </h1>
                    <p className='text-gray-500 font-figtree mt-1 ml-1'>Here&apos;s what&apos;s happening in your stable today.</p>
                </div>
                <Notifications setSelectedPage={setSelectedPage} role={role} />
            </header>

            {loading ? (
                <div className='w-full h-60 flex items-center justify-center'>
                    <span className='loader-primary'></span>
                </div>
            ) : (
                <div className='space-y-8 animate-in fade-in duration-500 font-figtree overflow-y-auto pb-28 dashboard-sm:pb-8 pr-1'>
                    {role === 'braider' && <BraiderView upcomingShows={upcomingShows} jobs={jobs} setSelectedPage={setSelectedPage} />}
                    {role === 'subcontractor' && <SubcontractorView upcomingShows={upcomingShows} jobs={jobs} setSelectedPage={setSelectedPage} />}
                    {role === 'client' && <ClientView upcomingShows={upcomingShows} jobs={jobs} setSelectedPage={setSelectedPage} />}
                </div>
            )}
        </div>
    );
};

const Notifications = ({ setSelectedPage, role }: { setSelectedPage: React.Dispatch<React.SetStateAction<string>>; role: string }) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isWrapped, setIsWrapped] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(bellRef, [], () => setNotificationsOpen(false));
    const notificationsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const parent = notificationsRef.current?.parentElement;
        if (!parent) return;

        const checkWrap = () => {
            const children = Array.from(parent.children);
            if (children.length >= 2) {
                const firstChild = children[0] as HTMLElement;
                const lastChild = children[children.length - 1] as HTMLElement;
                setIsWrapped(firstChild.offsetTop !== lastChild.offsetTop);
            }
        };

        const observer = new ResizeObserver(checkWrap);
        observer.observe(parent);
        checkWrap();

        return () => observer.disconnect();
    }, []);

    const fetchNotificationsList = useCallback(async () => {
        const result = await getNotifications();
        setNotifications([...result]);
    }, []);

    useAutoRefresh(fetchNotificationsList);

    const handleDeleteNotification = async (notificationId: string) => {
        const result = await deleteNotification(notificationId);

        if (result.success) {
            setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
            // successToast('Deleted notification');
        } else {
            failToast('Failed to delete notification');
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        const result = await markAsRead(notificationId);

        if (result.success) {
            setNotifications((prev) => prev.map((notif) => (notif.id === notificationId ? { ...notif, isRead: true } : notif)));
            // successToast('Marked as read');
        } else {
            failToast('Failed to mark as read');
        }
    };

    return (
        <div ref={notificationsRef} className='h-full'>
            <div ref={bellRef} className='h-full my-auto flex items-center justify-center relative'>
                <Bell
                    className='w-13 min-h-13 text-primary p-2 h-full rounded-full hover:bg-primary-extra-light transition-all cursor-pointer'
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                />
                {notifications.filter((notif) => !notif.isRead).length > 0 && (
                    <div className='absolute right-2.5 top-2 bg-red-400 shadow-sm p-1 text-background font-figtree rounded-full w-3 h-3' />
                )}

                <AnimatePresence>
                    {notificationsOpen && (
                        <motion.div
                            variants={{
                                closed: {
                                    opacity: 0,
                                    y: 0,
                                    transition: { duration: 0.3, ease: 'easeInOut' },
                                },
                                open: {
                                    opacity: 1,
                                    y: -10,
                                    transition: { duration: 0.3, ease: 'easeInOut' },
                                },
                            }}
                            initial='closed'
                            animate={notificationsOpen ? 'open' : 'closed'}
                            exit='closed'
                            className={cn(
                                'absolute top-[calc(100%+16px)] w-[80dvw] dashboard-sm:w-[325px] dashboard-sm:@min-[350px]/home:w-xs dashboard-sm:@min-[400px]/home:w-cm dashboard-sm:@min-[450px]/home:w-[450px] dashboard-sm:@min-[500px]/home:w-lg primary-border font-figtree bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 z-40',
                                isWrapped ? 'left-0 right-auto' : 'right-0 left-auto'
                            )}
                        >
                            <div className='p-5 @container/notification-window'>
                                <h1 className='font-lusitana font-bold text-gray-900 text-3xl'>Notifications</h1>
                                <div className='flex flex-col gap-4 overflow-y-auto max-h-[340px] pt-[11px] pr-1 pb-1'>
                                    {notifications.length === 0 ? (
                                        <div className='bg-gray-50/50 rounded-2xl p-4 border border-dashed border-gray-200 grid place-items-center'>
                                            <BellOff className='p-3 rounded-full text-gray-400 w-16 h-16' />
                                            <p className='text-gray-500'>You have no notifications.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {notifications
                                                .filter((notif) => !notif.isRead)
                                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                .map((notif) => (
                                                    <Notification
                                                        key={notif.id}
                                                        notification={notif}
                                                        setSelectedPage={setSelectedPage}
                                                        role={role}
                                                        isRead={notif.isRead}
                                                        handleDeleteNotification={handleDeleteNotification}
                                                        handleMarkAsRead={handleMarkAsRead}
                                                        setNotificationsOpen={setNotificationsOpen}
                                                    />
                                                ))}
                                            {notifications.filter((notif) => notif.isRead).length > 0 && (
                                                <span className='font-figtree text-gray-600 uppercase font-bold tracking-wide mt-2'>Past Notifications</span>
                                            )}
                                            {notifications
                                                .filter((notif) => notif.isRead)
                                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                .map((notif) => (
                                                    <Notification
                                                        key={notif.id}
                                                        notification={notif}
                                                        setSelectedPage={setSelectedPage}
                                                        role={role}
                                                        isRead={notif.isRead}
                                                        handleDeleteNotification={handleDeleteNotification}
                                                        handleMarkAsRead={handleMarkAsRead}
                                                        setNotificationsOpen={setNotificationsOpen}
                                                    />
                                                ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const Notification = ({
    notification,
    setSelectedPage,
    role,
    isRead,
    handleDeleteNotification,
    handleMarkAsRead,
    setNotificationsOpen,
}: {
    notification: any;
    setSelectedPage: React.Dispatch<React.SetStateAction<string>>;
    role: string;
    isRead: boolean;
    handleDeleteNotification: (notificationId: string) => void;
    handleMarkAsRead: (notificationId: string) => void;
    setNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    return (
        <div
            key={notification.id}
            className={cn('rounded-xl relative border border-gray-200 shadow-sm p-2.5 transition-colors cursor-pointer', isRead ? 'bg-gray-50' : 'hover:bg-gray-50')}
        >
            <div
                onClick={() => {
                    if (role === 'braider' || role === 'subcontractor') {
                        setSelectedPage(
                            notification.type === 'calendar_invite'
                                ? 'Calendar'
                                : notification.type.startsWith('job')
                                  ? 'Tasks'
                                  : notification.type.startsWith('client')
                                    ? 'Clients'
                                    : notification.type.startsWith('team')
                                      ? 'Team'
                                      : notification.type === 'new_message'
                                        ? 'Messages'
                                        : ''
                        );
                    } else if (role === 'client') {
                        setSelectedPage(
                            notification.type === 'calendar_invite'
                                ? 'Calendar'
                                : notification.type === 'job_completed'
                                  ? 'Invoices'
                                  : notification.type.startsWith('job')
                                    ? 'Services'
                                    : notification.type.startsWith('client')
                                      ? 'Braiders'
                                      : notification.type.startsWith('team')
                                        ? 'Team'
                                        : notification.type === 'new_message'
                                          ? 'Messages'
                                          : ''
                        );
                    }
                    setNotificationsOpen(false);
                }}
                className={cn('flex items-center justify-between group cursor-pointer gap-3 min-w-0', isRead ? 'opacity-50' : '')}
            >
                <div className='flex items-center gap-3 min-w-0'>
                    {notification.sender && (
                        <div className='min-w-10 h-10 relative'>
                            {notification.sender.image ? (
                                <Image src={notification.sender.image} alt={notification.sender.name} fill className='rounded-full object-cover' />
                            ) : (
                                <div className='w-full h-full rounded-full bg-primary-extra-light flex items-center justify-center text-primary font-bold text-sm'>
                                    {notification.sender.name.substring(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                    )}
                    <p className='text-gray-900 font-semibold text-sm leading-[1.15] text-wrap'>{notification.message}</p>
                </div>
                <div className='flex flex-col gap-1 @min-[335px]/notification-window:flex-row @min-[335px]/notification-window:gap-3 pr-2'>
                    {isRead ? (
                        <Trash2
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                            }}
                            className='cursor-pointer w-4.5 h-4.5 @min-[335px]/notification-window:w-5 @min-[335px]/notification-window:h-5 text-gray-400 hover:text-red-500 transition-all hover:scale-105'
                        />
                    ) : (
                        <MailCheck
                            onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                            }}
                            className='cursor-pointer w-4.5 h-4.5 @min-[335px]/notification-window:w-5 @min-[335px]/notification-window:h-5 text-gray-400 hover:text-primary-dark transition-all hover:scale-105'
                        />
                    )}
                    <SquareArrowOutUpRight className='cursor-pointer w-4.5 h-4.5 @min-[335px]/notification-window:w-5 @min-[335px]/notification-window:h-5 text-gray-400 hover:text-primary-dark transition-all hover:scale-105' />
                </div>
            </div>
            {notification.createdAt && (
                <div
                    className={cn(
                        '-top-3 absolute text-xs right-2 bg-primary-extra-light text-primary-dark border border-primary/25 shadow-sm rounded-full px-2 py-0.5',
                        notification.isRead ? 'text-gray-400 bg-gray-50 border-gray-200' : ''
                    )}
                >
                    {format(notification.createdAt, 'Pp')}
                </div>
            )}
        </div>
    );
};

const BraiderView = ({ upcomingShows, jobs, setSelectedPage }: { upcomingShows: Show[]; jobs: any[]; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const unpaidJobs = jobs.filter((j) => j.status === 'completed' && !j.paidAt);
    const pendingAmount = unpaidJobs.reduce(
        (acc, j) => acc + j.assignments.reduce((sAcc: number, s: any) => sAcc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0),
        0
    );
    const upcomingEvents = upcomingShows.filter(
        (s) =>
            s.type !== 'job' ||
            (s.type === 'job' &&
                s.jobData &&
                s.jobData.status !== 'completed' &&
                s.jobData.status !== 'denied' &&
                s.jobData.status !== 'canceled' &&
                s.jobData.status !== 'sub_declined')
    ).length;

    return (
        <div className='space-y-8'>
            {/* Quick Stats Grid */}
            <div className='grid grid-cols-1 @min-[600px]/home:grid-cols-2 gap-4'>
                <StatCard
                    title='Unpaid Invoices'
                    value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pendingAmount)}
                    icon={DollarSign}
                    color='amber'
                    subtext={`${unpaidJobs.length} pending jobs`}
                    onClick={() => setSelectedPage('Invoices')}
                />
                <StatCard
                    title='Upcoming Events'
                    value={upcomingEvents.toString()}
                    icon={Calendar}
                    color='primary'
                    subtext={upcomingEvents > 0 ? `${upcomingEvents} upcoming event${upcomingEvents === 1 ? '' : 's'}` : 'No upcoming events'}
                    onClick={() => setSelectedPage('Calendar')}
                />
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className='text-lg font-bold font-figtree text-gray-900 mb-4'>Quick Actions</h3>
                <div className='grid grid-cols-2 @min-[500px]/home:grid-cols-4 gap-4'>
                    <ActionCard icon={Calendar} label='Calendar' onClick={() => setSelectedPage('Calendar')} />
                    <ActionCard icon={Users} label='Clients' onClick={() => setSelectedPage('Clients')} />
                    <ActionCard icon={Banknote} label='Invoices' onClick={() => setSelectedPage('Invoices')} />
                    <ActionCard icon={UserPlus} label='Team' onClick={() => setSelectedPage('Team')} />
                </div>
            </div>

            <div className='grid grid-cols-1 @min-[850px]/home:grid-cols-2 gap-8'>
                {/* Upcoming Schedule */}
                <SectionContainer title='Upcoming Schedule' onViewAll={() => setSelectedPage('Calendar')}>
                    {upcomingShows.length > 0 ? upcomingShows.map((show) => <ShowCard key={show.id} show={show} />) : <EmptyState message='No upcoming shows or jobs.' />}
                </SectionContainer>

                {/* Pending Invoices Preview */}
                <SectionContainer title='Pending Invoices' onViewAll={() => setSelectedPage('Invoices')}>
                    {unpaidJobs.length > 0 ? (
                        unpaidJobs.slice(0, 3).map((job) => <InvoicePreviewCard key={job.id} job={job} role='braider' />)
                    ) : (
                        <EmptyState message='No pending invoices.' icon={CheckCircle2} />
                    )}
                </SectionContainer>
            </div>
        </div>
    );
};

const SubcontractorView = ({ upcomingShows, jobs, setSelectedPage }: { upcomingShows: Show[]; jobs: any[]; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const upcomingEvents = upcomingShows.filter(
        (s) =>
            s.type !== 'job' ||
            (s.type === 'job' &&
                s.jobData &&
                s.jobData.status !== 'completed' &&
                s.jobData.status !== 'denied' &&
                s.jobData.status !== 'canceled' &&
                s.jobData.status !== 'sub_declined')
    ).length;

    return (
        <div className='space-y-8'>
            <div className='grid grid-cols-1 @min-[600px]/home:grid-cols-2 gap-4'>
                <StatCard
                    title='Upcoming Jobs'
                    value={upcomingShows
                        .filter(
                            (s) =>
                                s.type === 'job' &&
                                s.jobData &&
                                s.jobData.status !== 'completed' &&
                                s.jobData.status !== 'denied' &&
                                s.jobData.status !== 'canceled' &&
                                s.jobData.status !== 'sub_declined'
                        )
                        .length.toString()}
                    icon={Briefcase}
                    color='blue'
                    subtext='Assigned jobs'
                    onClick={() => setSelectedPage('Tasks')}
                />
                <StatCard
                    title='Calendar Events'
                    value={upcomingEvents.toString()}
                    icon={Calendar}
                    color='primary'
                    subtext={`${upcomingEvents} upcoming event${upcomingEvents === 1 ? '' : 's'}`}
                    onClick={() => setSelectedPage('Calendar')}
                />
            </div>

            <div>
                <h3 className='text-lg font-bold font-figtree text-gray-900 mb-4'>Quick Actions</h3>
                <div className='grid grid-cols-2 @min-[500px]/home:grid-cols-2 gap-4'>
                    <ActionCard icon={Calendar} label='Calendar' onClick={() => setSelectedPage('Calendar')} />
                    <ActionCard icon={ClipboardCheck} label='My Tasks' onClick={() => setSelectedPage('Tasks')} />
                </div>
            </div>

            <div className='grid grid-cols-1 gap-8'>
                <SectionContainer title='Upcoming Schedule' onViewAll={() => setSelectedPage('Calendar')}>
                    {upcomingShows.length > 0 ? upcomingShows.map((show) => <ShowCard key={show.id} show={show} />) : <EmptyState message='No upcoming schedule.' />}
                </SectionContainer>
            </div>
        </div>
    );
};

const ClientView = ({ upcomingShows, jobs, setSelectedPage }: { upcomingShows: Show[]; jobs: any[]; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const unpaidJobs = jobs.filter((j) => j.status === 'completed' && !j.paidAt);
    const pendingAmount = unpaidJobs.reduce(
        (acc, j) => acc + j.assignments.reduce((sAcc: number, s: any) => sAcc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0),
        0
    );

    return (
        <div className='space-y-8'>
            <div className='grid grid-cols-1 @min-[600px]/home:grid-cols-2 gap-4'>
                <StatCard
                    title='To Pay'
                    value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pendingAmount)}
                    icon={Banknote}
                    color='amber'
                    subtext={`${unpaidJobs.length} invoice${unpaidJobs.length === 1 ? '' : 's'} to pay`}
                    onClick={() => setSelectedPage('Invoices')}
                />
                <StatCard
                    title='Next Event'
                    value={upcomingShows[0] ? format(new Date(upcomingShows[0].startDate), 'MMM d') : '-'}
                    icon={Calendar}
                    color='primary'
                    subtext={`${upcomingShows[0]?.name || 'No upcoming events'}${upcomingShows[0]?.type === 'job' ? ' • Job' : ''}`}
                    onClick={() => setSelectedPage('Calendar')}
                />
            </div>

            <div>
                <h3 className='text-lg font-bold font-figtree text-gray-900 mb-4'>Quick Actions</h3>
                <div className='grid grid-cols-2 @min-[500px]/home:grid-cols-4 gap-4'>
                    <ActionCard icon={Scissors} label='Braiders' onClick={() => setSelectedPage('Braiders')} />
                    <ActionCard icon={Briefcase} label='Services' onClick={() => setSelectedPage('Services')} />
                    <ActionCard icon={Banknote} label='Invoices' onClick={() => setSelectedPage('Invoices')} />
                    <ActionCard icon={Calendar} label='Calendar' onClick={() => setSelectedPage('Calendar')} />
                </div>
            </div>

            <div className='grid grid-cols-1 @min-[850px]/home:grid-cols-2 gap-8'>
                <SectionContainer title='Upcoming Events' onViewAll={() => setSelectedPage('Calendar')}>
                    {upcomingShows.length > 0 ? upcomingShows.map((show) => <ShowCard key={show.id} show={show} />) : <EmptyState message='No upcoming events.' />}
                </SectionContainer>

                <SectionContainer title='Invoices to Pay' onViewAll={() => setSelectedPage('Invoices')}>
                    {unpaidJobs.length > 0 ? (
                        unpaidJobs.slice(0, 3).map((job) => <InvoicePreviewCard key={job.id} job={job} role='client' />)
                    ) : (
                        <EmptyState message='All caught up on invoices!' icon={CheckCircle2} />
                    )}
                </SectionContainer>
            </div>
        </div>
    );
};

const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtext,
    onClick,
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    color: 'primary' | 'amber' | 'blue';
    subtext: string;
    onClick?: () => void;
}) => {
    const colorStyles = {
        primary: { bg: 'bg-primary-extra-light', text: 'text-primary', border: 'primary-border-hover' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'amber-border-hover' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'venmo-border-hover' },
    };

    const styles = colorStyles[color];

    return (
        <div
            onClick={onClick}
            className={cn(
                'p-6 rounded-[20px] bg-white border border-gray-100 shadow-sm flex items-start justify-between cursor-pointer hover:shadow-md transition-all group relative overflow-hidden',
                styles.border
            )}
        >
            <div className='relative z-10 min-w-0'>
                <p className='text-sm font-bold text-gray-400 uppercase tracking-wide mb-1'>{title}</p>
                <h3 className={cn('text-3xl font-lusitana font-bold mb-2', styles.text)}>{value}</h3>
                <p className='text-sm text-gray-500 font-medium truncate'>{subtext}</p>
            </div>
            <div className={cn('p-3 rounded-[14px] relative z-10', styles.bg, styles.text)}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div className={cn('absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-110', styles.bg.replace('-50', '-200'))} />
        </div>
    );
};

const ActionCard = ({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        className='flex flex-col items-center justify-center gap-3 p-4 cursor-pointer rounded-[18px] bg-white primary-border-hover hover:border-primary/20 transition-all group h-32'
    >
        <div className='p-3 rounded-full bg-primary-extra-light text-primary group-hover:scale-110 transition-transform'>
            <Icon size={24} strokeWidth={2.5} />
        </div>
        <span className='font-figtree font-bold text-gray-700 group-hover:text-primary transition-colors'>{label}</span>
    </button>
);

const SectionContainer = ({ title, children, onViewAll }: { title: string; children: React.ReactNode; onViewAll: () => void }) => (
    <section className='bg-white rounded-[18px] primary-border p-6'>
        <div className='flex items-center flex-wrap gap-1 justify-between mb-4'>
            <h3 className='text-xl font-lusitana font-bold text-gray-900'>{title}</h3>
            <button
                onClick={onViewAll}
                className='text-sm font-bold text-primary flex items-center gap-1 cursor-pointer px-3 py-1 rounded-full hover:bg-primary-extra-light transition-all'
            >
                View All <ArrowUpRight size={16} />
            </button>
        </div>
        <div className={cn('space-y-3', title.indexOf('Invoices') !== -1 ? 'space-y-5 @min-[360px]/home:space-y-3' : '')}>{children}</div>
    </section>
);

const ShowCard = ({ show }: { show: Show }) => {
    if (show.jobData && (show.jobData.status === 'denied' || show.jobData.status === 'canceled' || show.jobData.status === 'sub_declined')) return;

    return (
        <div
            className={cn(
                'flex items-center gap-4 p-4 rounded-[18px] bg-gray-50/50 border border-gray-100 transition-all group',
                show.jobData && show.jobData.status === 'completed' ? 'opacity-50' : ''
            )}
        >
            <div
                className={cn(
                    'flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0 font-figtree',
                    show.type === 'job' ? 'bg-blue-100 text-blue-600' : 'bg-primary-extra-light text-primary'
                )}
            >
                <span className='text-xs font-bold uppercase'>{format(new Date(show.startDate), 'MMM')}</span>
                <span className='text-xl font-black'>{format(new Date(show.startDate), 'd')}</span>
            </div>
            <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                    <h4 className='font-bold text-gray-900 truncate font-figtree text-lg'>{show.name}</h4>
                    {show.type === 'job' && (
                        <span className='text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide'>
                            {show.jobData && show.jobData.status === 'completed' ? ' Completed' : 'Job'}
                        </span>
                    )}
                </div>

                <div className='flex items-center flex-wrap gap-0 text-sm text-gray-500 font-medium mt-0.5'>
                    <span className='flex items-center gap-1 min-w-0'>
                        <MapPin size={14} /> <span className='truncate text-nowrap'>{show.city}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

const InvoicePreviewCard = ({ job, role }: { job: any; role: string }) => {
    const total = job.assignments.reduce((acc: any, s: any) => acc + s.services.reduce((ssAcc: number, ss: any) => ssAcc + ss.priceUSD, 0), 0);

    return (
        <div className='flex items-center justify-between p-4 rounded-[18px] bg-white border border-gray-100 shadow-sm relative'>
            <div className='flex items-center gap-4 min-w-0'>
                <div className='w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0'>
                    <DollarSign size={20} strokeWidth={2.5} />
                </div>
                <div className='min-w-0'>
                    <p className='font-bold text-gray-900 font-figtree truncate pr-2'>{role === 'client' ? job.braider.name : job.client.name}</p>
                    <p className='text-xs text-gray-500 font-medium'>{format(new Date(job.scheduledDate), 'MMM d, yyyy')}</p>
                </div>
            </div>
            <span className='font-lusitana font-bold text-lg text-amber-700 hidden @min-[360px]/home:block'>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
            </span>
            <span className='font-lusitana font-bold absolute -top-3 right-2 text-base px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 shadow-sm text-amber-700 block @min-[360px]/home:hidden'>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
            </span>
        </div>
    );
};

const EmptyState = ({ message, icon: Icon = AlertCircle }: { message: string; icon?: React.ElementType }) => (
    <div className='flex flex-col items-center justify-center py-8 text-center'>
        <div className='w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400'>
            <Icon size={24} />
        </div>
        <p className='text-gray-500 font-medium'>{message}</p>
    </div>
);

export default DashboardHome;
