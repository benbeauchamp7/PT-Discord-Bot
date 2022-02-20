const logger = require('../custom_modules/logging.js');
const replies = require('../custom_modules/replies.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'say',
    description: 'Makes the bot say something',

    async execute(message) {
        if (!message.member.roles.cache.find(r => r.name == "Moderator")) { 
            replies.timedReply(message, 'You have written an invalid command, maybe you made a typo?', config['bot-alert-timeout']);
            return true;
        }

        logger.log(`used !say with "${message.content}"`, `${message.author}`);
        message.channel.send(message.content.substring(message.content.indexOf(' ') + 1)).then(() => {
            message.delete().catch(() => { console.log('Already Deleted'); });
        });

        return true;
    }
}