import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'wjlqnmtqclqpmwnldtot.supabase.co',
            },
            {
                protocol: 'https',
                hostname: 'is1-ssl.mzstatic.com',
            },
        ],
    },
};

export default nextConfig;
