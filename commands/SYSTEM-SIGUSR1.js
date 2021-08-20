const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: '$sigusr1',
    description: 'shuts down the server via sigusr1',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['admin-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!$sigusr1 insufficient perms", `${message.author}`);
        }

        message.reply("Confirmed, SIGUSR1 emitted for shutdown");
        logger.log("!$sigusr1 called", message.author.id);
        process.emit('SIGUSR1');
        
        return true;
    }
}

