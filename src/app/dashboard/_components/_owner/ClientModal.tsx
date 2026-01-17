'use client';

import React from 'react';
import { X } from 'lucide-react';
import { formatPhoneNumber } from '../_settings/Settings';

export type ClientFormData = {
    name: string;
    email: string;
    phoneNumber?: string | null;
};

export const ClientModal = ({
    type,
    handleSubmit,
    data,
    setData,
    setOpen,
    previousData,
}: {
    type: 'add' | 'edit';
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    data: ClientFormData;
    setData: React.Dispatch<React.SetStateAction<ClientFormData>>;
    setOpen: (open: boolean) => void;
    previousData?: ClientFormData;
}) => {
    return (
        <>
            <div className='@container/client font-figtree'>
                <h1 className='text-3xl @min-[250px]/client:text-4xl font-lusitana font-bold text-gray-900'>{type === 'add' ? 'Add a' : 'Edit'} Client</h1>
                <form onSubmit={handleSubmit} className='relative mt-6'>
                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Name*</label>
                            <input
                                className='w-full placeholder:text-gray-500 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='name'
                                value={data.name}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                placeholder='Jane Doe'
                                required
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Email Address*</label>
                            <input
                                type='email'
                                className='w-full placeholder:text-gray-500 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='email'
                                value={data.email}
                                onChange={(e) => setData({ ...data, email: e.target.value })}
                                placeholder='jane@example.com'
                                required
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-sm font-bold ml-1 text-gray-500 uppercase'>Phone Number</label>
                            <input
                                type='tel'
                                className='w-full placeholder:text-gray-500 outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors'
                                name='phoneNumber'
                                value={data.phoneNumber || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    setData({ ...data, phoneNumber: formatted });
                                }}
                                placeholder='(555) 123-4567'
                                maxLength={14}
                                autoCorrect='off'
                                autoComplete='off'
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    <button
                        type='submit'
                        disabled={
                            type === 'add'
                                ? data.name === '' || data.email === ''
                                : data.name === previousData?.name && data.email === previousData?.email && data.phoneNumber === previousData?.phoneNumber
                        }
                        className='disabled:opacity-50 disabled:pointer-events-none font-figtree capitalize w-full mt-8 cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                    >
                        {type} Client
                    </button>
                </form>
            </div>
            <X onClick={() => setOpen(false)} className='absolute right-6 top-6 text-gray-500 cursor-pointer hover:scale-105 transition-all' />
        </>
    );
};
