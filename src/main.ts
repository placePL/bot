import { config } from "dotenv";
import * as bot from './bot';
import * as sync from './sync';
import fs from 'fs';
import path from 'path';

config();

async function main() {
    const { /* REDDIT_USERNAME, */ REDDIT_PASSWORD, ACCOUNT_RANGE, SERVER_URL, CHROMIUM_PATH, CHROMIUM_HEADLESS } = process.env;
    
    const [start, end] = ACCOUNT_RANGE?.split(',').map(x => parseInt(x)) || [];

    const f = fs.readFileSync(path.resolve('accounts.txt'));
    const str = f.toString();
    const res = [...str.matchAll(/^\d+:\r?\n?([a-zA-Z0-9-_]+)$/gm)];

    const usernames = res.map(x => x[1]).slice(start, end);

    // console.log('hi', CHROMIUM_PATH!);
    // console.log(fs.existsSync(CHROMIUM_PATH!));

    await bot.run(!!CHROMIUM_HEADLESS, CHROMIUM_PATH, SERVER_URL!, usernames, REDDIT_PASSWORD!);

    // await bot.start(
    //     REDDIT_USERNAME!,
    //     REDDIT_PASSWORD!,
    //     CHROMIUM_HEADLESS !== undefined,
    //     CHROMIUM_PATH
    // );
    // console.log('bot ready');
    // await sync.connect(SERVER_URL!);
}

console.log(process.env.REDDIT_USERNAME)


main().catch(console.error);
