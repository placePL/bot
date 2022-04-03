import puppeteer from 'puppeteer';
import { RatelimitActiveError } from './utils';

const placeTileJsPath = 'document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > div.bottom-controls > mona-lisa-status-pill").shadowRoot.querySelector("button")';
const colorJsPath = (n: number) => `document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > mona-lisa-color-picker").shadowRoot.querySelector("div > div > div.palette  div > button[data-color='${n}']")`;
const confirmJsPath = 'document.querySelector("body > mona-lisa-app > faceplate-csrf-provider > faceplate-alert-reporter > mona-lisa-embed").shadowRoot.querySelector("div > mona-lisa-share-container > mona-lisa-color-picker").shadowRoot.querySelector("div > div > div.actions > button.confirm")';


let page: puppeteer.Page;
export let ratelimitEnd = Date.now();

export async function start(username: string, password: string, headless: boolean, chromium?: string) {
    let browser = await puppeteer.launch({
        headless: headless,
        executablePath: chromium,
        args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--ignore-certificate-errors', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
        defaultViewport: {
            width: 1000,
            height: 800
        }
    });

    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36');

    let ok = false;
    while (!ok) {
        try {
            await login(username, password);
            ok = true;
        } catch (err) {
            console.error('failed to login: ');
            console.error(err);
        }
    }
}

export async function draw(x: number, y: number, color: number) {
    if (Date.now() < ratelimitEnd) {
        throw new RatelimitActiveError();
    }

    console.log(`draw (${x}, ${y}) color: ${color}`);

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

    ratelimitEnd = Date.now() + (5 * 60 * 1000);
}

async function login(username: string, password: string) {
    console.log(`Logging in as ${username}`);

    await page.goto('https://reddit.com/login');
    await page.type('#loginUsername', username);
    await page.type('#loginPassword', password);
    await page.click('button[type=submit].AnimatedForm__submitButton.m-full-width');
    await page.waitForNavigation({timeout: 0});
}
