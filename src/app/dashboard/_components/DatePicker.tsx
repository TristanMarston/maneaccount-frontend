'use client';

import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { addDays, addMonths, endOfMonth, getDate, getDay, getMonth, getYear, isBefore, isEqual, startOfMonth, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

const DatePicker = ({
    onDateSelect,
    noDateBefore,
    selectedDate,
    startDateEffect = false,
    today = new Date(),
    showStartDate,
    showEndDate,
    size = 'small',
}: {
    onDateSelect: (selectedDate: Date) => void;
    noDateBefore: Date | null;
    selectedDate: Date | null;
    startDateEffect?: boolean;
    today?: Date;
    showStartDate?: Date;
    showEndDate?: Date;
    size?: 'small' | 'big';
}) => {
    const [monthSelectorOpen, setMonthSelectorOpen] = useState(false);
    const [yearSelectorOpen, setYearSelectorOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState<Date>(new Date(getYear(today), getMonth(today)));
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(currentDate));
    const [selectedYear, setSelectedYear] = useState(getYear(currentDate));
    const monthSelectorRef = useRef<HTMLDivElement>(null);
    const yearSelectorRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(monthSelectorRef, [], () => setMonthSelectorOpen(false));
    useOnClickOutside(yearSelectorRef, [], () => setYearSelectorOpen(false));
    useEffect(() => {
        if (getMonth(currentDate) !== selectedMonth || getYear(currentDate) !== selectedYear || getDate(currentDate) !== (selectedDay !== null ? selectedDay : 1)) {
            setSelectedMonth(getMonth(currentDate));
            setSelectedYear(getYear(currentDate));
            if (selectedDay !== null || (selectedDay === null && getDate(currentDate) !== 1)) setSelectedDay(getDate(currentDate));
        }
    }, [currentDate]);

    useEffect(() => {
        if (!isEqual(new Date(selectedYear, selectedMonth, selectedDay !== null ? selectedDay : 1), currentDate))
            setCurrentDate(new Date(selectedYear, selectedMonth, selectedDay !== null ? selectedDay : 1));
    }, [selectedDay, selectedMonth, selectedYear]);

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
        setSelectedDay(getDate(date));
        onDateSelect(date);
    };

    return (
        <div className='w-full h-auto p-3 rounded-xl bg-white border-[0.5px] border-gray-300 shadow-lg'>
            <div className='flex justify-between items-center'>
                <span
                    onClick={() => setCurrentDate((prev) => subMonths(prev, 1))}
                    className='w-8 h-8 rounded-lg text-gray-400 cursor-pointer bg-white hover:bg-gray-100 transition-all grid place-items-center'
                >
                    <ChevronLeft />
                </span>
                <div className='flex items-center gap-2'>
                    <motion.div animate={monthSelectorOpen ? 'open' : 'closed'} ref={monthSelectorRef} className='relative'>
                        <button
                            onClick={() => setMonthSelectorOpen((prev) => !prev)}
                            className={cn(
                                'w-18 h-auto border-[0.5px] select-none cursor-pointer border-gray-400 capitalize rounded-xl flex items-center justify-center gap-1 text-[15px]',
                                size === 'big' ? 'w-fit px-2' : ''
                            )}
                        >
                            <span className='hidden @min-[320px]/job-detail:block'>{size === 'small' ? months[selectedMonth].substring(0, 3) : months[selectedMonth]}</span>
                            <span className='block @min-[320px]/job-detail:hidden'>{months[selectedMonth].substring(0, 3)}</span>
                            <motion.span
                                initial={{ rotate: 0, transition: { duration: 0.3, type: 'spring', bounce: 0.3 } }}
                                animate={
                                    monthSelectorOpen
                                        ? { rotate: 180, transition: { duration: 0.3, type: 'spring', bounce: 0.3 } }
                                        : { rotate: 0, transition: { duration: 0.3, type: 'spring', bounce: 0.3 } }
                                }
                            >
                                <ChevronDown className='w-5 h-5' />
                            </motion.span>
                        </button>
                        <AnimatePresence>
                            {monthSelectorOpen && (
                                <motion.div
                                    initial={wrapperVariants.closed}
                                    variants={wrapperVariants}
                                    animate={monthSelectorOpen ? 'open' : 'closed'}
                                    exit='closed'
                                    style={{ originY: 'top', translateX: '-50%' }}
                                    className='flex flex-col rounded-xl px-0.5 py-0.5 bg-white absolute z-100 top-[120%] left-[50%] w-18 h-56 overflow-y-scroll overflow-hidden border-[0.5px] border-gray-300 shadow-md'
                                >
                                    {months.map((month) => (
                                        <span
                                            key={month}
                                            onClick={() => {
                                                setMonthSelectorOpen(false);
                                                setSelectedMonth(months.indexOf(month));
                                            }}
                                            className={`${
                                                months[selectedMonth] === month ? 'bg-gray-100' : 'bg-white'
                                            } capitalize rounded-lg hover:bg-gray-100 transition-all pl-3 py-0.5 cursor-pointer`}
                                        >
                                            {month.substring(0, 3)}
                                        </span>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                    <motion.div animate={yearSelectorOpen ? 'open' : 'closed'} ref={yearSelectorRef} className='relative'>
                        <button
                            onClick={() => setYearSelectorOpen((prev) => !prev)}
                            className='w-18 h-auto border-[0.5px] select-none cursor-pointer border-gray-400 capitalize rounded-xl flex items-center justify-center gap-1 text-[15px]'
                        >
                            {selectedYear}
                            <motion.span
                                initial={{ rotate: 0, transition: { duration: 0.3, type: 'spring', bounce: 0.3 } }}
                                animate={
                                    yearSelectorOpen
                                        ? { rotate: 180, transition: { duration: 0.3, type: 'spring', bounce: 0.3 } }
                                        : { rotate: 0, transition: { duration: 0.3, type: 'spring', bounce: 0.3 } }
                                }
                            >
                                <ChevronDown className='w-5 h-5' />
                            </motion.span>
                        </button>
                        <AnimatePresence>
                            {yearSelectorOpen && (
                                <motion.div
                                    initial={wrapperVariants.closed}
                                    variants={wrapperVariants}
                                    animate={yearSelectorOpen ? 'open' : 'closed'}
                                    exit='closed'
                                    style={{ originY: 'top', translateX: '-50%' }}
                                    className='flex flex-col rounded-xl px-0.5 py-0.5 bg-white absolute z-100 top-[120%] left-[50%] w-18 h-56 overflow-y-scroll overflow-hidden border-[0.5px] border-gray-300 shadow-md'
                                >
                                    {years.map((year) => (
                                        <span
                                            key={year}
                                            onClick={() => {
                                                setYearSelectorOpen(false);
                                                setSelectedYear(year);
                                            }}
                                            className={`${selectedYear === year ? 'bg-gray-100' : 'bg-white'} capitalize rounded-lg hover:bg-gray-100 transition-all pl-3 py-0.5 cursor-pointer`}
                                        >
                                            {year}
                                        </span>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
                <span
                    onClick={() => setCurrentDate((prev) => addMonths(prev, 1))}
                    className='w-8 h-8 rounded-xl text-gray-400 cursor-pointer bg-white hover:bg-gray-100 transition-all grid place-items-center'
                >
                    <ChevronRight />
                </span>
            </div>
            <div className='h-auto w-full font-figtree'>
                <div className='grid grid-cols-7 grid-rows-1 gap-y-4'>
                    {['Sunday', ...daysOfWeek.filter((day) => day !== 'Sunday')].map((day) => (
                        <span key={day} className='text-gray-400 grid place-items-center font-medium h-full select-none'>
                            {day.substring(0, 2)}
                        </span>
                    ))}
                </div>
                <CalendarElement
                    currentDate={currentDate}
                    noDateBefore={noDateBefore || today}
                    handleDateSelect={handleDateSelect}
                    selectedDate={selectedDate}
                    startDateEffect={startDateEffect}
                    showStartDate={showStartDate}
                    showEndDate={showEndDate}
                />
            </div>
        </div>
    );
};
const CalendarElement = ({
    currentDate,
    handleDateSelect,
    selectedDate,
    noDateBefore,
    startDateEffect,
    showStartDate,
    showEndDate,
}: {
    currentDate: Date;
    handleDateSelect: (date: Date) => void;
    selectedDate: Date | null;
    noDateBefore: Date;
    startDateEffect: boolean;
    showStartDate?: Date;
    showEndDate?: Date;
}) => {
    const [monthLayout, setMonthLayout] = useState<Date[][]>([]);
    const getLayout = (date: Date): Date[][] => {
        const firstOfMonth = startOfMonth(date);
        const lastOfMonth = endOfMonth(date);
        const layout: Date[][] = [];
        let iteratedDate = firstOfMonth;

        if (getDay(firstOfMonth) !== 0) {
            while (true) {
                iteratedDate = subDays(iteratedDate, 1);
                if (getDay(iteratedDate) === 0) break;
            }
        }

        let passedLastOfMonth = false;

        while (true) {
            if (layout.length === 0) layout.push([iteratedDate]);
            else if (layout[layout.length - 1].length !== 7) layout[layout.length - 1].push(iteratedDate);
            else layout.push([iteratedDate]);
            if (getDate(iteratedDate) === getDate(lastOfMonth) && getMonth(iteratedDate) === getMonth(lastOfMonth)) {
                if (getDay(lastOfMonth) === 6) break;
                else passedLastOfMonth = true;
            }
            if (passedLastOfMonth && getDay(iteratedDate) === 6) break;
            iteratedDate = addDays(iteratedDate, 1);
        }

        return layout;
    };

    useEffect(() => {
        const layout = getLayout(currentDate);
        setMonthLayout(layout);
    }, [currentDate]);

    return (
        <div className='grid grid-cols-7 gap-y-2 mt-2' style={{ gridTemplateRows: `repeat(${monthLayout.length}, minmax(0, 1fr))` }}>
            {monthLayout.map((week) =>
                week.map((day, dayIndex) => {
                    const isShowDate = showStartDate && showEndDate && day >= showStartDate && day <= showEndDate;
                    return (
                        <button
                            type='button'
                            disabled={isBefore(day, noDateBefore)}
                            key={getDate(day) + ' ' + dayIndex}
                            onClick={() => handleDateSelect(day)}
                            className={cn(
                                'disabled:pointer-events-none disabled:cursor-not-allowed grid cursor-pointer place-items-center aspect-square select-none rounded-md hover:bg-gray-100 transition-colors',
                                isEqual(noDateBefore, day) && startDateEffect
                                    ? 'text-primary border-b border-primary'
                                    : isBefore(day, noDateBefore) || getMonth(currentDate) !== getMonth(day)
                                      ? 'text-gray-300 pointer-events-none'
                                      : 'text-gray-600',
                                selectedDate !== null && isEqual(selectedDate, day)
                                    ? 'bg-primary-extra-light border-b-4 border-primary hover:bg-primary-extra-light/80'
                                    : isShowDate
                                      ? 'border border-primary/10 border-b-4 text-primary border-b-primary'
                                      : 'bg-white'
                            )}
                        >
                            {getDate(day)}
                        </button>
                    );
                })
            )}
        </div>
    );
};

const getYears = (endingYear: number) => {
    const years = [];
    for (let i = getYear(new Date()); i <= endingYear; i++) years.push(i);
    return years;
};

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const years = getYears(2035);

const wrapperVariants = {
    open: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            when: 'beforeChildren',
            staggerChildren: 0.1,
        },
    },
    closed: {
        opacity: 0,
        y: 8,
        scale: 0.95,
        transition: {
            when: 'afterChildren',
            staggerChildren: 0.1,
        },
    },
};

export default DatePicker;
