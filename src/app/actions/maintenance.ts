'use server';

export async function getMaintenanceStatus(): Promise<{ maintenance: boolean }> {
    const maintenanceValue = process.env.MAINTENANCE_MODE;
    if (maintenanceValue === undefined || maintenanceValue === null) return { maintenance: false };

    return { maintenance: maintenanceValue === 'true' };
}
