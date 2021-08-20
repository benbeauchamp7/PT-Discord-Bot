const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const CommandError = require('../custom_modules/commandError.js');
const common = require('../custom_modules/common.js')

async function checkMention(mention, msg) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        let id = mention.replace(/[\\<>@#&!]/g, "");

        if (await msg.guild.members.fetch(id) === undefined) { return false; }
        return id;
    }
    return false;
}

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'q',
    description: 'puts a student into a queue',
    async execute(msg, args, options) {
        let queues = options.queues;
        let bot = options.bot;
        let user = Object.assign({}, msg.author);
        let adminQ = false;
        let qTarget = msg.channel.name;
        let position = -1;

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
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