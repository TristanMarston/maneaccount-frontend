'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { getDashboardData } from '@/app/actions/dashboard';
import { Show } from './_calendar/Calendar'; // Importing Show type
import { cn } from '@/lib/utils';
import { motion } from 'motion/react'; // Updated import based on sidebar

const DashboardHome = ({ role, name, userEmail, setSelectedPage }: { role: string; name: string; userEmail: string; setSelectedPage: React.Dispatch<React.SetStateAction<string>> }) => {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Good morning' : hours < 18 ? 'Good afternoon' : 'Good evening';

    const [shows, setShows] = useState<Show[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
                        if (!job.scheduledStartTime) return null;
                        const start = new Date(job.scheduledStartTime);
                        const end = job.scheduledEndTime ? new Date(job.scheduledEndTime) : new Date(start.getTime() + 60 * 60 * 1000);
                        return {
                            id: job.id,
                            name: job.show?.name || 'Job',
                            city: job.show?.city || '',
                            state: job.show?.state || '',
                            country: 'USA',
                            startDate: start,
                            endDate: end,
                            days: [{ date: start, startTime: format(start, 'HH:mm'), endTime: format(end, 'HH:mm'), skipped: false }],
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
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userEmail, role]);

    const upcomingShows = shows
        .filter((s) => new Date(s.endDate) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3);

    return (
        <div className='w-full pt-8 pb-28 dashboard-sm:py-8 px-6 @cm/content:px-8 @min-[550px]/content:px-10 @min-[740px]/content:px-12 space-y-4 h-full @container/home'>
            <header className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                <div>
                    <h1 className='text-4xl font-lusitana font-bold text-gray-900'>
                        {greeting}, {name.split(' ')[0]}.
                    </h1>
                    <p className='text-gray-500 font-figtree mt-1'>Here&apos;s what&apos;s happening in your stable today.</p>
                </div>
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

const BraiderView = ({ upcomingShows, jobs, setSelectedPage }: { upcomingShows: Show[]; jobs: any[]; setSelectedPage: (page: string) => void }) => {
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

const SubcontractorView = ({ upcomingShows, jobs, setSelectedPage }: { upcomingShows: Show[]; jobs: any[]; setSelectedPage: (page: string) => void }) => {
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

const ClientView = ({ upcomingShows, jobs, setSelectedPage }: { upcomingShows: Show[]; jobs: any[]; setSelectedPage: (page: string) => void }) => {
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
                    subtext={`${upcomingShows[0]?.name}${upcomingShows[0]?.type === 'job' ? ' • Job' : ''}` || 'No upcoming events'}
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

// --- Helper Components ---

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
                    <span className='flex items-center gap-1 pr-4'>
                        <Clock size={14} /> <span className='text-nowrap'>{format(new Date(show.startDate), 'h:mm a')}</span>
                    </span>
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
                    <p className='text-xs text-gray-500 font-medium'>{format(new Date(job.scheduledStartTime), 'MMM d, yyyy')}</p>
                </div>
            </div>
            <span className='font-lusitana font-bold text-lg text-amber-700 hidden @min-[360px]/home:block'>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
            </span>
            <span className='font-lusitana font-bold absolute -top-3 right-2 text-base px-3 py-0.5 rounded-full bg-amber-100 border-amber-200 shadow-sm text-amber-700 block @min-[360px]/home:hidden'>
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
