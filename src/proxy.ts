import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname.startsWith('/maintenance')) return;
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) return;

    if (process.env.MAINTENANCE_MODE === 'true') {
        const cookieStore = await cookies();
        const maintenanceCode = cookieStore.get('maintenance_code');
        if (process.env.MAINTENANCE_MODE_BYPASS_CODE && maintenanceCode?.value === process.env.MAINTENANCE_MODE_BYPASS_CODE) return;

        return NextResponse.redirect(new URL('/maintenance', request.url));
    }
}

export const config = {
    matcher: '/:path*',
};
