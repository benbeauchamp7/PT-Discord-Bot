module.exports = {
    name: 'topic',
    description: 'Renames a student chat room set',
    execute(message, args, config) {

        const timeout = config['bot-alert-timeout'];
        const bannedTitleWords = config['banned-title-words'];
        const chan = message.channel;
        if (chan.parent.name.endsWith(config['student-chan-specifier'])) {
            // Make sure the title doesn't contain bad language
            var badWordFound = false;
            for (const badWord of bannedTitleWords) {
                for (const userWord  of args) {
                    if (badWord == userWord.toLowerCase()) {
                        message.reply(`You cannot create a channel with ${badWord} in the name`).then(reply => {
                            reply.delete({'timeout': timeout});
                            message.delete({'timeout': timeout});
                        });
                        badWordFound = true;
                    }
                }
            }

            if (badWordFound === true) { return; }

            chan.parent.setName(args.join(' ') + " " + config['student-chan-specifier']);
            chan.setName(args.join('-'));
            
        } else {
            message.reply(`You can only use this command in student-created discussion rooms`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });
        }
    }
}