// Require discord dependency and create the 'bot' object
const Discord = require('discord.js');
const bot = new Discord.Client({ partials: ['REACTION']});

// Unique token that allows the bot to login to discord
const fs = require('fs');
const token = fs.readFileSync("SecureKey", "utf-8");

// Import all the commands from the commands folder
bot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    // Include command files
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}

// Banned word list sourced from http://www.bannedwordlist.com/lists/swearWords.txt
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const timeout = config['bot-alert-timeout'];
const bannedChatWords = config['banned-chat-words'];
const prefix = config['prefix'];
const doModChat = config['do-moderate-chat'];
const otherCommands = config['other-commands'];

// Handle automatic cleanup of channels
var intervalMap = new Map();
var warnMap = new Map();
function addChanInterval(categoryChannel) {
    warnMap.set(categoryChannel.id, null);
    const intervalID = bot.setInterval(checkChanTimeout, config['room-inactivity-update'], categoryChannel);
    intervalMap.set(categoryChannel.id, intervalID);
}

function checkChanTimeout(categoryChannel, timeoutID) {

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
    if ((textChan.lastMessage === null) && textChan.createdAt.getTime() + config['text-room-timeout']*2 < Date.now()
    || (textChan.lastMessage !== null) && textChan.lastMessage.createdAt.getTime() + config['text-room-timeout'] < Date.now()) {

        // And the cooresponding voice channel is also empty
        if (voiceChan.members.size === 0) {

            // Begin countdown to message deletion
            if (warnMap.get(categoryChannel.id) === null) {
                const tID = setTimeout(() => {
                    // Use the end command to erase the channel
                    textChan.send("Channel inactive, deleting...").then(deleteMessage => {
                        bot.commands.get("end").execute(deleteMessage, '', { intervalMap: intervalMap });
                        warnMap.delete(categoryChannel.id);
                    });
                }, config['text-room-timeout-afterwarning']);

                warnMap.set(categoryChannel.id, tID);
                textChan.send(`This chat will be deleted in ${config['text-room-timeout-afterwarning'] / 1000} seconds due to inactivity. Say something to delay the timer!`)
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

// Declare cooldown structure
var cooldownUsers = new Map();
function isOnCooldown(userID) {
    // Take member of cooldown if enough time has passed
    if (cooldownUsers.has(userID) && cooldownUsers.get(userID) + config['channel-create-cooldown'] < Date.now()) {
        cooldownUsers.delete(userID);
    }

    return cooldownUsers.has(userID);
}

// Declare queue maps that work in parallel, one containing the times people joined and the other containing the user IDs
// Each course maps to a basic array acting as a queue, each populated with user ids or time stamps (repsectively)
var userQueues = new Map();
var timeJoinedQueues = new Map();
bot.on('ready', () => {
    // Ping console when bot is ready
    console.log('Bot Ready!');

    // Scan for student channels on bot creation
    for (const chan of bot.channels.cache) {
        // If student category
        if (chan[1] instanceof Discord.CategoryChannel && chan[1].name.endsWith(config['student-chan-specifier'])) {
            // Create interval for the channels
            console.log(`Timer added to "${chan[1].name}"`)
            addChanInterval(chan[1]);
            
        } else if (chan[1] instanceof Discord.TextChannel && chan[1].name.endsWith('-archived')) {
            
            bot.commands.get('end').addArchiveInterval(chan[1], intervalMap);
        }
    }

    // Set up queue map
    for (course of config['course-channels']) {
        userQueues.set(course, []);
        timeJoinedQueues.set(course, []);
    }
});

// Queueing commands
function enqueue(msg, args) {
    let user = Object.assign({}, msg.author);
    let adminQ = false;

    // Check for elevated user to allow args
    if (msg.member.roles.cache.find(r => config['elevated-roles'].includes(r.name)) && args.length !== 0) {
        
        // If a valid mention
        if (args[0].match(/^<@!?(\d+)>$/g)) {
            // Reassign the user id from the mention
            user.id = args[0].replace(/[\\<>@#&!]/g, "");

            // Attempt a fetch to ensure the user is valid for this guild
            if (msg.guild.members.cache.get(user.id) === undefined) {
                msg.reply("that user does not exist").then(reply => {
                    reply.delete({'timeout': config['bot-alert-timeout']});
                    msg.delete({'timeout': config['bot-alert-timeout']});
                });
                return false;
            }
            adminQ = true;
        } else {
            msg.reply("invalid argument, use the @ symbol to mention the user you'd like to dequeue").then(reply => {
                reply.delete({'timeout': config['bot-alert-timeout']});
                msg.delete({'timeout': config['bot-alert-timeout']});
            });
            return false;
        }
    } else if (args.length !== 0) {
        msg.reply("you do not have permission to use arguments with this command").then(reply => {
            reply.delete({'timeout': config['bot-alert-timeout']});
            msg.delete({'timeout': config['bot-alert-timeout']});
        });

        return false;
    }

    // Don't let them join a queue if they're already in one
    for (let [temp, list] of userQueues) {
        if (list.includes(user.id)) {
            return false;
        }
    }

    // Get the list then add the new user to the back
    let course = msg.channel.name;
    let l = userQueues.get(course);
    l.push(user.id)
    userQueues.set(course, l);

    // Same thing for time
    l = timeJoinedQueues.get(course);
    l.push(Date.now());
    timeJoinedQueues.set(course, l);

    let rank = userQueues.get(course).length;
    let position = "";
    switch (rank) {
        case 1:
            position = "**first**"
            break;
        case 2:
            position = "**second**"
            break;
        case 3:
            position = "**third**"
            break;
        default:
            position = "number *" + rank + "*"
    }

    if (adminQ) {
        msg.reply(`we queued ${msg.guild.members.cache.get(user.id)}, they're ${position} in line`);
    } else {
        msg.reply(`queued! You're ${position} in line`);
    }

    return true;
}

function dequeue(msg, args) {
    let user = Object.assign({}, msg.author);
    let adminDQ = false;

    // Check for elevated user to allow args
    if (msg.member.roles.cache.find(r => config['elevated-roles'].includes(r.name)) && args.length !== 0) {
        
        // If a valid mention
        if (args[0].match(/^<@!?(\d+)>$/g)) {
            // Reassign the user id from the mention
            user.id = args[0].replace(/[\\<>@#&!]/g, "");
            adminDQ = true;
        } else {
            msg.reply("invalid argument, use the @ symbol to mention the user you'd like to dequeue").then(reply => {
                reply.delete({'timeout': config['bot-alert-timeout']});
                msg.delete({'timeout': config['bot-alert-timeout']});
            });
            return false;
        }
    } else if (args.length !== 0) {
        msg.reply("you do not have permission to use arguments with this command").then(reply => {
            reply.delete({'timeout': config['bot-alert-timeout']});
            msg.delete({'timeout': config['bot-alert-timeout']});
        });

        return false;
    }

    // Find the user
    for (let [course, list] of userQueues) {
        for (let i = 0; i < list.length; i++) {
            if (list[i] === user.id) {
                
                // Remove user id
                let l = userQueues.get(course);
                l.splice(i, 1);
                userQueues.set(course, l);

                // Remove user's timestamp
                l = timeJoinedQueues.get(course);
                l.splice(i, 1);
                timeJoinedQueues.set(course, l);

                if (adminDQ) {
                    msg.reply(`we removed ${msg.guild.members.cache.get(user.id)} from the queue`);
                } else {
                    msg.reply(`removed! You're no longer queued`);
                }

                return true;
            }
        }
    }

    // User not found
    if (adminDQ) {
        msg.reply(`${msg.guild.members.cache.get(user.id)} was not in a queue`).then(reply => {
            reply.delete({'timeout': config['bot-alert-timeout']});
            msg.delete({'timeout': config['bot-alert-timeout']});
        });
    } else {
        msg.reply("you were not in a queue (so no action is required)").then(reply => {
            reply.delete({'timeout': config['bot-alert-timeout']});
            msg.delete({'timeout': config['bot-alert-timeout']});
        });
    }

    return false;
}

function parseTime(time) {
    let amPm = (time.getHours() > 12 ? 'PM' : 'AM');
    let hrs = (time.getHours() > 12 ? time.getHours() - 12 : time.getHours());
    let mins = (time.getMinutes() > 9 ? time.getMinutes() : `0${time.getMinutes()}`)
    return `${hrs}:${mins} ${amPm}`;
}

function viewqueue(msg, args) {
    let queueEmpty = true;
    let embed = "An error occured while creating the embed"

    if (args.length === 0) {
        // None specified, use the current one
        let userOrder = userQueues.get(msg.channel.name);
        let timeOrder = timeJoinedQueues.get(msg.channel.name);

        let qNameStr = "";
        let qTimeStr = "";
        for (let i = 0; i < userOrder.length; i++) {
            queueEmpty = false;
            
            qNameStr += `${i + 1}. ${msg.guild.members.cache.get(userOrder[i])}\n`
            let d = new Date(timeOrder[i]);
            qTimeStr += parseTime(d) + '\n';
        }

        if (queueEmpty) {
            embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Queue order of ${msg.channel.name.slice(5)}`)
                .addFields(
                    { name: 'Status', value: 'Queue is Empty!'}
                )
                .setFooter(`Queue is valid as of ${parseTime(new Date())}`)

        } else {
            embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Queue order of ${msg.channel.name.slice(5)}`)
                .addFields(
                    { name: 'Student', value: qNameStr, inline: true },
                    { name: 'Queue Time', value: qTimeStr, inline: true }
                )
                .setFooter(`Queue is valid as of ${parseTime(new Date())}`)
        }

    } else {
        // Get all courses specified to join over
        let users = [];
        let courses = [];
        let times = [];
        for (course of args) {
            try {
                users.push(JSON.parse(JSON.stringify(userQueues.get('csce-' + course))));
                times.push(JSON.parse(JSON.stringify(timeJoinedQueues.get('csce-' + course))));
            } catch (err) {
                msg.reply(`Unrecognized course, please try again`).then(reply => {
                    reply.delete({'timeout': timeout});
                    msg.delete({'timeout': timeout});
                });

                return false;
            }
            courses.push(course);
        }

        // Cycle through to find the order
        let order = [];
        let min = {
            u: null,
            c: null,
            t: null
        }

        for (let i = 0; i < config['queue-list-amount']; i++) {
            
            let minIndex = 0;
            for (let j = 0; j < courses.length; j++) {

                // If a course is out of queue members, skip the course
                if (users[j].length === 0) { continue; }

                if (min.t === null || times[j][0] < min.t) {

                    // Save the data & move the next person into their place
                    min.u = users[j][0];
                    min.c = courses[j];
                    min.t = times[j][0];

                    minIndex = j;
                }
            }
            // Put the user in the merged queue and reset min
            order.push(JSON.parse(JSON.stringify(min)));
            min.u = null; min.c = null; min.t = null;
            users[minIndex].shift();
            times[minIndex].shift();
        }

        // Format courses nicely
        let courseStr = courses[0];
        for (let i = 1; i < courses.length - 1; i++) {
            courseStr += ', ' + courses[i];
        }

        if (courses.length > 1) {
            courseStr += ' and ' + courses[courses.length - 1];
        }

        // Format the queue order nicely
        let qNameStr = "";
        let qClassStr = "";
        let qTimeStr = "";
        let queueEmpty = true;
        for (let i = 0; i < order.length; i++) {
            if (order[i].u === null) { break; }
            queueEmpty = false;
            
            qNameStr += `${i + 1}. ${msg.guild.members.cache.get(order[i].u)}\n`
            qClassStr += `${order[i].c}\n`;
            let d = new Date(order[i].t);
            qTimeStr += parseTime(d) + '\n';
        }
        
        if (queueEmpty) {
            embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Queue order of ${courseStr}`)
                .addFields(
                    { name: 'Status', value: 'Queue is Empty!'}
                )
                .setFooter(`Queue is valid as of ${parseTime(new Date())}`)

        } else {
            embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Queue order of ${courseStr}`)
                .addFields(
                    { name: 'Student', value: qNameStr, inline: true },
                    { name: 'Course‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎', value: qClassStr, inline: true },
                    { name: 'Queue Time', value: qTimeStr, inline: true }
                )
                .setFooter(`Queue is valid as of ${parseTime(new Date())}`)
        }
    }

    msg.channel.send(embed);
}

function clearqueue(message, args) {
    if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
        message.reply("this will remove all students from all queues, type !confirm to continue or !cancel to cancel. The command will cancel automatically if no response is detected in 30 seconds").then(confirmationMessage => {

            // Both delete promises fail quietly in case !cancel deletes the messages first
            confirmationMessage.delete({"timeout": 30000}).catch(() => {});
            message.delete({"timeout": 30000}).catch(() => {});

            // Set a message collector to look for !confirm or !cancel
            const collector = new Discord.MessageCollector(message.channel, reply => reply.author.id === message.author.id, {"time": 30000})
            collector.on('collect', reply => {
                if (reply.content.toLowerCase() == "!confirm") {

                    // Reinitialize
                    for (course of config['course-channels']) {
                        userQueues.set(course, []);
                        timeJoinedQueues.set(course, []);
                    }

                    message.reply("confirmed!").then(recipt => {

                        // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                        try {
                            reply.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            message.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            confirmationMessage.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            if (recipt) {
                                recipt.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            }
                        } catch (err) {}
                    });
                    return true;

                } else if (reply.content.toLowerCase() == "!cancel") {
                    message.reply("Command canceled").then(cancelMessage => {

                        // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                        reply.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                        message.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                        confirmationMessage.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                        cancelMessage.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});

                    });
                    return false;  
                }
            });
        });
    }
}

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
            });
        } else {
            user.voice.setChannel(config['cooldown-channel-id']);
        }
    } else if (warnMap.has(newMember.channel.parentID)) {
        clearTimeout(warnMap.get(newMember.channel.parentID));
        warnMap.set(newMember.channel.parentID, null);
    }
});

// Add intervals to new student channels
bot.on('channelCreate', chan => {
    if (chan instanceof Discord.CategoryChannel && chan.name.endsWith(config['student-chan-specifier'])) {
        console.log(`Timer added to "${chan.name}"`)
        addChanInterval(chan);
    } else if (chan instanceof Discord.TextChannel && chan.name.endsWith('-archived')) {
        
        bot.commands.get('end').addArchiveInterval(chan, intervalMap);
    }
});

// Destory timers on student channels when removed
bot.on('channelDelete', chan => {
    if (intervalMap.has(chan.id)) {
        console.log(`Timer deleted from "${chan.name}"`)
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
            }
            isOnCooldown(msg.author.id); // Clear cooldown if applicable

            // Queue commands must be handled seperately (at a higher level than single commands)
            if (['enqueue', 'dequeue', 'viewqueue', 'q', 'dq', 'vq', 'clearqueue'].includes(command)) {
                switch (command) {
                    case 'enqueue':
                    case 'q':
                        enqueue(msg, args);
                        break;

                    case 'viewqueue':
                    case 'vq':
                        viewqueue(msg, args);
                        break;

                    case 'dequeue':
                    case 'dq':
                        dequeue(msg, args);
                        break;

                    case 'clearqueue':
                        clearqueue(msg, args);
                        break;
                }
            } else {
                bot.commands.get(command).execute(msg, args, options).then(isSuccess => {
                    if (isSuccess && command === "create") {
                        cooldownUsers.set(msg.author.id, Date.now());
                    }
                });
            }
        } catch (err) {
            if (!otherCommands.includes(msg.content)) {
                msg.reply('you have written an invalid command, maybe you made a typo?').then(reply => {
                    reply.delete({'timeout': 10000});
                    msg.delete({'timeout': 10000});
                });
                console.log(err);
            }
        }
    }
    
});

// Catch reactions for role assignment
bot.on('messageReactionAdd', async (reaction, user) => {

    // Fetch the reaction if needed
    if (reaction.partial) {
        try { await reaction.fetch() }
        catch (err) { console.log("Reaction fetch failed, ", err); return; }
    }

    if (reaction.message.channel.name === "course-enrollment") {
        reaction.message.guild.members.fetch(user.id).then(member => {
            switch (reaction._emoji.name) {
                case '110':
                    member.roles.add('737104509750214656')
                    break;
                case '111':
                    member.roles.add('737104576012091414')
                    break;
                case '121':
                    member.roles.add('737104605921673298')
                    break;
                case '206':
                    member.roles.add('737104627765608549')
                    break;
                case '221':
                    member.roles.add('737104657469407314')
                    break;
                case '222':
                    member.roles.add('737104680324169810')
                    break;
                case '312':
                    member.roles.add('737104695159554050')
                    break;
                case '313':
                    member.roles.add('737104719335522438')
                    break;
                case '314':
                    member.roles.add('737104737790328873')
                    break;
                case '315':
                    member.roles.add('737104769000276008')
                    break;
                                                                                                                                                            
            }
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
            switch (reaction._emoji.name) {
                case '110':
                    member.roles.remove('737104509750214656')
                    break;
                case '111':
                    member.roles.remove('737104576012091414')
                    break;
                case '121':
                    member.roles.remove('737104605921673298')
                    break;
                case '206':
                    member.roles.remove('737104627765608549')
                    break;
                case '221':
                    member.roles.remove('737104657469407314')
                    break;
                case '222':
                    member.roles.remove('737104680324169810')
                    break;
                case '312':
                    member.roles.remove('737104695159554050')
                    break;
                case '313':
                    member.roles.remove('737104719335522438')
                    break;
                case '314':
                    member.roles.remove('737104737790328873')
                    break;
                case '315':
                    member.roles.remove('737104769000276008')
                    break;
                                                                                                                                                            
            }
        });
    }
});

bot.login(token);
