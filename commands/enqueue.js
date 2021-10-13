const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const CommandError = require('../custom_modules/commandError.js');
const common = require('../custom_modules/common.js')
const { SlashCommandBuilder } = require('@discordjs/builders');

async function checkMention(mention, msg) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        let id = mention.replace(/[\\<>@#&!]/g, "");

        if (await msg.guild.members.fetch(id) === undefined) { return false; }
        return id;
    }
    return false;
}

module.exports = {
    name: 'q',
    description: 'puts a student into a queue',
    slashes: [
        new SlashCommandBuilder()
            .setName('q')
            .setDescription('Adds you to the queue for the channel you\'re in')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('(PT use only) The person to queue')
                    .setRequired(false))
            .addStringOption(option => 
                option.setName('into')
                    .setDescription('The course to queue into (ex. 121 or 314java)')
                    .setRequired(false))
            .addIntegerOption(option => 
                option.setName('at')
                    .setDescription('(PT use only, requires "user" argument) where in line the user can go')
                    .setRequired(false))
    ],

    permissions: {
        q: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        let queues = data.queues;
        const user = interaction.options.getUser('user');
        const into = interaction.options.getString('into');
        const at = interaction.options.getInteger('at');
        let targetUser = (user)? user : interaction.member;
        
        // Do validation
        if ((user || at) && !common.roleCheck(interaction.member, config['elevated-roles'])) { // Check permissions for arguments
            await interaction.reply({content: 'You don\'t have permission to use the "user" or "at" parameters', ephemeral: true});
            throw new CommandError("/q insufficient permissions", `${interaction.member}`)
        } else if (into && !config['course-emotes'].includes(into)) { // Check if "into" is invalid
            await interaction.reply({content: '"into" argument requires a single course code argument such as 121 or 312', ephemeral: true});
            throw new CommandError("/q into has invalid target", `${interaction.member}`);
        } else if (!into && !config['course-emotes'].includes(interaction.channel.name.substring(5))) {
            await interaction.reply({content: 'You can only use /q without "into" in a course channel such as csce-121 or csce-314java', ephemeral: true});
            throw new CommandError("/q not in course channel", `${interaction.member}`);
        } 
        
        let targetQueue = (into)? common.parseEmoteToChannel(into) : interaction.channel.name;
        if (!queues.has(targetQueue)) { queues.set(targetQueue, []); } // Set queue if empty
        if (at && (at > queues.get(targetQueue).length || at <= 0)) { // Check if 'at' is out of bounds
            await interaction.reply({content: `"at" argument ${at} is out of bounds for a queue of length ${queues.get(targetQueue).length}`, ephemeral: true});
            throw new CommandError("/q into has invalid target", `${interaction.member}`);
        }

        
        // Check if the target is already queued
        for (let [course, list] of queues) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].user === targetUser.id) {
                    if (targetUser.id !== interaction.member.id) {
                        interaction.reply({content: `${targetUser} is already queued in ${course}, so we couldn't queue them into ${targetQueue}`, ephemeral: true});
                    } else {
                        interaction.reply({content: `You're already queued in ${course}, so we couldn't queue you into ${targetQueue}`, ephemeral: true});
                    }
                    throw new CommandError(`/q ${targetUser} already queued in ${course}`, `${interaction.member}`);
                }
            }
        }

        // Put the user in the queue
        let position = (at)? at : queues.get(targetQueue).length+1;
        if (at) { 
            queues.get(targetQueue).splice(at-1, 0, {user: targetUser.id, time: "Manual", ready: true, readyTime: Date.now()});
        } else { 
            queues.get(targetQueue).push({user: targetUser.id, time: Date.now(), ready: true, readyTime: Date.now()});
        }

        // Give the user the queued role
        interaction.guild.members.fetch(targetUser.id).then(u => {
            u.roles.add(config['role-q-code']);
        });

        // Respond to the command
        if (targetUser.id !== interaction.member.id) {
            interaction.reply(`We queued ${targetUser} into ${targetQueue}, they're ${common.getPlace(position)} in line`);
        } else {
            interaction.reply(`Queued! You're ${common.getPlace(position)} in line`);
        }

        // Drop a message in the queue-alerts channel
        data['bot'].channels.fetch(config['q-alert-id']).then(channel => {
            // Roles are same as channel name, but with CSCE capitalized
            const tag = channel.guild.roles.cache.find(role => role.name === `CSCE-${targetQueue.substring(5)}`).id;
            channel.send(`<@&${tag}>, <@${targetUser.id}> has joined the ${targetQueue} queue and needs *your* help!`);
        });

        save.saveQueue(queues);
        data.updateQueues.val = true;

        return true;
    },

    async execute(msg, args, options) {
        let queues = options.queues;
        let bot = options.bot;
        let user = Object.assign({}, msg.author);
        let adminQ = false;
        let qTarget = msg.channel.name;
        let position = -1;

        // Check for elevated user to allow args
        if (common.roleCheck(msg.member, config['elevated-roles']) && args.length !== 0) {
            
            // If a valid mention
            let mentionID = await checkMention(args[0], msg);
            if (!mentionID) {
                replies.timedReply(msg, "that user does not exist (maybe a broken mention?)", config['bot-alert-timeout'])
                throw new CommandError(`!q undefined user ${args[0]}`, `${msg.author}`);
            }
            adminQ = true;
            user.id = mentionID;

            // !q special arguments
            let intoIndex = args.indexOf("into");
            let atIndex = args.indexOf("at");
            if (intoIndex !== -1 || atIndex !== -1) {
                if (intoIndex !== -1) {
                    if (intoIndex + 1 >= args.length) {
                        replies.timedReply(msg, "keyword `into` requires an argument in the form `[121 | 221 | ... | 315 | mine | personal]`", config['bot-alert-timeout']);
                        throw new CommandError("!q into has no target", `${msg.author}`);
                    } else if (config['course-emotes'].includes(args[intoIndex + 1])) {
                        qTarget = common.parseEmoteToChannel(args[intoIndex + 1]);
                        qTargetPretty = qTarget;
                    } else if (config["personal-q-aliases"].includes(args[intoIndex + 1])) {
                        qTarget = `<@${msg.author.id}>`;
                        qTargetPretty = `${msg.author}'s personal queue`;
                    } else {
                        replies.timedReply(msg, `argument "${args[intoIndex + 1]}" following \`into\` is not a course, \`mine\`, or \`personal\``, config['bot-alert-timeout']);
                        throw new CommandError("!q into has invalid target", `${msg.author}`);
                    }

                }

                if (atIndex !== -1) {
                    if (atIndex + 1 >= args.length) {
                        replies.timedReply(msg, "keyword `at` requires a number argument for the position of the user", config['bot-alert-timeout']);
                        throw new CommandError("!q at has no position argument", `${msg.author}`);
                    } else if (isNaN(args[atIndex + 1])) {
                        replies.timedReply(msg, `specified position "${args[intoIndex + 1]}" is not a number`, config['bot-alert-timeout']);
                        throw new CommandError("!q at has non-numeric position argument", `${msg.author}`);
                    } else if (!queues.has(qTarget)) {
                        replies.timedReply(msg, `no place to queue user into was specified. Use this command in a course channel, or specify a target by using \`into\` in the form \`!q @user into <course> at <position>\``, config['bot-alert-timeout']);
                        throw new CommandError("!q at has non-numeric position argument", `${msg.author}`);
                    } else if (args[atIndex + 1] > queues.get(qTarget).length || args[atIndex + 1] <= 0) {
                        replies.timedReply(msg, "specified position is outside the range of the queue", config['bot-alert-timeout']);
                        throw new CommandError("!q at has out-of-bounds position argument", `${msg.author}`);
                    } else {
                        // The only time we DONT throw an error
                        position = parseInt(args[atIndex + 1], 10);
                    }
                }

            } else if (args.length > 1) {
                replies.timedReply(msg, "target !q syntax: `!q @user INTO [<course number> | personal | mine]`", config['bot-alert-timeout'])
                throw new CommandError("!q target invalid syntax", `${msg.author}`);
            } else if (args.length === 1 && !config['course-channels'].includes(qTarget)) {
                replies.timedReply(msg, "you can only use !q like this in a csce channel", config['bot-alert-timeout']);
                throw new CommandError("!q wrong channel", `${msg.author}`);
            }
            
        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout'])
            throw new CommandError("!q insufficient permissions", `${msg.author}`);

        } else if (!config['course-channels'].includes(qTarget)) {
            // Checks to see if in the right channel for a !q
            replies.timedReply(msg, "you can only use !q like this in a csce channel", config['bot-alert-timeout']);
            throw new CommandError("!q wrong channel", `${msg.author}`);
        }

        // Don't let them join a queue if they're already in one
        for (let [temp, list] of queues) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].user === user.id) {
                    if (adminQ) {
                        replies.timedReply(msg, `${msg.guild.members.cache.get(user.id)} is already queued in ${temp}, so we couldn't queue them here`, config['bot-alert-timeout'])
                        throw new CommandError(`!q already queued in ${temp}`, `${msg.author}`);
                    } else {
                        replies.timedReply(msg, `you're already queued in ${temp}, so we couldn't queue you here`, config['bot-alert-timeout'])
                        throw new CommandError(`!q already queued in ${temp}`, `${msg.author}`);
                    }
                }
            }
        }

        // Get the list then add the new user to the specified position
        let course = qTarget;
        if (!queues.has(qTarget)) { queues.set(qTarget, []); }

        if (position === -1) { 
            queues.get(course).push({user: user.id, time: Date.now(), ready: true, readyTime: Date.now()});
        } else {
            queues.get(course).splice(position-1, 0, {user: user.id, time: "Manual", ready: true, readyTime: Date.now()});
        }

        // Give them the queued role
        msg.guild.members.fetch(user.id).then(user => {
            user.roles.add(config['role-q-code']);
        });

        if (adminQ) {
            logger.log(`!q <@${user.id}> into ${course}`, `${msg.author}`);
            msg.react('✅')
            // msg.reply(`We queued ${msg.guild.members.cache.get(user.id)} into ${qTargetPretty}, they're ${position} in line`);
        } else {
            logger.log(`!q self into ${course}`, `${msg.author}`)
            msg.react('✅')
            // msg.reply(`Queued! You're ${position} in line`);
        }

        // Check to see if a course queue
        if (!qTarget.startsWith('<@')) {
            bot.channels.fetch(config['q-alert-id']).then(channel => {
                // Roles are same as channel name, but with CSCE capitalized
                // const tag = `role-${qTarget.substring(5)}-code`;
                const tag = channel.guild.roles.cache.find(role => role.name === `CSCE-${qTarget.substring(5)}`).id;
                channel.send(`<@&${tag}>, <@${user.id}> has joined the ${qTarget} queue and needs *your* help!`);
            });
        }

        save.saveQueue(queues);
        options.updateQueues.val = true;

        return true;
    }
}