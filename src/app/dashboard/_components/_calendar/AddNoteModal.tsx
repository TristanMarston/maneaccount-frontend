'use client';

import { Trash2, X } from 'lucide-react';
import DatePicker from '../DatePicker';
import { useEffect, useState } from 'react';
import { failToast, loadingToast, successToast } from '@/app/context';
import { addCalendarNote, deleteCalendarNote, editCalendarNote } from '@/app/actions/calendar-notes';
import { CalendarNote } from './Calendar';
import { subDays } from 'date-fns';

const AddNoteModal = ({
    onClose,
    initialData,
    refresh,
    preSelectedNoteDate,
}: {
    onClose: () => void;
    initialData: CalendarNote | null;
    refresh: () => void;
    preSelectedNoteDate: Date | null;
}) => {
    const [noteData, setNoteData] = useState<{ date: Date | null; note: string }>({ date: null, note: '' });
    const [loadingAdd, setLoadingAdd] = useState(false);

    useEffect(() => {
        if (initialData && initialData.date && initialData.note) setNoteData({ date: initialData.date, note: initialData.note });
    }, [initialData]);

    useEffect(() => {
        if (preSelectedNoteDate && !initialData) setNoteData((prev) => ({ ...prev, date: preSelectedNoteDate }));
    }, [preSelectedNoteDate]);

    const createNewNote = async () => {
        setLoadingAdd(true);

        if (!noteData.date || noteData.note.trim() === '') {
            failToast('Please fill out all fields.');
            setLoadingAdd(false);
            return;
        }

        const res = await addCalendarNote(noteData.note, noteData.date);

        if (res.success) {
            refresh();
            successToast('Successfully created new note.');
            setNoteData({ date: null, note: '' });
            onClose();
        } else failToast('Unable to create note. Please try again.');

        setLoadingAdd(false);
    };

    const editNote = async () => {
        setLoadingAdd(true);

        if (!initialData) {
            failToast('Unable to edit note. Please try again.');
            setLoadingAdd(false);
            return;
        }

        if (!noteData.date || noteData.note.trim() === '') {
            failToast('Please fill out all fields.');
            setLoadingAdd(false);
            return;
        }

        const updateData: any = {};
        if (noteData.date.getTime() !== initialData.date.getTime()) updateData.date = noteData.date;
        if (noteData.note !== initialData.note) updateData.note = noteData.note;

        const res = await editCalendarNote(initialData.id, updateData);

        if (res.success) {
            refresh();
            successToast('Successfully edited note.');
            setNoteData({ date: null, note: '' });
            initialData = null;
            onClose();
        } else failToast('Unable to edit note. Please try again.');

        setLoadingAdd(false);
    };

    const deleteNote = async () => {
        const toastId = loadingToast('Deleting note...');

        if (!initialData || !initialData.id) {
            failToast('Unable to delete note.', toastId);
            return;
        }

        const res = await deleteCalendarNote(initialData.id);
        if (res.success) {
            successToast('Successfully deleted note.', toastId);
            onClose();
            refresh();
        } else failToast('Unable to delete note.', toastId);
    };

    return (
        <div className='font-figtree @container/add-note'>
            <div className='flex justify-between items-center gap-2 flex-wrap'>
                <h1 className='text-[33px] @min-[240px]/add-show:text-4xl font-lusitana font-bold text-gray-900'>{initialData ? 'Edit' : 'Write'} Note</h1>
                <div className='flex items-center gap-2'>
                    {initialData && (
                        <span title='Delete note' onClick={deleteNote}>
                            <Trash2 className='w-6 h-6 cursor-pointer text-red-400 hover:scale-105 transition-all mr-2' />
                        </span>
                    )}
                    <X className='w-6 h-6 cursor-pointer text-gray-400 hover:scale-105 transition-all mr-2' onClick={onClose} />
                </div>
            </div>
            <p className='text-gray-600'>
                {initialData ? 'Edit or delete your personal note.' : 'Add a personal note for any day in your calendar to keep your schedule and goals aligned.'}
            </p>
            <div className='grid grid-cols-1 @min-[480px]/add-note:grid-cols-2 gap-2.5 mt-3'>
                <DatePicker
                    onDateSelect={(selectedDate: Date) => setNoteData((prev) => ({ ...prev, date: selectedDate }))}
                    selectedDate={noteData.date}
                    noDateBefore={initialData?.date ? subDays(new Date(), 1) : null}
                    today={initialData?.date ? initialData.date : preSelectedNoteDate ? preSelectedNoteDate : new Date(new Date().setHours(0, 0, 0, 0))}
                    startDateEffect={false}
                    constantRows
                    className='shadow-sm'
                />
                <textarea
                    id='add-calendar-note'
                    name='add-calendar-note'
                    value={noteData.note}
                    onChange={(e) => setNoteData((prev) => ({ ...prev, note: e.target.value }))}
                    className='w-full placeholder:text-gray-400 resize-none outline-none shadow-sm border border-gray-200 px-4 pb-[7px] pt-[9px] rounded-xl focus:border-primary transition-colors h-24 @min-[480px]/add-note:h-auto'
                    placeholder={'Write your personal note...'}
                    autoCorrect='on'
                    autoComplete='on'
                    spellCheck={true}
                ></textarea>
            </div>
            <div className='grid grid-cols-1 @min-[350px]/add-note:grid-cols-2 gap-2 @min-[350px]/add-note:gap-3 mt-4'>
                <button
                    onClick={onClose}
                    className='font-figtree cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-background text-primary primary-border-hover'
                >
                    Cancel
                </button>
                <button
                    disabled={
                        initialData
                            ? loadingAdd ||
                              !noteData.date ||
                              noteData.note.trim() === '' ||
                              (initialData.date.getTime() === noteData.date.getTime() && initialData.note === noteData.note)
                            : loadingAdd || !noteData.date || noteData.note.trim() === ''
                    }
                    onClick={() => {
                        if (initialData) editNote();
                        else createNewNote();
                    }}
                    className='font-figtree disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-bold flex gap-2 justify-center items-center text-lg text-nowrap rounded-[10px] py-2 px-6 bg-primary-light text-background primary-border-hover'
                >
                    {loadingAdd ? `${initialData ? 'Editing' : 'Adding'}...` : `${initialData ? 'Edit' : 'Add'} Note`}
                </button>
            </div>
        </div>
    );
};

export default AddNoteModal;
