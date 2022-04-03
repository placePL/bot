# Polish bot for r/place 2022

## Usage

1. Install Docker (https://docker.com) and nodejs (https://nodejs.org)
2. Clone the repo with `git clone https://github.com/placePL/bot`
3. Ask which accounts you should use on the discord server
4. Generate the docker-compose.yaml file by typing `npm run genCompose <start>-<end>` - for example: `npm run genCompose 10-20` to choose accounts 10-20
5. Start the bots with `docker-compose up -d --build`
