// Require discord dependency and create the 'bot' object
const Discord = require('discord.js');
const bot = new Discord.Client({ partials: ['REACTION']});

// Unique token that allows the bot to login to discord
const fs = require('fs');
const token = fs.readFileSync("SecureKey", "utf-8");

// Get audit logger
const logger = require('./logging.js');
const save = require('./save.js');
const replies = require('./replies.js');
const CommandError = require('./commandError.js');

// Banned word list sourced from http://www.bannedwordlist.com/lists/swearWords.txt
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const timeout = config['bot-alert-timeout'];
const bannedChatWords = config['banned-chat-words'];
const prefix = config['prefix'];
const doModChat = config['do-moderate-chat'];
const otherCommands = config['other-commands'];

// Import all the commands from the commands folder
bot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    // Include command files
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}

// Handle automatic cleanup of channels
let intervalMap = new Map();
let warnMap = new Map();

// Keeps track of all the basic !vqs to help keep channels clean
let activeVQs = new Map();

// Tracks users on cooldown from making rooms
let cooldownUsers = new Map();

let queues = new Map();

function addChanInterval(categoryChannel) {
    warnMap.set(categoryChannel.id, null);
    const intervalID = bot.setInterval(checkChanTimeout, config['room-inactivity-update'], categoryChannel);
    intervalMap.set(categoryChannel.id, intervalID);

    logger.log(`Timer added`, `#${categoryChannel.name}`);
}

async function checkChanTimeout(categoryChannel) {

    // Get the channels from the student category
    var textChan, voiceChan;
    for (const chan of categoryChannel.children) {
        if (chan[1].type == 'text') {
            textChan = chan[1];
        } else if (chan[1].type == 'voice') {
            voiceChan = chan[1];
        }
    }
    
    // If the text channel has been inactive for the configurable time
    // console.log(textChan.lastMessage)
    let last = await textChan.messages.fetch({limit: 1});
    last = last.first();

    if ( (textChan.parent.name.endsWith(config["student-chan-specifier"]) && last.createdAt.getTime() + config['text-room-timeout'] < Date.now())
    ||  (textChan.parent.name.endsWith(config["sticky-chan-specifier"]) && last.createdAt.getTime() + config['sticky-room-timeout'] < Date.now()) ) {

        // And the cooresponding voice channel is also empty
        if (voiceChan.members.size === 0) {

            // Begin countdown to message deletion
            if (warnMap.get(categoryChannel.id) === null) {
                const tID = setTimeout(() => {
                    // Use the end command to erase the channel
                    textChan.send("Channel inactive, deleting...").then(deleteMessage => {
                        bot.commands.get("end").execute(deleteMessage, '', { intervalMap: intervalMap });
                        warnMap.delete(categoryChannel.id);
                        logger.log(`Channel deleted`, `#${categoryChannel.name}`);
                    });
                }, config['text-room-timeout-afterwarning']);

                warnMap.set(categoryChannel.id, tID);
                textChan.send(`This chat will be deleted in ${config['text-room-timeout-afterwarning'] / 1000 / 60} minutes due to inactivity. Say something to delay the timer!`)
                logger.log(`Inactivity warning`, `#${categoryChannel.name}`);
            }

            // Local collector to reset inactivity
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

// Declare queue maps that work in parallel, one containing the times people joined and the other containing the user IDs
// Each course maps to a basic array acting as a queue, each populated with user ids or time stamps (repsectively)

bot.on('ready', () => {
    // Ping console when bot is ready
    console.log('Bot Ready!');
    logger.log("Bot Ready", "none");

    // Scan for student channels on bot creation
    for (const chan of bot.channels.cache) {
        // If student category
        if (chan[1] instanceof Discord.CategoryChannel && (chan[1].name.endsWith(config['student-chan-specifier'] || chan[1].name.endsWith(config['sticky-chan-specifier'])))) {
            // Create interval for the channels
            addChanInterval(chan[1]);
            
        } else if (chan[1] instanceof Discord.TextChannel && chan[1].name.endsWith('-archived')) {
            
            bot.commands.get('end').addArchiveInterval(chan[1], intervalMap);
        }
    }

    // Set up queue map
    for (course of config['course-channels']) {
        queues.set(course, []);
    }

    queues = save.loadQueue();

});

// Fires on uncached reaction events for course enrollment
bot.on('raw', packet => {
    // Only fire on message reactions
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) { return; }
    
    // Grab the channel to check the message from
    bot.channels.fetch(packet.d.channel_id).then(channel => {
        // Quit if event is already cached
        if (channel.messages.cache.find(e => e == packet.d.message_id)) { return; }
        
        // Fetch uncached channel
        channel.messages.fetch(packet.d.message_id).then(message => {
        
            // Format the emoji
            const emoji = `${packet.d.emoji.id}`;

            // Grab the reaction object from the message
            const reaction = message.reactions.cache.get(`${emoji}`);

            // Emit the packet so the reaction event handler can grab it
            if (packet.t === 'MESSAGE_REACTION_ADD') {
                bot.emit('messageReactionAdd', reaction, bot.users.cache.get(packet.d.user_id));
            } else if (packet.t === 'REMOVE') {
                bot.emit('messageReactionAdd', reaction, bot.users.cache.get(packet.d.user_id));
            }
        });
    }); 
});

bot.on('voiceStateUpdate', (oldMember, newMember) => {
    // Click to create room functionality
    const channelJoined = newMember.channelID;
    const user = newMember.member

    if (channelJoined === null) { return; }

    if (channelJoined == config['click-to-join-id']) {
        // If the user isn't on cooldown for creating a room
        if (!isOnCooldown(user.id)) {
            bot.channels.fetch(config['bot-channel-id']).then(chan => {
                chan.send('Creating Channel...').then(msg => {
                    const options = {
                        bot: bot,
                        user: user,
                        cooldown: cooldownUsers,
                        auto: true
                    }

                    bot.commands.get("create").execute(msg, '', options);
                    msg.delete();
                    cooldownUsers.set(user.id, Date.now());
                });
                logger.log("Channel Created (VC)", `<@${user.id}>`)
            });
        } else {
            user.voice.setChannel(config['cooldown-channel-id']);
            logger.log("cooldown hit (VC)", `<@${user.id}>`)
        }
    } else if (warnMap.has(newMember.channel.parentID)) {
        clearTimeout(warnMap.get(newMember.channel.parentID));
        warnMap.set(newMember.channel.parentID, null);
    }
});

// Add intervals to new student channels
bot.on('channelCreate', chan => {
    if (chan instanceof Discord.CategoryChannel && (chan.name.endsWith(config['student-chan-specifier'] || chan.name.endsWith(config['sticky-chan-specifier'])))) {
        console.log(`Timer added to "${chan.name}"`)
        addChanInterval(chan);
    } else if (chan instanceof Discord.TextChannel && chan.name.endsWith('-archived')) {
        
        bot.commands.get('end').addArchiveInterval(chan, intervalMap);
    }
});

// Destory timers on student channels when removed
bot.on('channelDelete', chan => {
    if (intervalMap.has(chan.id)) {
        console.log(`Timer deleted from "#${chan.name}"`)
        logger.log("timer deleted", `#${chan.name}`)

        bot.clearInterval(intervalMap.get(chan.id));
        intervalMap.delete(chan.id);
    }
});

// Handle message commands
bot.on('message', msg => {
    // Prevent recursion
    if (msg.author.bot) { return; }
    
    const args = msg.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    // Chat moderation
    var badWordFound = false;
    if (doModChat) {
        for (const badWord of bannedChatWords) {
            if (badWordFound) { break; }

            for (const userWord of msg.content.split(' ')) {
                if (badWord == userWord.toLowerCase()) {
                    const modReplies = config["chat-moderation-messages"];
                    const selected = modReplies[Math.floor(Math.random() * modReplies.length)];

                    msg.reply(selected).then(reply => {
                        reply.delete({'timeout': timeout});
                        msg.delete({'timeout': 0});
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
            const options = {
                bot: bot,
                intervalMap: intervalMap,
                user: msg.author,
                cooldown: cooldownUsers, 
                queues: queues,
                activeVQs: activeVQs
            }
            isOnCooldown(msg.author.id); // Clear cooldown if applicable

            bot.commands.get(command).execute(msg, args, options).then(didSucceed => {
                if (didSucceed) { logger.log(`SUCCESS: ${command}`, `${msg.author}`) }
                else { logger.log(`FAIL: ${command}`, `${msg.author}`) }

                if (didSucceed && command === "create") {
                    cooldownUsers.set(msg.author.id, Date.now());
                }
            }).catch(err => {
                if (err instanceof CommandError) {
                    logger.log(err.message, err.user)
                }
                
            });

        } catch (err) {

            if (!otherCommands.includes(command)) {
                replies.timedReply(msg, 'you have written an invalid command, maybe you made a typo?', config['bot-alert-timeout']);

                logger.log(`ERROR: base error thrown CONTENT:${msg.content} |||| CHAN:#${msg.channel.name}`, `${msg.author}`);
            }
        }
    }
    
});

// Catch reactions for role assignment
bot.on('messageReactionAdd', async (reaction, user) => {
    if (reaction === undefined) {
        logger.log(`reaction undefined`, `<@${user.id}>`);
        return;
    } else if (user.id === undefined) {
        logger.log(`user id undefined`, `<@${reaction}>`);
        return;
    }

    // Fetch the reaction if needed
    if (reaction.partial) {
        try { await reaction.fetch() }
        catch (err) { console.log("Reaction fetch failed, ", err); return; }
    }

    if (reaction.message.channel.name === "course-enrollment") {
        reaction.message.guild.members.fetch(user.id).then(member => {
            member.roles.add(config[`role-${reaction._emoji.name}-code`]);
            logger.log(`role added`, `<@${user.id}>`);
        });
    }
});

bot.on('messageReactionRemove', async (reaction, user) => {

    // Fetch the reaction if needed
    if (reaction.partial) {
        try { await reaction.fetch() }
        catch (err) { console.log("Reaction fetch failed, ", err); return; }
    }

    if (reaction.message.channel.name === "course-enrollment") {
        reaction.message.guild.members.fetch(user.id).then(member => {
            member.roles.remove(config[`role-${reaction._emoji.name}-code`]);
            logger.log(`role removed`, `<@${user.id}>`);
        });
    }
});

bot.login(token);
