'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { toCalendarDateUTC } from '@/lib/date-utils';

export async function getCalendarNotes() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const notes = await prisma.calendarNote.findMany({ where: { userId: session.user.id } });

        return notes;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function addCalendarNote(note: string, date: Date) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    try {
        await prisma.calendarNote.create({ data: { note, date: toCalendarDateUTC(date), userId: session.user.id } });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Unable to create calendar note' };
    }
}

export async function editCalendarNote(noteId: string, data: { note?: string; date?: Date }) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    try {
        if (!data.note && !data.date) return { error: 'No fields to update' };
        if (data.date) data.date = toCalendarDateUTC(data.date);

        await prisma.calendarNote.update({ where: { id: noteId }, data });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Unable to edit calendar note' };
    }
}

export async function deleteCalendarNote(noteId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    try {
        await prisma.calendarNote.delete({ where: { id: noteId } });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: 'Unable to delete calendar note' };
    }
}
