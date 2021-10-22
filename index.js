// Require discord dependency and create the 'bot' object
const Discord = require('discord.js');
const bot = new Discord.Client({ partials: ['REACTION'], intents: 641 });

const fs = require('fs');

// For .env variables
const dotenv = require('dotenv');
dotenv.config();

// Scheduler to reboot the bot every night for a new Heroku dyno and to save files to s3
// import schedule from 'node-schedule'
const schedule = require('node-schedule')

// Get audit logger
const logger = require('./custom_modules/logging.js');
const save = require('./custom_modules/save.js');
const replies = require('./custom_modules/replies.js');
const CommandError = require('./custom_modules/commandError.js');
const common = require('./custom_modules/common.js')

// Banned word list sourced from http://www.bannedwordlist.com/lists/swearWords.txt
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const timeout = config['bot-alert-timeout'];
const bannedChatWords = config['banned-chat-words'];
const prefix = process.env.PREFIX
const doModChat = config['do-moderate-chat'];
const otherCommands = config['other-commands'];

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const rest = new REST({version: '9'}).setToken(process.env.BOT_TOKEN);

// Imports all the commands from the commands folder
bot.commands = new Discord.Collection();
const commandList = [];
const permsList = [];
const permsDict = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    // Include command files
    const command = require(`./commands/${file}`);
    if (command.slashes) {
        for (const scmd of command.slashes) {
            let jsoncmd = scmd.toJSON();
            jsoncmd['default_permission'] = false;
            commandList.push(jsoncmd);
        }
        
        for (const [key, val] of Object.entries(command.permissions)) {
            permsDict.set(key, val)
        }
    }
    bot.commands.set(command.name, command);
}

// Handles automatic cleanup of channels
let intervalMap = new Map();
let warnMap = new Map();

// Holds most recent !vq for each channel so that the next !vq deletes the previous
let activeVQs = new Map();

// Tracks users on cooldown from making rooms (Prevents spam creating rooms)
let cooldownUsers = new Map();

// Contains the queue system in the form {course -> [queue]}
let queues = new Map();

let updateQueues = {};
updateQueues.val = false;

// Adds an inactivity timer to a chat room
function addChanInterval(categoryChannel) {
    // Reset the timer
    warnMap.set(categoryChannel.id, null);

    // Create timer and store in intervalMap, accessible by the channelID
    const intervalID = setInterval(checkChanTimeout, config['room-inactivity-update'], categoryChannel);
    intervalMap.set(categoryChannel.id, intervalID);

    logger.log(`Timer added`, `#${categoryChannel.name}`);
}

// Checks time remaining until a chat room is deleted for inactivity
// Issues a 5 minute warning before deletion, and cancels the warning if a messages is detected
async function checkChanTimeout(categoryChannel) {

    // Get the channels from the student category
    let textChan = undefined;
    let voiceChanCount = 0;
    for (const chan of categoryChannel.children) {
        if (chan[1].type == 'GUILD_TEXT') {
            textChan = chan[1];
        } else if (chan[1].type == 'GUILD_VOICE') {
            voiceChanCount += chan[1].members.size;
        }
    }
    
    // Grabs the last message of a channel
    let last = await textChan.messages.fetch({limit: 1});
    last = last.first();

    // Check for both regular and sticky channels that are out of time.
    if ( (textChan.parent.name.endsWith(config["student-chan-specifier"]) && last.createdAt.getTime() + config['text-room-timeout'] < Date.now())
    ||  (textChan.parent.name.endsWith(config["sticky-chan-specifier"]) && last.createdAt.getTime() + config['sticky-room-timeout'] < Date.now()) ) {

        // And if the voice channel is also empty...
        if (voiceChanCount === 0) {

            // Begin countdown to channel deletion
            if (warnMap.get(categoryChannel.id) === null) {
                const tID = setTimeout(() => {
                    // Use the end command to erase the channel when time is up
                    textChan.send("Channel inactive, deleting...").then(deleteMessage => {
                        bot.commands.get("end").execute(deleteMessage, '', { intervalMap: intervalMap });
                        warnMap.delete(categoryChannel.id);
                        logger.log(`Channel deleted`, `#${categoryChannel.name}`);
                    });
                }, config['text-room-timeout-afterwarning']);

                // Save the timeout in warnMap so it can be cleared later
                warnMap.set(categoryChannel.id, tID);
                textChan.send(`This chat will be deleted in ${config['text-room-timeout-afterwarning'] / 1000 / 60} minutes due to inactivity. Say something to delay the timer!`)
                logger.log(`Inactivity warning`, `#${categoryChannel.name}`);
            }

            // Local message collector to reset inactivity
            const collector = new Discord.MessageCollector(textChan, response => !response.author.bot, {"time": config['text-room-timeout-afterwarning']})
            collector.on('collect', reply => {
                // Activity detected, cancel countdown
                clearTimeout(warnMap.get(categoryChannel.id));
                warnMap.set(categoryChannel.id, null);
            });
        }
    }
}

function isOnCooldown(userID) {
    // Take member of cooldown if enough time has passed (unless it's me)
    if (cooldownUsers.has(userID) && ((cooldownUsers.get(userID) + config['channel-create-cooldown'] < Date.now()) || userID === '335481074236915712')) {
        cooldownUsers.delete(userID);
    }

    return cooldownUsers.has(userID);
}

// Runs when the bot is booted up from an off state
bot.on('ready', async () => {

    // Ping console when bot is ready
    logger.log("Bot Ready", "none");

    // Registers slash commands

    try {
        logger.log('Refreshing application commands...', "none");
        
        rest.put(
            Routes.applicationGuildCommands(process.env.BOT_ID, config['guildId']),
            { body: commandList }
        ).then(response => {
            let cname;
            try {
                for (const command of response) { /// Get ids from the commands to set permissions
                    cname = command['name'];
                    permsDict.get(command['name'])['id'] = command['id']
                    permsList.push({
                        id: command['id'],
                        permissions: permsDict.get(command['name'])['permissions']
                    })
                }
            } catch (err) {
                console.log(err);
                logger.log(`ERROR in ready for command ${cname}`, 'ERROR');
            }
                

            bot.guilds.fetch('731645274807599225').then(rep => { /// Set permissions for the commands
                rep.commands.permissions.set({fullPermissions: permsList }).then(() => {
                    logger.log('Done refreshing application commands!', 'none');
                }).catch(err => {console.log(err)});
            })
        })
    } catch (err) {
        logger.logError(err)
    }

    
    // Initialize the queue map
    for (course of config['course-channels']) {
        queues.set(course, []);
    }

    // Test specific setup
    if (process.env.TESTING == 'true') {
        queues = save.loadQueueLocalOnly();
        
        logger.log("Queue ready from local", "none");

        return;
    }
    
    // Scan for student channels to begin inactivity timers
    for (const chan of bot.channels.cache) {
        // If student category
        if (chan[1] instanceof Discord.CategoryChannel && (chan[1].name.endsWith(config['student-chan-specifier'] || chan[1].name.endsWith(config['sticky-chan-specifier'])))) {
            // Create interval for the channels
            addChanInterval(chan[1]);
            
        } else if (chan[1] instanceof Discord.TextChannel && chan[1].name.endsWith('-archived')) {
            // Add an archive timer that deletes archived channels after a configurable time
            bot.commands.get('end').addArchiveInterval(chan[1], intervalMap);
        }
    }
    // Grab log file from s3 (if we had made one before)
    save.loadLog();

    // Loads queues from a saved file
    queues = await save.loadQueue();
    
    console.log('Queue Ready!');
    logger.log("Queue Ready", "none");

});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    // Click to create room functionality
    const channelJoined = newMember.channelID;
    const channelLeft = oldMember.channelID;
    const user = newMember.member

    // If the user leaves a channel, do nothing (if not cycle)
    if (channelJoined === null || channelJoined === undefined) { return; }

    if (channelJoined == config['click-to-join-id']) {
        // If the user isn't on cooldown for creating a room
        if (!isOnCooldown(user.id)) {
            bot.channels.fetch(config['bot-channel-id']).then(chan => {
                // Send a dummy message into the bot-channel as an anchor
                chan.send('Creating Channel...').then(msg => {
                    const options = {
                        bot: bot,
                        user: user,
                        cooldown: cooldownUsers,
                        auto: true
                    }

                    bot.commands.get("create").execute(msg, '', options);
                    msg.delete();

                    // Give the user a room creation cooldown
                    cooldownUsers.set(user.id, Date.now());

                });
                logger.log("Channel Created (VC)", `<@${user.id}>`)
            });
        } else {
            user.voice.setChannel(config['cooldown-channel-id']);
            logger.log("cooldown hit (VC)", `<@${user.id}>`)
        }
    } else if (warnMap.has(newMember.channel.parentID)) {
        // If a channel was about to be deleted for inactivity when someone joined, clear the timer so it isn't deleted while someone is in the VC
        clearTimeout(warnMap.get(newMember.channel.parentID));
        warnMap.set(newMember.channel.parentID, null);
    }
});

// Add delete intervals to newly created student channels and archive channels
bot.on('channelCreate', chan => {
    if (chan instanceof Discord.CategoryChannel && (chan.name.endsWith(config['student-chan-specifier'] || chan.name.endsWith(config['sticky-chan-specifier'])))) {
        console.log(`Timer added to "${chan.name}"`)
        addChanInterval(chan);
    } else if (chan instanceof Discord.TextChannel && chan.name.endsWith('-archived')) {
        
        bot.commands.get('end').addArchiveInterval(chan, intervalMap);
    }
});

// Clean up timers on student channels when removed
bot.on('channelDelete', chan => {
    if (intervalMap.has(chan.id)) {
        console.log(`Timer deleted from "#${chan.name}"`)
        logger.log("timer deleted", `#${chan.name}`)

        clearInterval(intervalMap.get(chan.id));
        intervalMap.delete(chan.id);
    }
});

// Handle message commands
bot.on('messageCreate', msg => {
    // Prevent recursion
    if (msg.author.bot) { return; }
    
    // Message into words as args, grab first word as command
    const args = msg.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    // Basic chat moderation
    var badWordFound = false;
    if (doModChat) {

        for (const badWord of bannedChatWords) {

            // If the message contained a banned word, exit the loop
            if (badWordFound) { break; }

            for (const userWord of msg.content.split(' ')) {
                // Scan for bad language word by word
                if (badWord == userWord.toLowerCase()) {

                    // Respond with a warning
                    const modReplies = config["chat-moderation-messages"];
                    const selected = modReplies[Math.floor(Math.random() * modReplies.length)];

                    msg.reply(selected).then(reply => {
                        setTimeout(() => { reply.delete(); }, timeout);
                        setTimeout(() => { msg.delete(); }, 0);
                    });

                    console.log(`blocked ${msg.content}`, `${msg.author}`);

                    badWordFound = true;
                    break;
                }
            }
        }
    }

    // Command handler
    if (msg.content.startsWith(prefix) && !badWordFound) {
        try {
            // Just a conglomeration of stuff the commands might need to execute
            const options = {
                bot: bot,
                intervalMap: intervalMap,
                user: msg.author,
                cooldown: cooldownUsers, 
                queues: queues,
                activeVQs: activeVQs,
                updateQueues: updateQueues
            }
            
            isOnCooldown(msg.author.id); // Update channel creation cooldown

            bot.commands.get(command).execute(msg, args, options).then(didSucceed => {
                // Add a cooldown for users who created a room
                if (didSucceed && command === "create") {
                    cooldownUsers.set(msg.author.id, Date.now());
                }

                msg.reply(`The bot now prefers slash commands! Use /${command} instead next time! (Some commands may be named differently)`);
            }).catch(err => {
                if (err instanceof CommandError) {
                    // Catch CommandErrors as user errors
                    logger.log(err.message, err.user)
                } else {
                    // Catch other errors as programming errors
                    logger.logError(err);
                }
                
            });

        } catch (err) {

            // Catch invalid commands
            if (!otherCommands.includes(command)) {
                replies.timedReply(msg, 'You have written an invalid command, maybe you made a typo?', config['bot-alert-timeout']);

                logger.log(`ERROR: base error thrown CONTENT:${msg.content} |||| CHAN:#${msg.channel.name}`, `${msg.author}`);
            }
        }
    } else if (msg.content.toLowerCase() == 'good bot' || msg.content.toLowerCase() == 'good bot!') {
        msg.channel.send('\:D')
    } else if (msg.content.toLowerCase() == 'bad bot' || msg.content.toLowerCase() == 'bad bot!') {
        msg.channel.send('\:\'(')
    }
    
});

// Handle interaction commands
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = bot.commands.get(interaction.commandName);
    
    if (!command) {
        await interaction.reply({content: "You have written an invalid command, maybe you made a typo?", ephemeral: true});
        return;
    }

    try {
        const options = {
            bot: bot,
            intervalMap: intervalMap,
            cooldown: cooldownUsers, 
            queues: queues,
            activeVQs: activeVQs,
            updateQueues: updateQueues
        }

        await command.executeInteraction(interaction, options).catch(err => {
            if (err instanceof CommandError) {
                // Catch CommandErrors as user errors
                logger.log(err.message, err.user)
            } else {
                // Catch other errors as programming errors
                logger.logError(err);
            }
            
        });
    } catch (err) {
        console.log(err);
        await interaction.reply({content: 'Something went wrong...', ephemeral: true})
    }
})

process.on("SIGUSR1", () => {
    logger.log("SIGUSR1 sent, sending SIGTERM for shutdown and clearing queue", "#system");
    
    bot.channels.fetch(config['bot-channel-id']).then(chan => {
        // Send a dummy message into the bot-channel as an anchor
        chan.send('Clearing queue...').then(msg => {
            // Clear out the queues
            common.emptyQueues(msg.guild, queues, config);

            save.saveQueue(queues);

            process.emit('SIGTERM');
        });
    });


});

process.on("SIGINT", () => {
    logger.log("SIGINT sent, sending SIGTERM for shutdown", "#system");
    process.emit('SIGTERM');
});

// Catch shutdown signal to close gracefully
process.on('SIGTERM', async () => {
    logger.log("SIGTERM sent, shutdown requested", "#system");
    clearInterval(saveTimer)

    if (process.env.TESTING == 'true') {
        logger.log("Testing is enabled, not saving", "#system");
        process.exit(0);
    }

    let promises = [];

    // Save logs to s3
    logger.log("awaiting logs...", "#system");
    promises.push(await save.saveLogs());

    // Un-nest promises
    promises = promises.flat();
    
    // Save queues to s3
    promises.push(save.uploadQueue());
    
    // Wait for all uploads to be done before exiting
    for (let i = 0; i < promises.length; i++) {
        logger.log("awaiting...", "#system");
        await promises[i];
    }
    
    logger.log("Cleanup complete, exiting.", "#system");

    // Exit
    process.exit(0);

});

process.on('unhandledRejection', error => {
    console.log('Unhandled promise rejection', error);
});

// Create shutdown signal every 24 hours so that the bot reboots at night
// Currently resets at 7:45am
schedule.scheduleJob('45 7 * * *', function() {
    // Use SIGUSR1 to clear the queue
    process.emit('SIGUSR1');
});

// Save the queues every 15 minutes excluding midnight to 8am and saturdays
let saveTimer = setInterval(() => {
   let d = new Date();
   if (d.getDay() == 6 || !(d.getHours() >= 8) || updateQueues.val === false) { return; }

   save.saveQueue(queues);
   save.uploadQueue();
   updateQueues.val = false;

}, 1000 * 60 * 15)

bot.login(process.env.BOT_TOKEN);
