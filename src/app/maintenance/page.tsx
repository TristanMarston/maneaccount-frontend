'use client';

import { Pickaxe } from 'lucide-react';
import { GradientBackground } from '../_components/GradientBackground';
import { useEffect, useState } from 'react';
import Logo from '../_components/_navbar/Logo';
import { getMaintenanceStatus } from '../actions/maintenance';
import { redirect } from 'next/navigation';

const page = () => {
    const [loading, setLoading] = useState(true);
    const [maintenance, setMaintenance] = useState(false);

    useEffect(() => {
        const getStatus = async () => {
            const { maintenance: status } = await getMaintenanceStatus();
            if (status) setMaintenance(true);
            else redirect('/');

            setLoading(false);
        };

        getStatus();
    }, []);

    return (
        <GradientBackground
            gradient='from-primary-dark/50 via-primary/50 to-primary-light/50'
            className='flex flex-col items-center justify-center fixed inset-0 h-dvh overflow-hidden py-10 font-figtree'
        >
            {!loading && maintenance ? (
                <div className='bg-white rounded-2xl p-6 lg:p-8 shadow-lg font-figtree w-[90%] max-w-xl h-auto max-h-[90dvh] overflow-y-scroll flex flex-col items-center justify-center space-y-5'>
                    <div className='w-32 h-32 p-6 rounded-full bg-primary-extra-light shadow-md shadow-primary-dark'>
                        <Pickaxe className='w-full h-full text-primary' />
                    </div>
                    <h1 className='font-figtree text-4xl font-bold text-center'>Site Undergoing Maintenance</h1>
                    <p className='text-center font-figtree text-lg'>
                        We are currently doing some changes to the website and cannot ensure a pleasant experience for all users. As such, we have placed the website under maintenance
                        for the forseeable future.
                        <br />
                        <br />
                        We will be working as hard as possible to get the website up and running again. We apologize for the delay.
                    </p>
                    <div className='w-full flex justify-center'>
                        <Logo href='#' />
                    </div>
                </div>
            ) : loading ? (
                <div className='loader'></div>
            ) : (
                <></>
            )}
        </GradientBackground>
    );
};

export default page;
