import puppeteer from 'puppeteer';
import { io } from 'socket.io-client';
import { RatelimitActiveError, sleep } from './utils';

const placeTileJsPath = 'document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > div.bottom-controls > mona-lisa-status-pill").shadowRoot.querySelector("button")';
const colorJsPath = (n: number) => `document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > mona-lisa-color-picker").shadowRoot.querySelector("div > div > div.palette  div > button[data-color='${n}']")`;
const confirmJsPath = 'document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > mona-lisa-color-picker").shadowRoot.querySelector("div > div > div.actions > button.confirm")';

class BotInstance {
    context?: puppeteer.BrowserContext;
    page?: puppeteer.Page;
    ratelimitEnd: number = Date.now();
    connected = false;

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

        let ok = false;
        while (!ok) {
            try {
                await this.login();
                ok = true;
            } catch (err) {
                this.error('failed to login: ');
                this.error(err);
            }
        }

        this.log('logged in');

        await this.connect();
    }

    async suspend() {
        await this.page?.close();
        await this.context?.close();
        this.page = undefined;
        this.context = undefined;
    }

    async login() {
        if(!this.page) return;

        await this.page.goto('https://reddit.com/login', {timeout: 0});
        await this.page.type('#loginUsername', this.username);
        await this.page.type('#loginPassword', this.password);
        await this.page.click('button[type=submit].AnimatedForm__submitButton.m-full-width');
        await this.page.waitForNavigation({timeout: 0});    
    }

    async connect() {
        if(this.connected) return;
        
        const socket = io(this.addr);
        socket.on('connect', () => {
            this.log('connected to server');
            socket.emit('ratelimitUpdate', this.ratelimitEnd);
            socket.emit('ready');
            this.connected = true;
        });
        socket.on('draw', async ({x, y, color}) => {
            this.log('drawing: ', x, y, color);

            if(!this.page) {
                this.log('recreating page...');
                this.start();
            }

            try {
                await this.draw(x, y, color).catch(() => {
                    socket.emit('ready');
                    socket.emit('ratelimitUpdate', Date.now() + (5 * 60 * 1000));
                    this.ratelimitEnd = Date.now() + (5 * 60 * 1000);
                });
                socket.emit('ready');
                await this.suspend();
            } catch(err) {
                if(err instanceof RatelimitActiveError) {
                    socket.emit('ratelimitUpdate', this.ratelimitEnd);
                }
            }
        });
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
    
        this.ratelimitEnd = Date.now() + (5 * 60 * 1000);
    }
}

export let bots: Record<string, BotInstance> = {};

export async function run(headless: boolean, browserPath: string | undefined, addr: string, usernames: string[], password: string) {
    let browser = await puppeteer.launch({
        headless: headless,
        executablePath: browserPath,
        args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--ignore-certificate-errors', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
        // args: ['-headless'],
        defaultViewport: {
            width: 1000,
            height: 800
        }
    });

    for(let u of usernames) {
        bots[u] = new BotInstance(u, password, browser, addr);
        console.log('starting ', u);
        await bots[u].start();
        await sleep(parseInt(process.env.LOGIN_INTERVAL || '1000'));
    }

    setInterval(loop, 3000);
}

async function loop() {

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
