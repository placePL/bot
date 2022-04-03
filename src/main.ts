import { config } from "dotenv";
import * as bot from './bot';
import * as sync from './sync';
import fs from 'fs';

config();

async function main() {
    const { REDDIT_USERNAME, REDDIT_PASSWORD, SERVER_URL, CHROMIUM_PATH, CHROMIUM_HEADLESS } = process.env;

    console.log('hi', CHROMIUM_PATH!);
    console.log(fs.existsSync(CHROMIUM_PATH!));

    await bot.start(
        REDDIT_USERNAME!,
        REDDIT_PASSWORD!,
        CHROMIUM_HEADLESS !== undefined,
        CHROMIUM_PATH
    );
    console.log('bot ready');
    await sync.connect(SERVER_URL!);
}

console.log(process.env.REDDIT_USERNAME)


main().catch(console.error);
