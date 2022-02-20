const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const CommandError = require('../custom_modules/commandError.js');
const common = require('../custom_modules/common.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'nr',
    description: 'sets a person\'s queue status to unready',
    slashes: [
        new SlashCommandBuilder()
            .setName('nr')
            .setDescription('Sets your queue status to unready')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('(PT use only) The person to mark as unready')
                    .setRequired(false))
            .addStringOption(option => 
                option.setName('multiple-users')
                    .setDescription('(PT use only) Mention multiple users to unready them')
                    .setRequired(false))
    ],

    permissions: {
        nr: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        let queues = data.queues;
        let target = interaction.options.getUser('user');
        let targetMany = interaction.options.getString('multiple-users');

        // Permissions check
        if ((target || targetMany) && !common.roleCheck(interaction.member, config['elevated-roles'])) {
            await interaction.reply({content: 'You don\'t have permission to unready other users!', ephemeral: true});
            throw new CommandError('/ur insufficient permissions', `${interaction.member}`);
        }

        // If no args used, r self
        if (!(target || targetMany)) { target = interaction.member; }

        // Add target to the dq list along with any other specified users
        let targetList = (target)? [target.id] : [];
        if (targetMany) {
            for (const user of targetMany.replace('><', '> <').split(' ')) {
                console.log(user);
                if ((user.startsWith('<@') || user.startsWith('<@!')) && user.endsWith('>')) {
                    const idStart = user.split('').findIndex(e => e >= '0' && e <= '9');
                    targetList.push(user.substring(idStart, user.length-1));
                }
            }
        }

        let found = false;
        let unreadyAllIds = "";
        let unreadyPrintString = "";
        for (let id of targetList) {
            unreadyAllIds += ` <@${id}>`
            for (const [course, queue] of queues) {
                for (let i = 0; i < queue.length; i++) {
                    if (queue[i].user === id) {

                        // unReady the user
                        if (queue[i].readyTime + config['nr-cooldown'] < Date.now()) {
                            queue[i].ready = false;
                            found = true;
                        } else if (target === interaction.member) {
                            await interaction.reply({content: `you cannot use \`!nr\` until ${common.parseTime(queue[i].readyTime + config['nr-cooldown'])}`, ephemeral: true});
                            throw new CommandError("!nr on cooldown", `${interaction.member}`);
                        } else if (targetList.length === 1) {
                            await interaction.reply({content: `<@${id}> cannot be marked as not ready until ${common.parseTime(queue[i].readyTime + config['nr-cooldown'])}`, ephemeral: true});
                            throw new CommandError(`!nr <@${id}> on cooldown`, `${interaction.member}`);
                        } else {
                            break;
                        }

                        // Record the data of the readied member to output later
                        unreadyPrintString += `<@${id}>\n`;
                    }
                }
            }
        }

        save.saveQueue(queues);
        data.updateQueues.val = true;

        // Respond to the user
        if (found) {
            if (target?.id === interaction.member.id) {
                await interaction.reply(`Done!`);
                logger.log(`/nr self`, `${interaction.member}`);
            } else if (targetList.length === 1) {
                await interaction.reply(`<@${targetList[0]}> is now marked as not ready`);
                logger.log(`/nr <@${targetList[0]}>`, `${interaction.member}`);
            } else {
                await interaction.reply(`> We marked the following users as not ready\n${unreadyPrintString}`);
                logger.log(`/nr${unreadyAllIds}`, `${interaction.member}`);
            }    
        } else {
            if (target?.id === interaction.member.id) {
                await interaction.reply({content: 'You were not in a queue (so no action is required)', ephemeral: true});
                throw new CommandError('/nr self not in queue', `${interaction.member}`);
            } else if (targetList.length === 1) {
                await interaction.reply({content: `<@${targetList[0]}> wasn't in a queue`, ephemeral: true});
                throw new CommandError(`/nr <@${targetList[0]}> not in queue`, `${interaction.member}`);
            } else {
                await interaction.reply({content: `None of${unreadyAllIds} were in a queue`, ephemeral: true});
                throw new CommandError(`/nr nobody from${unreadyAllIds}`, `${interaction.member}`);
            }
        }

        return true;
    },

    async execute(msg, args, options) {
        let queues = options.queues;

        let target = new Map();
        target = msg.mentions.users;

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            if (target.size == 0) {
                replies.timedReply(msg, `your message \`${msg}\` contained no valid users, so nobody was unreadied`, config['bot-alert-timeout']);
                throw new CommandError(`!nr no valid users ${msg}`, `${msg.author}`);
            }

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!nr insufficient permissions", `${msg.author}`);
        }

        // Find the users
        let unreadyString = "";
        let unreadyAllIds = "";
        let unreadyPrintString = "";
        let unreadySelf = false;

        // unReady the user if they did not use any arguments
        if (target.size == 0) {
            target.set(`${msg.author.id}`, msg.author);
            unreadySelf = true;
        }

        let found = false
        for ([id, member] of target) {
            unreadyAllIds += ` <@${id}>`

            for (let [course, list] of queues) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].user === id) {
    
                        
                        // unReady the user
                        if (list[i].readyTime + config['nr-cooldown'] < Date.now()) {
                            list[i].ready = false
                            found = true;
                        } else if (unreadySelf) {
                            replies.timedReply(msg, `you cannot use \`!nr\` until ${common.parseTime(list[i].readyTime + config['nr-cooldown'])}`, config['bot-alert-timeout']);
                            throw new CommandError("!nr on cooldown", `${msg.author}`);
                        } else if (target.size === 1) {
                            replies.timedReply(msg, `<@${id}> cannot be marked as not ready until ${common.parseTime(list[i].readyTime + config['nr-cooldown'])}`, config['bot-alert-timeout']);
                            throw new CommandError(`!nr <@${id}> on cooldown`, `${msg.author}`);
                        } else {
                            break;
                        }
                        
    
                        if (unreadySelf) {
                            logger.log(`!unready self`, `${msg.author}`)
							msg.react('✅')
							save.saveQueue(queues);
                            options.updateQueues.val = true;

                            return true;
                        } else {
                            unreadyString += ` ${member}`;
                            unreadyPrintString += `${member}\n`
                        }
                    }
                }
            }
        }

        save.saveQueue(queues);
        options.updateQueues.val = true;
        
        if (unreadySelf) {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            throw new CommandError(`!unready self not in queue`, `${msg.author}`);
        } else {
            if (found) {
                logger.log(`!nr${unreadyString}`, `${msg.author}`)
                if (target.size > 1) {
                    msg.channel.send(`> The following users are now marked as not ready\n${unreadyPrintString}`)
                } else {
                    msg.react('✅')
                }
            } else {
                logger.log(`!nr nobody from${unreadyAllIds}`, `${msg.author}`)
                if (target.size > 1) {
                    replies.timedReply(msg, `none of${unreadyAllIds} could be un-readied`, config['bot-alert-timeout']);
                } else {
                    replies.timedReply(msg, `${target.values().next().value} was not in a queue`, config['bot-alert-timeout']);
                }
            }

            return true;
        }
    }
}