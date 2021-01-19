const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');
const save = require('../custom_modules/save.js');

module.exports = {
    name: 'cycle',
    description: 'enables a student to join the corresponding cycling channel',
    async execute(message, args, options) {

        replies.timedReply(message, "this function is disabled", config["bot-alert-timeout"]);
        throw new CommandError("!cycle is disabled", `${message.author}`);

        let queues = options.queues;
        let memberList = message.mentions.users;
        let fromQueue = false;
        let cycles = options.cycles;

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!cycle insufficient perms", `${message.author}`);

        } else if (args.length == 0) {
            replies.timedReply(message, "the usage is `!cycle <course> <number>` which grabs the first 'number' students from a course queue, or `!cycle @user @user @user...` to add specific users to the cycle", 2*config["bot-alert-timeout"]);
            throw new CommandError("!cycle bad usage", `${message.author}`);
            
        } else if (config['emote-names'].includes(args[0]) && Number(args[1]) != NaN) {
            let courseQueue = queues.get('csce-' + args[0]);

            if (courseQueue.length == 0) {
                replies.timedReply(message, `no users in ${args[0]} queue, so nobody was added to the cycle`, config["bot-alert-timeout"]);
                throw new CommandError(`!cycle no users in ${args[0]}`, `${message.author}`);
            }

            queueMembers = courseQueue.splice(0, Number(args[1]));
            memberList = new Map();
            for (item of queueMembers) {
                memberList.set(item.user, await message.guild.members.fetch(item.user))
            }

            save.saveQueue(queues);
            fromQueue = true;

        } else if (memberList.size == 0) {
            replies.timedReply(message, `your command \`${message.content}\` contained no valid users so nobody was added to the cycle`, config["bot-alert-timeout"]);
            throw new CommandError(`!cycle no users mentioned in ${args[0]}`, `${message.author}`);
        }

        // Grab cycling channel
        let parent = message.channel.parent;
        let voiceChan = undefined;
        for (const chan of parent.children) {
            if (chan[1].name === 'Cycling Room') {
                voiceChan = chan[1]
            }
        }
        if (voiceChan == undefined) {
            replies.timedReply(message, `cycling channel not found, an error occurred`, config["bot-alert-timeout"]);
            throw new CommandError(`!cycle no cycling channel for ${parent}`, `${message.author}`);
        }

        let members = ""; 
        let memberIDs = "";
        if (!cycles.has(voiceChan.id)) { cycles.set(voiceChan.id, [])}
        let cycle = cycles.get(voiceChan.id)

        for ([id, member] of memberList) {
            // Grant permissions to cycle channel
            voiceChan.updateOverwrite(member, {
                VIEW_CHANNEL: true,
                CONNECT: true,
                SPEAK: true
            });

            members += `${member}\n`;
            memberIDs += ` ${member}`
        }

        logger.log(`!cycle${memberIDs}`, `${message.author}`);
        if (fromQueue) {
            message.channel.send(`We added the following users to your cycle and removed them from the queue \n${members}`)

        } else {
            message.channel.send(`We added the following users to your cycle \n${members}`)
        }
        
        return true;
    }
}