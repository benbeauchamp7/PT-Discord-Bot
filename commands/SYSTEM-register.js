const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const rest = new REST({version: '9'}).setToken(process.env.BOT_TOKEN);
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const logger = require('../custom_modules/logging.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

// It just pings to be sure the bot is alive
module.exports = {
    name: 'sys-register',
    description: 'Registers slash commands (production does this automatically)',
    slashes: [
        new SlashCommandBuilder()
            .setName('sys-register')
            .setDescription('Registers slash commands (production does this automatically)')
    ],

    permissions: {
        'sys-register': {
            permissions: [{
                id: '731673496656019457',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        if (!message.member.roles.cache.find(r => config['admin-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#sys-register insufficient perms", `${message.author}`);
        }

        logger.log("Registration requested", `${interaction.member}`);
        let permsList = [];

        try {
            logger.log('Refreshing application commands...', "none");
            
            rest.put(
                Routes.applicationGuildCommands(process.env.BOT_ID, config['guildId']),
                { body: data.commandList }
            ).then(response => {
                let cname = null;
                try {
                    for (const command of response) { /// Get ids from the commands to set permissions
                        cname = command['name'];
                        data.permsDict.get(command['name'])['id'] = command['id']
                        permsList.push({
                            id: command['id'],
                            permissions: data.permsDict.get(command['name'])['permissions']
                        })
                    }
                } catch (err) {
                    console.log(err);
                    logger.log(`ERROR in ready for command ${cname}`, 'ERROR');
                }
                    
    
                data.bot.guilds.fetch(config['guildId']).then(rep => { /// Set permissions for the commands
                    rep.commands.permissions.set({fullPermissions: permsList }).then(() => {
                        logger.log('Done refreshing application commands!', 'none');
                    }).catch(err => {console.log(err)});
                })
            })
        } catch (err) {
            logger.logError(err)
        }

        await interaction.reply('Done, commands registered');
    },

    async execute(message, args, options) {
        logger.log("Registration requested", `${message.member}`);
        let permsList = [];
        
        try {
            logger.log('Refreshing application commands...', "none");

            rest.put(
                Routes.applicationGuildCommands(process.env.BOT_ID, config['guildId']),
                { body: options.commandList }
            ).then(response => {
                let cname = null;
                try {
                    for (const command of response) { /// Get ids from the commands to set permissions
                        cname = command['name'];
                        options.permsDict.get(command['name'])['id'] = command['id']
                        permsList.push({
                            id: command['id'],
                            permissions: options.permsDict.get(command['name'])['permissions']
                        })
                    }
                } catch (err) {
                    console.log(err);
                    logger.log(`ERROR in ready for command ${cname}`, 'ERROR');
                }
                    
    
                options.bot.guilds.fetch(config['guildId']).then(rep => { /// Set permissions for the commands
                    rep.commands.permissions.set({fullPermissions: permsList }).then(() => {
                        logger.log('Done refreshing application commands!', 'none');
                    }).catch(err => {console.log(err)});
                })
            })
        } catch (err) {
            logger.logError(err)
        }

        message.reply('Done, commands registered!');
        return true;
    }
}