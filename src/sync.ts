import { io } from 'socket.io-client';
import { draw, ratelimitEnd } from './bot';
import { RatelimitActiveError } from './utils';

export async function connect(addr: string) {
    const socket = io(addr);
    socket.on('connect', () => {
        console.log('connected to server');
        socket.emit('ratelimitUpdate', ratelimitEnd);
        socket.emit('ready');
    });
    socket.on('draw', async ({x, y, color}) => {
        try {
            console.log('drawing: ', x, y, color);
            await draw(x, y, color).catch(() => {
                socket.emit('ready');
                socket.emit('ratelimitUpdate', Date.now() + (5 * 60 * 1000));
            });
            socket.emit('ready');
        } catch(err) {
            if(err instanceof RatelimitActiveError) {
                socket.emit('ratelimitUpdate', ratelimitEnd);
            }
        }
    });
}