module.exports = {
    name: 'enroll',
    description: 'creates the enrollment message for the roles channel',
    async execute(message, args, config, options) {
        const timeout = config['bot-alert-timeout'];

        // Only bot managers may use this command
        if (!message.member.roles.cache.find(r => r.name === "Bot Manager")) {
            message.reply(`Insufficent permissions`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });
            return;
        }

        // This command can only be used in specific channels
        if (message.channel.name != 'class-enrollment') {
            message.reply(`You cannot use this command here`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });
            return;
        }

        // TODO: Assign roles based on reacts
        const emoteNames = ['110', '111', '121', '206', '221', '222', '312', '313', '314', '315']
        let emotes = [];
        let label = ""
        for (emoji of message.guild.emojis.cache) {
            if (emoteNames.includes(emoji[1].name)) {
                emotes.push(emoji[1]);
            }
        }

        for (name of emoteNames) {
            label += name + "   ";
        }
        message.channel.send(`Select your classes by clicking on the buttons below\n**\`${label}\`**`).then(async enrollMsg => {

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