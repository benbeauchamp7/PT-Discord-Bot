# CSCE Peer Teacher Central Discord Bot #

## Getting Started ##

### The config file ###
The `config.json` file can be edited to change whether or not chat is moderated, if temp rooms are archived by default, various folder paths, timing values, role IDs and names, and the banned chat words list. There's also an exclusion list at the bottom that will the bot will skip command checks for.

### Running Locally ###
To run from a local machine, clone the repo and run `npm install`, which should grab everything for you. Create a `.env` file in the base directory with the following keys
```
AWS_ACCESS_KEY_ID=<Your AWS Access Key>
AWS_SECRET_ACCESS_KEY=<Your AWS Secret Access Key>
BOT_TOKEN=<The bot token from discord's developer portal>
BOT_ID=<The bot's discord id>
S3_BUCKET_NAME=<The name of the amazon S3 bucket information is saved to>
TZ=<The timezone of the server, mine was America/Chicago>
TESTING=<true or false. True disables any syncing with S3 so that it can be run at the same time as production. Should be set to false in production>
PREFIX=<the prefix for commands. I used !>
```
The bot can be launched with `npm start` or `node .` from the base folder.

### Running on Heroku ###
To run on heroku, create an application. In the deploy section, select GitHub and link this repository. You may set up automatic deploys as you wish. Under the settings tab in the config vars section, add the following keys
```
AWS_ACCESS_KEY_ID=<Your AWS Access Key>
AWS_SECRET_ACCESS_KEY=<Your AWS Secret Access Key>
BOT_TOKEN=<The bot token from discord's developer portal>
BOT_ID=<The bot's discord id>
S3_BUCKET_NAME=<The name of the amazon S3 bucket information is saved to>
TZ=<The timezone of the server, mine was America/Chicago>
TESTING=<true or false. True disables any syncing with S3 so that it can be run at the same time as production. Should be set to false in production>
PREFIX=<the prefix for commands. I used !>
```
I also recommend using papertrail to save logs for you, which can be installed as an add-on to the heroku application. You can set it up with your AWS s3 bucket so you can keep logs over a few months time.

## To the next developer ##

### Directory Structure ###
`art_assets/`: Where I put pictures for emotes, profile pictures, and other assets the bot may need.  
`commands/`: Where all the commands a user can use go.  
`custom_modules/`: Modules with functions many commands benefit from.  
`logs/`: Where `logger.~` commands store their output. If running locally, all logs and errors are stored in this folder. If running on heroku, the folder is cleared on reboot (which is why I recommend papertrail).  
`persistantData/`: The queue's csv file is stored in this folder so that, if the bot goes down, it can load the csv and nobody loses their spot in the queue.  

### Adding Commands ###
To add a command, you can add a `.js` file to the `commands/` directory and the next time you boot the bot the command will automatically be registered.

#### Text Commands ####
Each text-based command must export an object with a name field, description field, and an async function `execute` that takes 3 parameters. The message that invoked the command, an array of arguments which is the message's content split by spaces, and an options argument which contains various data from `index.js`. Commands that fail should throw a `CommandError` with two parameters, the first being a short reason why the error happened (like someone using `/dq` while they're not in a queue), and the second parameter being a string representing who caused the error (typically message.author); Successful commands should return true;

#### Slash Commands ####
Each slash command must export an object with a name field, description field, a list named slashes who's elements are `SlashCommandBuilder` objects, and a permissions object with elements corresponding to the name field of the `SlashCommandBuilder`. Each of these named objects consists of a `permissions` field to submit to the Discord API. Commands are disabled for everyone by default, so if the permissions field is left empty, the command will be disabled but will still be registered and visible. The slash command must also export an async function `executeInteraction` which takes an interaction and "data" as parameters, where data is an object with various information from `index.js`.

### index.js ###
When I started the bot, I'd never used JavaScript before. This is the file that suffered the most. The index's job is to serve as the glue for all of the commands. From top to bottom, we have imports, followed by a loop that prepares all of the slash commands for registration with the API and loads all the text-based commands into a map. There are a few helper functions, followed by bot triggers.

#### bot.on ready ####
Registers slash commands prepared earlier through REST, then loads queues from either the local file or S3 depending on if testing is true in the config file. If not in testing mode, temp channels are given expiry timers, and the current log file is loaded.

#### bot.on Voice State Update ####
Implements the "Click to Create a Channel" functionality along with a cooldown to prevent spam creating channels.

#### bot.on channel create ####
Adds a timer to newly created temp channels.

#### bot.on message create ####
Checks the message for any banned words (can be disabled in the config file), and then dispatches the correct command if the prefix is used. It also checks for good bot/bad bot.

#### bot.on interaction create ####
Captures command interactions and calls the appropriate command file.

#### process triggers ####
Catch various signals such as SIGINT and SIGTERM to shut down gracefully locally and on heroku. At the bottom, there's also a cronjob that will reboot the bot and reset the queue at a set time every day.