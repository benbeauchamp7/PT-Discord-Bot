const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');
const save = require('../custom_modules/save.js');

module.exports = {
    name: '$upload',
    description: 'uploads current files to s3',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['admin-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!$upload insufficient perms", `${message.author}`);
        }

        save.saveLogs();
        save.uploadQueue();
        message.reply("confirmed, saving data to S3");
        logger.log("!$upload called", message.author.id);
        
        return true;
    }
}

