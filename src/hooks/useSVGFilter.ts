'use client';
import { useEffect } from 'react';
import { Color, Solver } from '@/lib/svg-filter';

function hexToRgb(hex: string) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((x) => x + x)
            .join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

export function useSVGFilter(hexColor: string) {
    if (!hexColor) return undefined;

    const { r, g, b } = hexToRgb(hexColor);
    const color = new Color(r, g, b);
    const solver = new Solver(color);
    const result = solver.solve();

    console.log(result.filter);

    const hueRotate = result.filter.substring(result.filter.indexOf('hue-rotate(') + 11, result.filter.indexOf(') brightness'));
    return {
        invert: Math.round(result.values[0]),
        sepia: Math.round(result.values[1]),
        saturate: Math.round(result.values[2]),
        hueRotate,
        brightness: Math.round(result.values[4]),
        contrast: Math.round(result.values[5]),
    };
}

// {
//     "values": [
//         24.205893845209975,
//         15.210774079821315,
//         2950.5761490532873,
//         33.384495564322286,
//         91.76502326466972,
//         103.26413207776834
//     ],
//     "loss": 7.526985403142627,
//     "filter": "filter: invert(24%) sepia(15%) saturate(2951%) hue-rotate(120deg) brightness(92%) contrast(103%);"
// }
