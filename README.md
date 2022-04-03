# Polish bot for r/place 2022

## Usage

1. Install Docker (https://docker.com)
2. Clone the repo with `git clone https://github.com/placePL/bot`
3. Ask which accounts you should use on the discord server
4. Edit `docker-compose.yaml` and change the ACCOUNTS_RANGE env variable - for example `70,100` means accounts 70-100 from the accounts.txt file
7. Start the bots with `docker-compose up -d --build`
