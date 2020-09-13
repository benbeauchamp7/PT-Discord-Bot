const fs = require('fs');
const logger = require('../logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../commandError.js');

module.exports = {
    name: 'sticky',
    description: 'Makes a set of discussion channels',
    async execute(message, args, options) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            message.reply(`only PT's can make sticky rooms!`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });

            throw new CommandError("!sticky insufficent permissions", `${message.author}`);
        }

        const timeout = config['bot-alert-timeout'];
        const bannedTitleWords = config['banned-title-words']
        const chan = message.channel;

        var badWordFound = false;
        if (chan.name == 'create-room' || chan.name == 'bot-channel') {

            // Make sure the title doesn't contain bad language
            for (const badWord of bannedTitleWords) {
                for (const userWord  of args) {
                    if (badWord == userWord.toLowerCase()) {
                        message.reply(`You cannot create a channel with ${badWord} in the name`).then(reply => {
                            reply.delete({'timeout': timeout});
                            message.delete({'timeout': timeout});
                        });
                        logger.log("bad word in title creation", `${message.author}`);
                        badWordFound = true;
                    }
                }
            }

            if (badWordFound === true) { throw new CommandError("!sticky bad language", `${message.author}`); }

            // Create a category for the student picked topic
            if (args.length === 0) { args = ['Unnamed']; }
            message.guild.channels.create(args.join(' ') + " " + config['sticky-chan-specifier'], {'type': 'category'}).then(category => {

                // Move cat above archive
                category.setPosition(-1, {"relative": true});

                // Create text channel
                message.guild.channels.create(args.join('-')).then(newTextChan => {
                    newTextChan.setParent(category);
                    newTextChan.send(config["new-chatroom-msg"])

                    message.reply(`we made your channel <#${newTextChan.id}>, click the link to join!`);
                });

                // Create voice channel
                message.guild.channels.create('Voice', {'type': 'voice'}).then(newVoiceChan => {
                    newVoiceChan.setParent(category);
                });

            });
            
            logger.log("PT channel Created (txt)", `${message.author}`)
            return true;
 
        } else {
            message.reply(`You can only use this command in <#${config['create-room-id']}>`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });

            throw new CommandError("!createsticky wrong room", `${message.author}`);
        }
    }
}