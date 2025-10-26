import Hero from './_components/_landing/_hero/Hero';
import Navbar from './_components/_navbar/Navbar';

const page = () => {
    return (
        <>
            <div className='w-full h-fit flex flex-col items-center'>
                <Navbar />
                <Hero />
            </div>
        </>
    );
};

export default page;
