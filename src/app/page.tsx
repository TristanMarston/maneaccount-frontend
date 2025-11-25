import Features from './_components/_landing/_features/Features';
import Footer from './_components/_landing/_footer/Footer';
import Hero from './_components/_landing/_hero/Hero';
import Pricing from './_components/_landing/_pricing/Pricing';
import Solutions from './_components/_landing/_solutions/Solutions';
import Navbar from './_components/_navbar/Navbar';

const page = () => {
    return (
        <>
            <div className='w-full h-fit flex flex-col items-center'>
                <Navbar />
                <Hero />
                <Features />
                <Solutions />
                <Pricing />
                <Footer />
            </div>
        </>
    );
};

export default page;
