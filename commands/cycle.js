const logger = require('../logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const CommandError = require('../commandError.js');

module.exports = {
    name: 'cycle',
    description: 'enables a student to join the cooresponding cycling channel',
    async execute(message, args, options) {
        let queues = options.queues;
        let memberList = message.mentions.users;

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!cycle insufficent perms", `${message.author}`);
        } else if (config['emote-names'].includes(args[1]) && Number(args[2]) != NaN) {
            let courseQueue = queues.get('csce-' + args[1]);
            memberList = courseQueue.splice(0, Number(args[2]));
        } else {
            replies.timedReply(message, "the usage is `!cycle <course> <number>` which grabs the first 'number' students from a course queue, or `!cycle @user @user @user...` to add specific users to the cycle", config["bot-alert-timeout"]);
            throw new CommandError("!cycle bad usage", `${message.author}`);
        }

        memberList = message.mentions.users;
        console.log(memberList)

        if (memberList.size === 0) {
            replies.timedReply(message, "one or more users not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!cycle undefined user", `${message.author}`);
        } else {
            for (let [id, member] of memberList) {
                // Grant permissions to cycle channel
            }
        }

        // TODO: Add reaction here
        logger.log(`!cycle ${memberList}`, `${message.author.id}`);
        report(message, message.author, member);
        
        return true;
    }
}