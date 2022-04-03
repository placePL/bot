import fs from 'fs';
import path from 'path';

const pass = 'KPjS-W46NgrQiyb';

const file = `
version: '3.4'
services:
`;

const template = (n: number, username: string, password: string) => `
    bot${n}:
        image: rplacebot
        build:
            context: .
        environment:
            - REDDIT_USERNAME=${username}
            - REDDIT_PASSWORD=${password}
            - SERVER_URL=https://rplace.cubepotato.eu
            - CHROMIUM_HEADLESS=true
`

async function main() {
    const f = fs.readFileSync(path.resolve('accounts.txt'));
    const str = f.toString();
    const res = [...str.matchAll(/^\d+:\r?\n?([a-zA-Z0-9-_]+)$/gm)];

    const usernames = res.map(x => x[1]);
    
    console.log(file);
    console.log(usernames.slice(-10).map((x, i) => template(i, x, pass)).join('\n'));
}

main();