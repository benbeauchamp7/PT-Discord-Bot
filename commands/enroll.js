const logger = require('../logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

module.exports = {
    name: 'enroll',
    description: 'creates the enrollment message for the roles channel',
    async execute(message, args, options) {
        const timeout = config['bot-alert-timeout'];

        // Only bot managers may use this command
        if (!message.member.roles.cache.find(r => r.name === "Moderator")) {
            message.reply(`insufficient permissions`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });
            logger.log("!enroll insufficient permissions", `${message.author}`)
            return;
        }

        // This command can only be used in specific channels
        if (message.channel.name != 'course-enrollment') {
            message.reply(`You cannot use this command here`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });
            logger.log("!enroll wrong room", `${message.author}`)
            return;
        }

        const emoteNames = config['emote-names']
        let emotes = [];
        let label = ""
        console.log(emoteNames)
        for (emoji of message.guild.emojis.cache) {
            console.log(emoji[1].name)
            if (emoteNames.includes(emoji[1].name)) {
                emotes.push(emoji[1]);
            }
        }

        for (name of emoteNames) {
            label += name + "   ";
        }
        message.channel.send(`Select your coursees by clicking on the buttons below\n**\`${label}\`**`).then(async enrollMsg => {

            emotes.sort((a, b) => {
                if (a.name < b.name) { return -1; }
                if (a.name > b.name) { return 1; }
                return 0;
            });

            for (emote of emotes) {
                await enrollMsg.react(`${emote.id}`);
            }
        });
    }
}