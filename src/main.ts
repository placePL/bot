import { config } from "dotenv";
import * as bot from './bot';
import * as sync from './sync';

config();

async function main() {
    const { REDDIT_USERNAME, REDDIT_PASSWORD, SERVER_URL, CHROMIUM_PATH, CHROMIUM_HEADLESS } = process.env;
    await bot.start(
        REDDIT_USERNAME!,
        REDDIT_PASSWORD!,
        CHROMIUM_HEADLESS !== undefined,
        CHROMIUM_PATH!
    );
    console.log('bot ready');
    await sync.connect(SERVER_URL!);
}


main().catch(console.error);
