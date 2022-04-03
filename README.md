# Polish bot for r/place 2022

## Usage

1. Install Docker (https://docker.com) and nodejs (https://nodejs.org)
2. Clone the repo with `git clone https://github.com/placePL/bot`
3. Ask which accounts you should use on the discord server
4. Install yarn (`npm i -g yarn`) and restore all dependencies by typing `yarn`
5. Generate the docker-compose.yaml file by typing `yarn genCompose <start>,<end>`
    * example: `yarn genCompose 10,20` to choose accounts 10-20
    * example: `yarn genCompose -5` to choose last 5 accounts
6. Start the bots with `docker-compose up -d --build`
