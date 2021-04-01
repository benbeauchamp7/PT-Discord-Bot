const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: '$setstatus',
    description: 'sets the bot\'s status',
    async execute(message, args, options) {

        if (!message.member.roles.cache.find(r => config['admin-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!$setstatus insufficient perms", `${message.author}`);
        }

        options.bot.user.setActivity(args.join(' ')).then(() => {
            message.react('✅')
        })
        
        return true;
    }
}

