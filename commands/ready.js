const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const CommandError = require('../custom_modules/commandError.js');
const common = require('../custom_modules/common.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

function roleCheck(msg, roles) { // NOT NEEDED FOR executeInteraction
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'r',
    description: 'sets a person\'s queue status to not ready',
    slashes: [
        new SlashCommandBuilder()
            .setName('r')
            .setDescription('Sets your queue status to ready')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('(PT use only) The person to mark as ready')
                    .setRequired(false))
            .addStringOption(option => 
                option.setName('multiple-users')
                    .setDescription('(PT use only) Mention multiple users to ready them')
                    .setRequired(false))
    ],

    permissions: {
        r: {
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
            await interaction.reply({content: 'You don\'t have permission to ready other users!', ephemeral: true});
            throw new CommandError('/r insufficient permissions', `${interaction.member}`);
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
        let readyAllIds = "";
        let readyPrintString = "";
        for (let id of targetList) {
            readyAllIds += ` <@${id}>`
            for (const [course, queue] of queues) {
                for (let i = 0; i < queue.length; i++) {
                    if (queue[i].user === id) {
                        queue[i].ready = true; // Ready the user in the queue
                        found = true;

                        // Record the data of the readied member to output later
                        readyPrintString += `<@${id}>\n`;
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
                logger.log(`/r self`, `${interaction.member}`);
            } else if (targetList.length === 1) {
                await interaction.reply(`<@${targetList[0]}> is now ready!`);
                logger.log(`/r <@${targetList[0]}>`, `${interaction.member}`);
            } else {
                await interaction.reply(`> We readied the following users\n${readyPrintString}`);
                logger.log(`/r${readyAllIds}`, `${interaction.member}`);
            }    
        } else {
            if (target?.id === interaction.member.id) {
                await interaction.reply({content: 'You were not in a queue (so no action is required)', ephemeral: true});
                throw new CommandError('/r self not in queue', `${interaction.member}`);
            } else if (targetList.length === 1) {
                await interaction.reply({content: `<@${targetList[0]}> wasn't in a queue`, ephemeral: true});
                throw new CommandError(`/r <@${targetList[0]}> not in queue`, `${interaction.member}`);
            } else {
                await interaction.reply({content: `None of${readyAllIds} were in a queue`, ephemeral: true});
                throw new CommandError(`/r nobody from${readyAllIds}`, `${interaction.member}`);
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
                replies.timedReply(msg, `your message \`${msg}\` contained no valid users, so nobody was readied`, config['bot-alert-timeout']);
                throw new CommandError(`!r no valid users ${msg}`, `${msg.author}`);
            }

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!r insufficient permissions", `${msg.author}`);
        }

        // Find the users
        let readyString = "";
        let readyAllIds = "";
        let readyPrintString = "";
        let readySelf = false;

        // Ready the user if they did not use any arguments
        if (target.size == 0) {
            target.set(`${msg.author.id}`, msg.author);
            readySelf = true;
        }

        let found = false
        for ([id, member] of target) {
            readyAllIds += ` <@${id}>`

            for (let [course, list] of queues) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].user === id) {

                        if (!list[i].ready) {
                            list[i].readyTime = Date.now();
                        }
                        
                        // Ready the user
                        list[i].ready = true;

                        found = true;

                        if (readySelf) {
                            // Only reading the one person, so we can end the function
                            logger.log(`!ready self`, `${msg.author}`)
                            msg.react('✅')
                            save.saveQueue(queues);
                            options.updateQueues.val = true;

                            return true;
                        } else {
                            // If multiple, record the information of the successful ready
                            readyString += ` ${member}`;
                            readyPrintString += `${member}\n`
                        }
                    }
                }
            }
        }

        save.saveQueue(queues);
        options.updateQueues.val = true;
        
        if (readySelf) {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            throw new CommandError(`!ready self not in queue`, `${msg.author}`);
        } else {
            if (found) {
                logger.log(`!ready${readyString}`, `${msg.author}`)
                if (target.size > 1) {
                    msg.channel.send(`> We readied the following users\n${readyPrintString}`)
                } else {
                    msg.react('✅')
                }
            } else {
                logger.log(`!ready nobody from${readyAllIds}`, `${msg.author}`)
                if (target.size > 1) {
                    replies.timedReply(msg, `none of${readyAllIds} were in a queue`, config['bot-alert-timeout']);
                } else {
                    replies.timedReply(msg, `${target.values().next().value} was not in a queue`, config['bot-alert-timeout']);
                }
            }

            return true;
        }
    }
}