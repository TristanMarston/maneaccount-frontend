import { MapPin, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns-tz';

export const ViewShowDetailsModal = ({
    show,
    setShowDetailsModal,
    onSelect,
}: {
    show: any;
    setShowDetailsModal: React.Dispatch<React.SetStateAction<{ open: boolean; show: any; onSelect: () => void }>>;
    onSelect: () => void;
}) => {
    return (
        <div>
            <div className='p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50'>
                <div className='min-w-0'>
                    <h3 className='text-2xl font-bold font-lusitana text-gray-900 truncate'>{show.name}</h3>
                    <div className='flex items-center gap-2 mt-1 text-sm text-gray-500 font-figtree'>
                        <MapPin size={14} className='text-primary flex-none' />
                        <span className='truncate'>
                            {show.city}, {show.state || show.country}
                        </span>
                    </div>
                </div>
                <X
                    onClick={() => setShowDetailsModal(() => ({ open: false, show: null, onSelect: () => {} }))}
                    className='text-gray-500 min-w-6 cursor-pointer hover:scale-105 transition-all'
                />
            </div>
            <div className='p-5 font-figtree space-y-4'>
                <div className='flex items-center gap-3 p-3 bg-primary-extra-light/50 rounded-xl border border-primary/10'>
                    <div className='p-2 bg-white rounded-lg shadow-sm text-primary'>
                        <CalendarIcon size={18} />
                    </div>
                    <div>
                        <p className='text-xs font-bold text-primary uppercase tracking-wide'>Dates</p>
                        <p className='text-sm font-medium text-gray-900'>
                            {format(new Date(show.startDate), 'MMM d')} - {format(new Date(show.endDate), 'MMM d, yyyy')}
                        </p>
                    </div>
                </div>

                <div className='grid grid-cols-2 items-center gap-2 mt-2 font-figtree'>
                    <button
                        onClick={() => setShowDetailsModal(() => ({ open: false, show: null, onSelect: () => {} }))}
                        className='primary-border-hover bg-background text-primary text-[15px] font-bold px-1 py-1.5 rounded-[10px] cursor-pointer'
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onSelect();
                            setShowDetailsModal(() => ({ open: false, show: null, onSelect: () => {} }));
                        }}
                        className='primary-border-hover bg-primary-light text-background text-[15px] font-bold px-1 py-1.5 rounded-[10px] cursor-pointer'
                    >
                        Select
                    </button>
                </div>
            </div>
        </div>
    );
};
