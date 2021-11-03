const logger = require('../custom_modules/logging.js');
const replies = require('../custom_modules/replies.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'say',
    description: 'Makes the bot say something',

    async execute(message) {

        logger.log(`used !say with "${message.content}"`, `${message.author}`);
        message.channel.send(message.content.substring(message.content.indexOf(' ') + 1)).then(() => {
            message.delete().catch(() => { console.log('Already Deleted'); });
        });

        return true;
    }
}