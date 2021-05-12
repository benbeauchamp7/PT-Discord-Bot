const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: 'topic',
    description: 'Renames a student chat room set',
    async execute(message, args) {

        const timeout = config['bot-alert-timeout'];
        const chan = message.channel;

        if (chan.parent.name.endsWith(config['student-chan-specifier'])) {
            // Rename the temp room

            chan.parent.setName(args.join(' ') + " " + config['student-chan-specifier']);
            chan.setName(args.join('-')).then(() => {
                message.react('✅');
            });

            return true;

        } else if (chan.parent.name.endsWith(config['sticky-chan-specifier'])) {
            // Rename the sticky room

            chan.parent.setName(args.join(' ') + " " + config['sticky-chan-specifier']);
            chan.setName(args.join('-')).then(() => {
                message.react('✅');
            });;

            return true;

        } else {
            message.reply(`You can only use this command in student-created discussion rooms`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });
            
            throw new CommandError("!topic wrong room", `${message.author}`);
        }
    }
}