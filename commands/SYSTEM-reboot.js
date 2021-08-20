const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: '$reboot',
    description: 'shuts down the server via SIGTERM',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['admin-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!$reboot insufficient perms", `${message.author}`);
        }

        message.reply("Confirmed, SIGTERM emitted for shutdown");
        logger.log("!$reboot called", message.author.id);
        process.emit('SIGTERM');
        
        return true;
    }
}

