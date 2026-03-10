'use client';

import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'motion/react';
import { ReactNode, useEffect, useRef, useState } from 'react';

type Page = 'landing' | 'pricing';
type Question = {
    question: string;
    answer: () => ReactNode;
};

const FAQ = ({ page }: { page: Page }) => {
    const questionsList = questions(page);
    const [questionsOpen, setQuestionsOpen] = useState<boolean[]>(new Array(questionsList.length).fill(false));

    const toggleQuestion = (index: number) => {
        setQuestionsOpen((prev) => prev.map((isOpen, i) => (i === index ? !isOpen : false)));
    };

    return (
        <div className='w-full max-w-[1080px] mt-12 flex flex-col gap-4 3xl:flex-row'>
            <div>
                <h2 className='font-lusitana font-light text-3xl text-primary leading-[1.1] xxs:text-4xl min-[390px]:text-[44px] lg:text-5xl xl:text-[54px] 3xl:text-[50px] 3xl:leading-[1.2] 4xl:text-[54px] text-center 3xl:text-left'>
                    Frequently Asked Questions
                </h2>
            </div>
            <div className='flex flex-col gap-2 font-figtree'>
                {questionsList.map((questionObject, index) => (
                    <AccordionItem key={index} questionObject={questionObject} index={index} isOpen={questionsOpen[index]} toggleQuestion={toggleQuestion} />
                ))}
            </div>
        </div>
    );
};

const AccordionItem = ({ questionObject, index, isOpen, toggleQuestion }: { questionObject: Question; index: number; isOpen: boolean; toggleQuestion: (arg0: number) => void }) => {
    const { question, answer } = questionObject;

    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState(0);

    const answerVariants: Variants = {
        closed: {
            opacity: 0,
            height: 0,
            marginTop: 0,
            marginBottom: 0,
        },
        open: {
            opacity: 1,
            height: contentHeight,
            marginTop: '8px',
            marginBottom: '8px',
        },
    };

    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, [answer]);

    return (
        <motion.div
            key={index}
            variants={borderVariants}
            animate={isOpen ? 'open' : 'closed'}
            initial='closed'
            className='border flex flex-col justify-center rounded-2xl py-2 px-2 cursor-pointer overflow-hidden'
        >
            <motion.div
                variants={hoverVariants}
                initial='unhovered'
                whileHover={isOpen ? 'unhovered' : 'hovered'}
                className='flex justify-between items-center rounded-xl py-2 px-2'
                onClick={() => toggleQuestion(index)}
            >
                <h3 className='text-lg lg:text-xl font-semibold text-gray-900'>{question}</h3>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className='w-5 h-5 text-gray-500' />
                </motion.div>
            </motion.div>

            <motion.div
                key='answer'
                ref={contentRef}
                variants={answerVariants}
                initial='closed'
                animate={isOpen ? 'open' : 'closed'}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className='text-gray-700 px-2 overflow-hidden text-base lg:text-[17px]'
            >
                {answer()}
            </motion.div>
        </motion.div>
    );
};

const borderVariants: Variants = {
    closed: {
        borderColor: 'rgba(83, 132, 117, 0)',
        transition: { duration: 0.3 },
    },
    open: {
        borderColor: 'rgba(83, 132, 117, 1)',
        transition: { duration: 0.3 },
    },
};

const hoverVariants: Variants = {
    unhovered: {
        boxShadow: '0px 0px 0px rgba(83, 132, 117, 0)',
        transition: { duration: 0.3 },
    },
    hovered: {
        boxShadow: '0px 4px 30px rgba(83, 132, 117, 0.3)',
        transition: { duration: 0.3 },
    },
};

const questions = (page: Page): Question[] => {
    if (page === 'pricing') {
        return [];
    } else if (page === 'landing') {
        return [
            {
                question: '*Do all users have to subscribe?',
                answer: () => (
                    <p className='prose prose-sm max-w-none'>
                        Nope! Barns, clients, and subcontractors of the braider do not have to subscribe to use ManeAccount. Only the braider has to subscribe to one of the plans above.
                    </p>
                ),
            },
            {
                question: 'Why is there no free option?',
                answer: () => (
                    <p className='prose prose-sm max-w-none'>
                        We believe that offering free plans can often lead to compromised quality and limited features. By focusing on paid plans, we ensure that our product remains
                        robust and reliable for all users. We do offer a 14-day free trial period for all plans.
                    </p>
                ),
            },
            {
                question: 'What payment methods do you accept?',
                answer: () => <p className='prose prose-sm max-w-none'>We accept all major credit and debit cards, including Visa, MasterCard, American Express, and Discover.</p>,
            },
            {
                question: 'What happens if I cancel my plan?',
                answer: () => (
                    <p className='prose prose-sm max-w-none'>
                        If you cancel your plan within the 14-day free trial period, you will not be charged. If you cancel after the trial period, your subscription will remain active
                        until the end of the current billing cycle, and you will not be charged for the next cycle. You can cancel your subscription at any time.
                    </p>
                ),
            },
        ];
    } else return [];
};

export default FAQ;
