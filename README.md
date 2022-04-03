# Polish bot for r/place 2022

## Usage

1. Clone the repo with `git clone https://github.com/placePL/bot`
2. Modify `src/genCompose.ts` by selecting the range of bots in `usernames.slice()`. Example: to choose bots from 50-75 type `usernames.slice(50, 75)`. Don't run more than 10-15 bots. Coordinate on Discord which usernames to choose
3. Start the bots with `docker-compose up --build`
