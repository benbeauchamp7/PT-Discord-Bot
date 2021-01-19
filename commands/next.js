const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: 'next',
    description: 'cycles a student into the voice channel',
    async execute(message) {

        replies.timedReply(message, "this function is disabled", config["bot-alert-timeout"]);
        throw new CommandError("!cycle is disabled", `${message.author}`);

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!cycle insufficient perms", `${message.author}`);
		}
		
    }
}