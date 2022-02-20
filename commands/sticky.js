// FILE CAN BE DELETED

const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');

// Just a room with creation permissions and a separate configuration for inactivity
module.exports = {
    name: 'sticky',
    description: 'Makes a set of discussion channels',
    async execute(message, args, options) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            message.reply(`Only PT's can make sticky rooms!`).then(reply => {
                setTimeout(() => { reply.delete(); }, timeout);
                setTimeout(() => { message.delete(); }, timeout);
            });

            throw new CommandError("!sticky insufficient permissions", `${message.author}`);
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
                            setTimeout(() => { reply.delete(); }, timeout);
                            setTimeout(() => { message.delete(); }, timeout);
                        });
                        logger.log("bad word in title creation", `${message.author}`);
                        badWordFound = true;
                    }
                }
            }

            if (badWordFound === true) { throw new CommandError("!sticky bad language", `${message.author}`); }

            // Create a category for the student picked topic
            if (args.length === 0) { args = ['Unnamed']; }
            message.guild.channels.create(args.join(' ') + " " + config['sticky-chan-specifier'], {
                'type': 'GUILD_CATEGORY',
                'permissionOverwrites': [
                    {
                        // Remove view permissions from everyone
                        id: message.guild.roles.everyone,
                        deny: ['VIEW_CHANNEL']
                    },
                    {
                        // Set view for "welcome role"
                        id: message.guild.roles.cache.get(config['role-welcome-code']),
                        allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]

                    }
                ]
            }).then(category => {

                // Move cat above archive
                category.setPosition(-1, {"relative": true});

                // Create text channel
                message.guild.channels.create(args.join('-'), {
                    'parent': category,
                    'permissionOverwrites': [
                        {
                            // Remove view permissions from everyone
                            id: message.guild.roles.everyone,
                            deny: ['VIEW_CHANNEL']
                        },
                        {
                            // Set view for "welcome role"
                            id: message.guild.roles.cache.get(config['role-welcome-code']),
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                            
                        }
                    ]
                }).then(newTextChan => {
                    newTextChan.send(config["new-chatroom-msg"])
                    newTextChan.send("*Be sure to delete this room with `!end` when you are finished with it*")
                    
                    message.reply(`We made your channel <#${newTextChan.id}>, click the link to join!`);
                });
                
                // Create voice channel
                message.guild.channels.create('Voice', {
                    'type': 'GUILD_VOICE',
                    'parent': category,
                    'permissionOverwrites': [
                        {
                            // Remove view permissions from everyone
                            id: message.guild.roles.everyone,
                            deny: ['VIEW_CHANNEL']
                        },
                        {
                            // Set view for "welcome role"
                            id: message.guild.roles.cache.get(config['role-welcome-code']),
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
    
                        }
                    ]
                });
            });
            
            logger.log("PT channel Created (txt)", `${message.author}`)
            return true;
 
        } else {
            message.reply(`You can only use this command in <#${config['create-room-id']}>`).then(reply => {
                setTimeout(() => { reply.delete(); }, timeout);
                setTimeout(() => { message.delete(); }, timeout);
            });

            throw new CommandError("!createsticky wrong room", `${message.author}`);
        }
    }
}