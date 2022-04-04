import puppeteerExtra from 'puppeteer-extra';
import puppeteer from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { io, Socket } from 'socket.io-client';
import { cordsToCanvasRelative, RatelimitActiveError, sleep, sliceIntoChunks } from './utils';
import axios from 'axios';

const placeTileJsPath = 'document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > div.bottom-controls > mona-lisa-status-pill").shadowRoot.querySelector("button")';
const colorJsPath = (n: number) => `document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > mona-lisa-color-picker").shadowRoot.querySelector("div > div > div.palette  div > button[data-color='${n}']")`;
const confirmJsPath = 'document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > mona-lisa-color-picker").shadowRoot.querySelector("div > div > div.actions > button.confirm")';

puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(AdblockerPlugin({ blockTrackers: true }));

class BotInstance {
    context?: puppeteer.BrowserContext;
    page?: puppeteer.Page;
    ratelimitEnd: number = Date.now();
    connected = false;
    socket?: Socket;
    authHeader?: string;

    constructor(private username: string, private password: string, private browser: puppeteer.Browser, private addr: string) {

    }

    log(...args: any[]) {
        console.log(`[${this.username}]`, ...args);
    }

    error(...args: any[]) {
        console.error(`[${this.username}]`, ...args);
    }


    async start() {
        this.context = await this.browser.createIncognitoBrowserContext();
        this.page = await this.context.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36');
        await this.page.setRequestInterception(true);

        this.page.on('request', async (request) => {
            const auth = request.headers()['authorization'];
            if (auth) {
                this.authHeader = auth;
            }
        });


        let retries = 0;
        let ok = false;
        while (!ok && retries <= 2) {
            try {
                await this.login();
                ok = true;
            } catch (err) {
                this.error('failed to login: ');
                this.error(err);
                retries++;
            }
        }

        this.log('logged in', this.authHeader);

        await this.connect();
    }

    async suspend() {
        this.log('suspending');
        await this.page?.close();
        await this.context?.close();
        this.page = undefined;
        this.context = undefined;
    }

    async login() {
        if (!this.page) return;

        await this.page.goto('https://reddit.com/login', { timeout: 10000 });
        await this.page.type('#loginUsername', this.username);
        await this.page.type('#loginPassword', this.password);
        await this.page.click('button[type=submit].AnimatedForm__submitButton.m-full-width');
        await this.page.waitForNavigation({ timeout: 20000 });
    }

    async connect() {
        if (this.connected) return;

        const socket = io(this.addr);
        this.socket = socket;
        socket.on('connect', () => {
            this.log('connected to server');
            socket.emit('ratelimitUpdate', this.ratelimitEnd);
            socket.emit('ready');
            this.connected = true;
        });
        socket.on('draw', async ({ x, y, color }) => {
            this.log('drawing: ', x, y, color);

            // if (!this.page) {
            //     this.log('recreating page...');
            //     this.start();
            // }

            try {
                // await this.draw(x, y, color).catch(() => {
                //     socket.emit('ready');
                //     this.ratelimitEnd = Date.now() + (5 * 60 * 1000) + 500;
                //     socket.emit('ratelimitUpdate', this.ratelimitEnd);
                // });
                this.ratelimitEnd = await this.draw2(x, y, color);
                socket.emit('ratelimitUpdate', this.ratelimitEnd)
                socket.emit('ready');
                await sleep(20000);
                await this.suspend();
            } catch (err) {
                this.error(err);
                if (err instanceof RatelimitActiveError) {
                    socket.emit('ratelimitUpdate', this.ratelimitEnd);
                }
            }
        });
    }

    async draw2(x: number, y: number, color: number): Promise<number> {

        const cords = cordsToCanvasRelative(x, y);

        const res = await axios.post('https://gql-realtime-2.reddit.com/query', {
            "operationName": "setPixel",
            "variables": {
                "input": {
                    "actionName": "r/replace:set_pixel",
                    "PixelMessageData": {
                        "coordinate": {
                            "x": cords.x,
                            "y": cords.y
                        },
                        "colorIndex": color,
                        "canvasIndex": cords.canvasIndex
                    }
                }
            },
            "query": "mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
        },
            {
                headers: {
                    "accept": "*/*",
                    "accept-encoding": "gzip, deflate, br",
                    "accept-language": "pl-PL,pl;q=0.9",
                    "apollographql-client-name": "mona-lisa",
                    "apollographql-client-version": "0.0.1",
                    "authorization": this.authHeader!,
                    "content-type": "application/json",
                    "origin": "https://hot-potato.reddit.com",
                    "referer": "https://hot-potato.reddit.com/",
                    "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"99\", \"Opera\";v=\"85\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 OPR/85.0.4341.47"
                },
            });

        const defaultRl = Date.now() + (5 * 60 * 1000) + 1000;;

        const rl = res?.data?.errors?.find((err: any) => err?.message?.startsWith('ratelimit hit'));
        if(!rl) return defaultRl;

        const match = (rl.message as string).match(/ratelimit hit, next available: (?<timestamp>\d+)/);
        const timestamp = match?.groups!['timestamp'];
        return timestamp ? parseInt(timestamp) : defaultRl;
    }

    async draw(x: number, y: number, color: number) {
        if (Date.now() < this.ratelimitEnd) {
            throw new RatelimitActiveError();
        }

        const page = this.page!;

        await page.goto(`https://www.reddit.com/r/place/?cx=${x}&cy=${y}`);
        await page.waitForSelector('.moeaZEzC0AbAvmDwN22Ma');
        await page.click('.moeaZEzC0AbAvmDwN22Ma');

        const elementHandle = await page.waitForSelector('iframe.Q-OBKuePQXXm3LGhGfv3k');
        const frame = (await elementHandle!.contentFrame())!;

        await page.waitForTimeout(1000);

        const placeTileBtn = await (await frame.evaluateHandle(placeTileJsPath)).asElement()!;
        await placeTileBtn.evaluate(x => (x as HTMLButtonElement).click());

        await page.waitForTimeout(1000);

        const colorEl = (await frame.evaluateHandle(colorJsPath(color))).asElement()!;
        await colorEl.evaluate(x => (x as HTMLButtonElement).click());

        await page.waitForTimeout(2000);

        const confirmEl = (await frame.evaluateHandle(confirmJsPath)).asElement()!;
        await confirmEl.evaluate(x => (x as HTMLButtonElement).click());

        frame.waitForSelector('faceplate-toast').then(async (x) => {
            const res = await x?.evaluate(a => (a as HTMLElement).innerText);
            this.error('sth went wrong:', res);
        }).catch(() => null);

        this.ratelimitEnd = Date.now() + (5 * 60 * 1000);
    }
}

export let bots: Record<string, BotInstance> = {};

export async function run(headless: boolean, browserPath: string | undefined, addr: string, usernames: string[], password: string) {
    let browser = await puppeteerExtra.launch({
        headless: headless,
        executablePath: browserPath,
        args: ['--disable-gpu',
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--ignore-certificate-errors',
            '--disable-web-security',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials',
            '--remote-debugging-port=9222',
            '--remote-debugging-address=0.0.0.0',
        ],
        // args: ['-headless'],
        defaultViewport: {
            width: 1000,
            height: 800
        }
    });
    // await sleep(30000000);

    console.log('got', usernames.length, 'accounts');

    const parallelLogins = parseInt(process.env.PARALLEL_LOGINS || '2');
    const perChunk = Math.floor(usernames.length / parallelLogins);

    const chunks = sliceIntoChunks(usernames, perChunk);
    
    for(let chunk of chunks) {
        (async function() {
            for (let u of chunk) {
                bots[u] = new BotInstance(u, password, browser, addr);
                console.log('starting', u);
                try {
                    await bots[u].start();
                } catch(err) {
                    console.log('failed to start', u);
                    console.error(err);
                }
                await sleep(parseInt(process.env.LOGIN_INTERVAL || '1000'));
            }        
        })();
    }
}

// let page: puppeteer.Page;
// export let ratelimitEnd = Date.now();

// export async function start(username: string, password: string, headless: boolean, chromium?: string) {
//     let browser = await puppeteer.launch({
//         headless: headless,
//         executablePath: chromium,
//         // args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--ignore-certificate-errors', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
//         args: ['-headless'],
//         defaultViewport: {
//             width: 1000,
//             height: 800
//         }
//     });

//     page = await browser.newPage();
//     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36');

//     let ok = false;
//     while (!ok) {
//         try {
//             await login(username, password);
//             ok = true;
//         } catch (err) {
//             console.error('failed to login: ');
//             console.error(err);
//         }
//     }
// }

// export async function draw(x: number, y: number, color: number) {
//     if (Date.now() < ratelimitEnd) {
//         throw new RatelimitActiveError();
//     }

//     console.log(`draw (${x}, ${y}) color: ${color}`);

//     await page.goto(`https://www.reddit.com/r/place/?cx=${x}&cy=${y}`);
//     await page.waitForSelector('.moeaZEzC0AbAvmDwN22Ma');
//     await page.click('.moeaZEzC0AbAvmDwN22Ma');

//     const elementHandle = await page.waitForSelector('iframe.Q-OBKuePQXXm3LGhGfv3k');
//     const frame = (await elementHandle!.contentFrame())!;

//     await page.waitForTimeout(1000);

//     const placeTileBtn = await (await frame.evaluateHandle(placeTileJsPath)).asElement()!;
//     await placeTileBtn.evaluate(x => (x as HTMLButtonElement).click());

//     await page.waitForTimeout(1000);

//     const colorEl = (await frame.evaluateHandle(colorJsPath(color))).asElement()!;
//     await colorEl.evaluate(x => (x as HTMLButtonElement).click());

//     await page.waitForTimeout(2000);

//     const confirmEl = (await frame.evaluateHandle(confirmJsPath)).asElement()!;
//     await confirmEl.evaluate(x => (x as HTMLButtonElement).click());

//     ratelimitEnd = Date.now() + (5 * 60 * 1000);
// }

// async function login(username: string, password: string) {
//     console.log(`Logging in as ${username}`);

//     await page.goto('https://reddit.com/login');
//     await page.type('#loginUsername', username);
//     await page.type('#loginPassword', password);
//     await page.click('button[type=submit].AnimatedForm__submitButton.m-full-width');
//     await page.waitForNavigation({timeout: 0});
// }
