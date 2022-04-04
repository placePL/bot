export const sleep = (t: number) => new Promise(r => setTimeout(r, t));
export class RatelimitActiveError extends Error {}

export function cordsToCanvasRelative(x: number, y: number): {x: number, y: number, canvasIndex: number} {
    let canvasX = x < 1000 ? 0 : 1;
    let canvasY = y < 1000 ? 0 : 2;

    let resX = x % 1000;
    let resY = y % 1000;

    return { x: resX, y: resY, canvasIndex: canvasX + canvasY };
}

export function sliceIntoChunks<T>(arr: T[], chunkSize: number): T[][] {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}