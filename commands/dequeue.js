const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const common = require('../custom_modules/common.js');
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'dq',
    description: 'puts a student into a queue',
    slashes: [
        new SlashCommandBuilder()
            .setName('dq')
            .setDescription('Removes you from the queue')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('(PT use only) The person to remove from the queue')
                    .setRequired(false))
            .addStringOption(option => 
                option.setName('multiple-users')
                    .setDescription('(PT use only) Mention multiple users to remove them')
                    .setRequired(false))
    ],

    permissions: {
        dq: {
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
            await interaction.reply({content: 'You don\'t have permission to dequeue other users!', ephemeral: true});
            throw new CommandError('/dq insufficient permissions', `${interaction.member}`);
        }

        // If no args used, dq self
        if (!(target || targetMany)) { target = interaction.member; }

        // Add target to the dq list along with any other specified users
        let targetList = (target)? [target.id] : [];
        for (const user of targetMany?.replace('><', '> <').split(' ')) {
            if ((user.startsWith('<@') || user.startsWith('<@!')) && user.endsWith('>')) {
                const idStart = user.split('').findIndex(e => e >= '0' && e <= '9');
                targetList.push(user.substring(idStart, user.length-1));
            }
        }

        let found = false;
        let dqString = "";
        let dqAllIds = "";
        let dqCourses = "";
        let dqPrintString = "";
        for (let id of targetList) {
            dqAllIds += ` <@${id}>`
            for (const [course, queue] of queues) {
                for (let i = 0; i < queue.length; i++) {
                    if (queue[i].user === id) {
                        queue.splice(i, 1); // Remove the user from the queue
                        found = true;

                        // Remove the queued role
                        interaction.guild.members.fetch(id).then(user => {
                            user.roles.remove(config['role-q-code']);
                        });

                        // Record the data of the removed member to output later
                        dqString += ` <@${id}>`;
                        dqCourses += ` ${course.substring(5)}`;
                        dqPrintString += `<@${id}>\n`;
                    }
                }
            }
        }

        save.saveQueue(queues);
        data.updateQueues.val = true;

        // Respond to the user
        if (found) {
            if (target?.id === interaction.member.id) {
                await interaction.reply(`Done! We removed you from the${dqCourses} queue`);
                logger.log(`/dq self from${dqCourses}`, `${interaction.member}`);
            } else if (targetList.length === 1) {
                await interaction.reply(`We removed <@${targetList[0]}> from the${dqCourses} queue`);
                logger.log(`/dq <@${targetList[0]}> from the${dqCourses} queue`, `${interaction.member}`);
            } else {
                await interaction.reply(`> We removed the following from the queue\n${dqPrintString}`);
                logger.log(`/dq${dqAllIds} from${dqCourses}`, `${interaction.member}`);
            }    
        } else {
            if (target?.id === interaction.member.id) {
                await interaction.reply({content: 'You were not in a queue (so no action is required)', ephemeral: true});
                throw new CommandError('/dq self not in queue', `${interaction.member}`);
            } else if (targetList.length === 1) {
                await interaction.reply({content: `<@${targetList[0]}> wasn't in a queue`, ephemeral: true});
                throw new CommandError(`/dq <@${targetList[0]}> not in queue`, `${interaction.member}`);
            } else {
                await interaction.reply({content: `None of${dqAllIds} were in a queue`, ephemeral: true});
                throw new CommandError(`/dq nobody from${dqAllIds}`, `${interaction.member}`);
            }
        }

        return true;
    },

    async execute(msg, args, options) {
        let queues = options.queues;

        // Target represents the user(s) to be dequeued 
        let target = new Map();
        target = msg.mentions.users;

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            if (target.size == 0) {
                replies.timedReply(msg, `your message \`${msg}\` contained no valid users, so nobody was dequeued`, config['bot-alert-timeout']);
                throw new CommandError(`!dq no valid users ${msg}`, `${msg.author}`);
            }

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!dq insufficient permissions", `${msg.author}`);
        }

        // Find the users
        let dqString = "";
        let dqAllIds = "";
        let dqCourses = "";
        let dqPrintString = "";
        let dqSelf = false;

        // DQ the user if they did not use any arguments
        if (target.size == 0) {
            target.set(`${msg.author.id}`, msg.author);
            dqSelf = true;
        }

        // Find the user inside the queue system
        let found = false
        for ([id, member] of target) {
            dqAllIds += ` <@${id}>`

            for (let [course, list] of queues) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].user === id) {
    
                        // Take the user out of the queue
                        list.splice(i, 1);
    
                        // Remove the queued role
                        msg.guild.members.fetch(id).then(user => {
                            user.roles.remove(config['role-q-code']);
                        })

                        found = true
    
                        if (dqSelf) {
                            // We are only removing this user, so we exit the function here
                            logger.log(`!dq self from ${course}`, `${msg.author}`)
                            msg.react('✅')
                            save.saveQueue(queues);
                            options.updateQueues.val = true;
                            return true;
                        } else {
                            // Record the data of the removed member to output later
                            dqString += ` ${member}`;
                            dqCourses += ` ${course}`;
                            dqPrintString += `${member}\n`
                        }
                    }
                }
            }
        }

        save.saveQueue(queues);
        options.updateQueues.val = true;
        
        if (dqSelf) {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            msg.react('❌')
            throw new CommandError(`!dq self not in queue`, `${msg.author}`);
        } else {
            if (found) {
                logger.log(`!dq${dqString} from${dqCourses}`, `${msg.author}`)
                if (target.size > 1) {
                    msg.channel.send(`> We removed the following from the queue\n${dqPrintString}`)
                } else {
                    msg.react('✅')
                }
            } else {
                logger.log(`!dq nobody from${dqAllIds}`, `${msg.author}`)
                if (target.size > 1) {
                    replies.timedReply(msg, `none of${dqAllIds} were in a queue`, config['bot-alert-timeout']);
                } else {
                    replies.timedReply(msg, `${target.values().next().value} was not in a queue`, config['bot-alert-timeout']);
                }
            }

            return true;
        }
    }
}