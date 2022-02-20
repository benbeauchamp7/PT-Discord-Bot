const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'lock',
    description: 'prevents other users from joining a voice channel',
    slashes: [
        new SlashCommandBuilder()
            .setName('lock')
            .setDescription('Prevents other users from joining the temporary voice channel you\'re currently in')
    ],

    permissions: {
        lock: {
            permissions: [{
                id: '750838675763494995',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        if (!interaction.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            // Insufficient permissions
            await interaction.reply({content: "You do not have permission to use this command", ephemeral: true});
            throw new CommandError("/lock insufficient permissions", `${interaction.member}`);

        }
        
        const parent = interaction.channel.parent;
        if (!parent.name.endsWith(config['student-chan-specifier']) && !parent.name.endsWith(config['sticky-chan-specifier'])) {
            // Incorrect Channel
            await interaction.reply({content: "You can only use this in a temporary chat room", ephemeral: true});
            throw new CommandError("/lock wrong room", `${interaction.member}`);

        } 
        
        let voiceChan = interaction.member.voice.channel;
        if (!(voiceChan !== null && voiceChan.parent === parent && voiceChan.name === "Voice")) {
            // You must be in the corresponding voice channel
            await interaction.reply({content: "You must be in this room's \"Voice\" channel to use this command", ephemeral: true});
            throw new CommandError("/lock not in VC", `${interaction.member}`);
        }

        voiceChan.lockPermissions().then(voiceChan => {
            let perms = [];

            // Deny everyone of view
            perms.push({
                id: interaction.guild.roles.everyone,
                deny: ['VIEW_CHANNEL']
            })

            // Deny # welcome of connecting perms
            perms.push({
                id: interaction.guild.roles.cache.get(config['role-welcome-code']),
                deny: ['CONNECT'],
                allow: ['VIEW_CHANNEL']
            })
            
            
            // Set permissions for all the occupant members
            for (fella of voiceChan.members) {
                perms.push({
                    id: fella[1],
                    allow: ['CONNECT', 'VIEW_CHANNEL']
                })
            }

            // Set permissions for elevated members
            for (role of voiceChan.guild.roles.cache) {
                if (config['elevated-roles'].includes(role[1].name)) {
                    perms.push({
                        id: role[1],
                        allow: ['CONNECT', 'VIEW_CHANNEL']
                    })
                }
            }

            // Apply changes
            voiceChan.permissionOverwrites.set(perms).then(() => {
                interaction.reply({content: "Locked! Nobody new can join this voice channel (other than staff)", ephemeral: false});
                logger.log(`locked #${parent.name}`, `${interaction.member}`);
            });
            
        });
    },

    async execute(message) {
        
        // Elevated check
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Used in a temp set
            const parent = message.channel.parent;
            if (parent.name.endsWith(config['student-chan-specifier'] || parent.name.endsWith(config['sticky-chan-specifier']))) {

                // While in a matching voice channel
                let voiceChan = message.member.voice.channel;
                if (voiceChan !== null && voiceChan.parent === parent && voiceChan.name === "Voice") {
                    voiceChan.lockPermissions().then(voiceChan => {
                        let perms = [];

                        // Deny everyone of view
                        perms.push(
                            {
                                id: message.guild.roles.everyone,
                                deny: ['VIEW_CHANNEL']
                            }
                        )

                        // Deny # welcome of connecting perms
                        perms.push(
                            {
                                id: message.guild.roles.cache.get(config['role-welcome-code']),
                                deny: ['CONNECT'],
                                allow: ['VIEW_CHANNEL']
                            }
                        )
                        
                        
                        // Set permissions for all the occupant members
                        for (fella of voiceChan.members) {
                            perms.push(
                                {
                                    id: fella[1],
                                    allow: ['CONNECT', 'VIEW_CHANNEL']
                                }
                            )
                        }

                        // Set permissions for elevated members
                        for (role of voiceChan.guild.roles.cache) {
                            if (config['elevated-roles'].includes(role[1].name)) {
                                perms.push(
                                    {
                                        id: role[1],
                                        allow: ['CONNECT', 'VIEW_CHANNEL']
                                    }
                                )
                            }
                        }
                        

                        // Apply changes
                        voiceChan.permissionOverwrites.set(perms).then(() => {
                            message.reply("Locked! Nobody new can join this voice channel (other than staff)")
                            logger.log(`locked #${parent.name}`, `${message.author}`)
                        });
                    });

                } else {
                    // You must be in the corresponding voice channel
                    replies.timedReply(message, "you must be in this room's \"Voice\" channel to use this command", config['bot-alert-timeout']);
                    throw new CommandError("!lock not in VC", `${message.author}`);
                }

            } else {
                // Incorrect Channel
                replies.timedReply(message, "you can only use this in a temporary chat room", config['bot-alert-timeout']);
                throw new CommandError("!lock wrong room", `${message.author}`);
            }

        } else {
            // insufficient permissions
            replies.timedReply(message, "you do not have permission to use this command", config['bot-alert-timeout']);
            throw new CommandError("!lock insufficient permissions", `${message.author}`);
        }


        return true;
    }
}