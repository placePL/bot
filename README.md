# Polish bot for r/place 2022

## Usage

1. Install Docker (https://docker.com) and nodejs (https://nodejs.org)
2. Clone the repo with `git clone https://github.com/placePL/bot`
3. Modify `src/genCompose.ts` by selecting the range of bots in `usernames.slice()`. Example: to choose bots from 50-75 type `usernames.slice(50, 75)`. Don't run more than 10-15 bots. Coordinate on Discord which usernames to choose
4. Generate the docker-compose.yaml file by typing `npm run genCompose`
5. Start the bots with `docker-compose up -d --build`
