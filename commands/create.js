const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'create',
    description: 'Makes a set of discussion channels',
    slashes: [
        new SlashCommandBuilder()
            .setName('create')
            .setDescription('Creates a chatroom that times out after 20 minutes of inactivity')
            .addStringOption(option => 
                option.setName('name')
                    .setDescription('The name of the chatroom')
                    .setRequired(true))
    ],

    permissions: {
        create: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        const name = interaction.options.getString('name');
        const defaultPermsList = [
            {
                // Remove view permissions from everyone
                id: interaction.guild.roles.everyone,
                deny: ['VIEW_CHANNEL']
            },
            {
                // Set view for "welcome role"
                id: interaction.guild.roles.cache.get(config['role-welcome-code']),
                allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]

            }
        ];

        if (data.cooldown.has(interaction.member.id)) {
            const cooldownTime = config['channel-create-cooldown']
            const timeLeft = cooldownTime - (Date.now() - cooldown.get(interaction.member.id));
            await interaction.reply({content: `You're on cooldown for creating rooms, try again in ${(timeLeft / 1000 + 1).toFixed(0)} seconds`, ephemeral: true});
            throw new CommandError("!create on cooldown", `${message.author}`);
        }

        interaction.guild.channels.create(`${name} ${config['student-chan-specifier']}`, {
            'type': 'GUILD_CATEGORY',
            'permissionOverwrites': defaultPermsList
        }).then(category => {
            // Move cat above archive
            category.setPosition(-1, {"relative": true}).then(() => {
                
                // Create text channel
                interaction.guild.channels.create(name, {
                    'parent': category,
                    'permissionOverwrites': defaultPermsList
                }).then(newTextChan => {

                    newTextChan.send(config["new-chatroom-msg"])

                    if (data.auto === undefined) {
                        interaction.reply({content: `We made your channel <#${newTextChan.id}>, click the link to join!`, ephemeral: false});
                    }
                });

                // Create voice channels
                interaction.guild.channels.create('Voice', {
                    'type': 'GUILD_VOICE',
                    'parent': category,
                    'permissionOverwrites': defaultPermsList
                }).then(voiceChan => {
                    if (data.auto) { data.user.voice.setChannel(voiceChan.id); }
                });
            });


            logger.log("Channel Created (txt)", `${interaction.member}`)
            return true;

        });
    },

    async execute(message, args, options) {
        const user = options.user;
        const isAuto = options.auto;
        const cooldown = options.cooldown;
        const timeout = config['bot-alert-timeout'];
        const chan = message.channel;

        if (chan.name == 'create-room' || chan.name == 'bot-channel') {

            // Don't let user create a channel if they are on cooldown
            if (cooldown.has(user.id)) {
                const cooldownTime = config['channel-create-cooldown']
                const timeLeft = cooldownTime - (Date.now() - cooldown.get(user.id));
                message.reply(`You're on cooldown for creating rooms, try again in ${(timeLeft / 1000 + 1).toFixed(0)} seconds`).then(reply => {
                    setTimeout(() => { reply.delete(); }, timeout);
                    setTimeout(() => { message.delete(); }, timeout);
                });

                throw new CommandError("!create on cooldown", `${message.author}`);
            }

            // Create a category for the student picked topic
            if (args.length === 0) { args = ['Unnamed']; }
            message.guild.channels.create(args.join(' ') + " " + config['student-chan-specifier'], {
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
                category.setPosition(-1, {"relative": true}).then(() => {
    
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
    
                        if (isAuto === undefined) {
                            message.reply(`We made your channel <#${newTextChan.id}>, click the link to join!`);
                        }
                    });
    
                    // Create voice channels
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
                    }).then(voiceChan => {
    
                        if (isAuto) {
                            user.voice.setChannel(voiceChan.id);
                        }
    
                    });

                });

            });

            
            logger.log("Channel Created (txt)", `${message.author}`)
            return true;
 
        } else {
            message.reply(`You can only use this command in <#${config['create-room-id']}>`).then(reply => {
                setTimeout(() => { reply.delete(); }, timeout);
                setTimeout(() => { message.delete(); }, timeout);
            });

            throw new CommandError("!create wrong room", `${message.author}`);
        }
    }
}