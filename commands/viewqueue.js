const logger = require('../custom_modules/logging.js');
const CommandError = require('../custom_modules/commandError.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const Discord = require('discord.js');
const replies = require('../custom_modules/replies.js');
const common = require('../custom_modules/common.js');

const { SlashCommandBuilder } = require('@discordjs/builders');

function getPlace(rank) {
    switch (rank) {
        case 1:  return "**first**";
        case 2:  return "**second**";
        case 3:  return "**third**";
        case 4:  return "**fourth**";
        case 5:  return "**fifth**";
        case 6:  return "**sixth**";
        case 7:  return "**seventh**";
        case 8:  return "**eighth**";
        case 9:  return "**ninth**";
        default: return "number **" + rank + "**";
    }
}

async function displayCurrChan(msg, qList) { // Not used by slash command
    let qNameStr = "";
    let qTimeStr = "";

    // Prepare display strings
    for (let i = 0; i < qList.length; i++) {
        if (qList[i].ready === true || qList[i].ready === undefined) {
            qNameStr += `${i + 1}. ${await msg.guild.members.fetch(qList[i].user)}\n`
        } else {
            qNameStr += `~~${i + 1}. ${await msg.guild.members.fetch(qList[i].user)}~~\n`
        }

        qTimeStr += common.parseTime(qList[i].time) + '\n';
    }

    if (qList.length === 0) {

        // For empty queues
        logger.log(`!vq std (empty) for ${msg.channel.name.slice(5)}`, `${msg.author}`)

        return new Discord.MessageEmbed()
            .setColor('#500000')
            .setTitle(`Course queue`)
            .setDescription(`Queue of ${msg.channel.name.slice(5)}`)
            .addFields(
                { name: 'Status', value: 'Queue is Empty!'}
            )
            .setFooter(`Queue is valid as of ${common.parseTime(new Date())} & will expire at ${common.parseTime(new Date(Date.now() + config['vq-expire']))}`)

    } else {
        // For nonempty queues
        logger.log(`!vq std for ${msg.channel.name.slice(5)} len ${qList.length}`, `${msg.author}`)

        return new Discord.MessageEmbed()
            .setColor('#500000')
            .setTitle(`Course queue`)
            .setDescription(`Queue of ${msg.channel.name.slice(5)}`)
            .addFields(
                { name: 'Student', value: qNameStr, inline: true },
                { name: 'Queue Time', value: qTimeStr, inline: true }
            )
            .setFooter(`Queue is valid as of ${common.parseTime(new Date())} & will expire at ${common.parseTime(new Date(Date.now() + config['vq-expire']))}`)
    }
}

async function getTarget(msg, mention) { /// Not used for slash commands

    // Check for valid mention and for mentioned user's roles if mention
    let mentionUser = undefined;
    if (mention.match(/^<@!?(\d+)>$/g)) {
        mentionUser = await msg.guild.members.fetch(mention.replace(/[\\<>@#&!]/g, ""));
    }

    if (mention == 'me') {
        mentionUser = await msg.guild.members.fetch(msg.author.id);
    }

    if (mention === undefined) {
        replies.timedReply(msg, "that user does not exist", config['bot-alert-timeout'])
        throw new CommandError(`!vq undefined user [${args[0].replace(/[\\<>@#&!]/g, "")}]`, `${msg.author}`)
    }

    return mentionUser;
}

function getCoursesFromUser(userMention) { /// Not used for slash commands
    // Should print the queue using the peer teacher's classes
    let args = [];
    for (role of userMention.roles.cache) {
        role = role[1];
        if (role.name.startsWith("CSCE")) {
            args.push(common.parseRoleToEmote(role.name)) // Gets the number from the role
        }
    }

    // If peer teacher has no classes, fail the command
    if (args.length === 0) {
        timedMessage(msg, `${mention} isn't registered for any classes (maybe they forgot to stop by <#737169678677311578>?)`, config['bot-alert-timeout'])
        throw new CommandError(`!vq ${mention} not registered`, `${msg.author}`);
    }

    args.sort();

    return args;
}

function getPlaceInLine(msg, queues, user, args, spliced) { /// Not used for slash commands
    // Tell them the mentioned's spot in line
    if (!spliced) {
        for (let [key, qList] of queues) {
            for (let i = 0; i < qList.length; i++) {
                if (user.id === qList[i].user) {
                    let position = getPlace(i + 1);
                    
                    msg.channel.send(`${user} is ${position} in the ${key} queue`);
                    logger.log(`!vq ${user} in line`, `${msg.author}`)
                    return true;
                }
            }
        }
    } else {
        let qList = combineQueues(msg, args, queues);
        for (let i = 0; i < qList.length; i++) {
            if (user.id === qList[i].user) {
                let position = getPlace(i + 1);
                
                msg.channel.send(`${user} is ${position} in the ${args.join(', ')} queue`);
                logger.log(`!vq ${user} in line`, `${msg.author}`)
                return true;
            }
        }
    }

    // Person not found in the queues
    msg.channel.send(`${user} is not in line`);
    throw new CommandError(`!vq ${user} not in line`, `${msg.author}`);
}

function combineQueuesInteraction(queues, courses) {
    let targetQueues = [];
    for (const course of courses) {
        targetQueues.push(JSON.parse(JSON.stringify(queues.get(common.parseEmoteToChannel(course)))));
    }

    let combined = [];
    let nonemptyQueues = targetQueues.length;
    while (nonemptyQueues > 0) {
        let min = null;
        let minIndex = null;
        nonemptyQueues = targetQueues.length;

        // Pick user with earliest time from available queues
        for (let c = 0; c < courses.length; c++) {
            // Skip empty queues
            if (targetQueues[c].length === 0) { nonemptyQueues -= 1; continue; }

            // Update the min if needed
            if (min === null || typeof targetQueues[c] === 'string' || targetQueues[c][0].time < min) {
                min = targetQueues[c][0].time;
                minIndex = c;
            }
        }

        // Add the valid user to the combined queue if we found one
        if (minIndex != null) {
            combined.push({
                user: targetQueues[minIndex][0].user, 
                course: courses[minIndex], 
                time: targetQueues[minIndex][0].time,
                ready: targetQueues[minIndex][0].ready
            });

            targetQueues[minIndex].shift();
        }
    }

    return combined;

}

function combineQueues(msg, args, queues) { /// Not used for slash commands
    // Combines specified queues together such that they are all sorted by time regardless of class
    let courses = [];
    let targetQueues = [];

    for (course of args) {
        try {
            // Deep copy to bundles
            if (course.startsWith("<@")) {
                if (!queues.has(course)) { queues.set(course, []); }
                targetQueues.push(JSON.parse(JSON.stringify(queues.get(course))));

            } else if (config["personal-q-aliases"].includes(course)) {
                course = `<@${msg.author.id}>`;
                if (!queues.has(course)) { queues.set(course, []); }
                targetQueues.push(JSON.parse(JSON.stringify(queues.get(course))));

            } else {
                targetQueues.push(JSON.parse(JSON.stringify(queues.get(common.parseEmoteToChannel(course)))));
            }

        } catch (err) {
            replies.timedReply(msg, "Unrecognized course, please try again", config['bot-alert-timeout'])
            console.log(err);
            throw new CommandError(`unrecognized course in "[${args}]"`, `${msg.author.id}`)
        }
        courses.push(course);
    }


    let combined = [];
    let nonemptyQueues = targetQueues.length;
    while (nonemptyQueues > 0) {
        let min = null;
        let minIndex = null;
        nonemptyQueues = targetQueues.length;

        // Of the start of the current queues, select the user with the earliest time
        for (let c = 0; c < courses.length; c++) {

            // Skip courses with empty queues
            if (targetQueues[c].length === 0) {
                nonemptyQueues -= 1;
                continue;
            }

            // If we haven't selected a min, or if this one is the new min, update the min
            if (min === null || typeof targetQueues[c][0].time === 'string' || targetQueues[c][0].time < min) {
                min = targetQueues[c][0].time;
                minIndex = c;
            }
        }

        // If we found a valid user, add them to the combined queue
        if (minIndex != null) {
            if (courses[minIndex].startsWith('<@')) {
                combined.push({
                    user: targetQueues[minIndex][0].user, 
                    course: 'Personal', 
                    time: targetQueues[minIndex][0].time,
                    ready: targetQueues[minIndex][0].ready
                });
            } else {
                combined.push({
                    user: targetQueues[minIndex][0].user, 
                    course: courses[minIndex], 
                    time: targetQueues[minIndex][0].time,
                    ready: targetQueues[minIndex][0].ready
                });
            }

            targetQueues[minIndex].shift();

        }
    }

    return combined;
}

async function prepareEmbedInteraction(interaction, qargs, combined, queues, subject) {
    const courses = qargs['courses'];
    let maxLen = config['queue-list-amount'];
    if (qargs['doExtend']) { maxLen = combined.length }

    // Format course header
    let courseStr = courses[0];
    for (let i = 1; i < courses.length - 1; i++) { courseStr += ', ' + courses[i] }
    if (courses.length > 1) { courseStr += ' and ' + courses[courses.length - 1]; }

    const title = (subject)? `${subject.nickname}'s queue` : 'Course queue'
    const description = `For ${courseStr}`

    // Format queue order
    let qNameStr = qClassStr = qTimeStr = "";
    let i = numDisplayed = 0;
    for (i = 0; i < combined.length && numDisplayed < maxLen; i++, numDisplayed++) {
        // Skip nr if specified
        if (qargs['doSkipNr'] && !combined[i].ready) { numDisplayed--; continue; }

        // Format embed column bodies
        if (combined[i].ready) { qNameStr += `${i + 1}. ${await interaction.guild.members.fetch(combined[i].user)}\n`; }
        else { qNameStr += `~~${i + 1}. ${await interaction.guild.members.fetch(combined[i].user)}~~\n`; }
        qClassStr += `${combined[i].course}\n`;
        qTimeStr += `${common.parseTime(combined[i].time)}\n`

        // Conditions for compression
        if (qargs['doCompress'] &&
            i+2 < combined.length && 
            numDisplayed+2 < maxLen && 
            combined[i].ready === false && 
            combined[i+1].ready === false && 
            combined[i+2].ready === false) {

            // Add ...s and a newline so everything is aligned
            qNameStr += "...\n";
            qClassStr += "\n";
            qTimeStr += "\n";
            numDisplayed++;

            // Seek passed groups of nr people (looking ahead so we include the last fella)
            for (; i+2 < combined.length && i+2 < maxLen && combined[i+2].ready === false; i++) {}
        }
    }

    // Check if whole queue isn't displayed
    if (i < combined.length) {
        let last = combined[combined.length - 1];
        if (last.ready) { qNameStr += `...\n${combined.length}. ${await interaction.guild.members.fetch(combined[i].user)}\n`; } 
        else { qNameStr += `...\n~~${combined.length}. ${await interaction.guild.members.fetch(combined[i].user)}~~\n`; }
        qClassStr += `\n${last.course}\n`
        qTimeStr += `\n${common.parseTime(last.time)}\n`;
    }

    // Format queue distributions
    let distroStr = "";
    for (let [course, amount] of getDistro(courses, queues)) {
        if (amount === 0) { continue; }
        distroStr += `\`${course}: ${amount}\`\n`;
    }

    // Footer
    let footerString = `Queue is valid as of ${common.parseTime(new Date())}`
    if (interaction.channel.name !== "command-spam") {
        footerString += ` & will expire at ${common.parseTime(new Date(Date.now() + config['vq-expire']))}`;
    }

    const totalChars = qNameStr.length + qClassStr.length + qTimeStr.length + footerString.length;
    if (qNameStr.length > 1024 ||
        qClassStr.length > 1024 ||
        qTimeStr.length > 1024 ||
        totalChars > 6000) {

        await interaction.reply({content: "the queue you are trying to create is too large to send!", ephemeral: true});
        throw new CommandError("!vq embed too large", `${interaction.member}`);
    }

    if (combined.length === 0) {
        logger.log(`!vq empty for ${courses}`, `${interaction.member}`)

        return new Discord.MessageEmbed()
            .setColor('#500000')
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: 'Status', value: 'Queue is Empty!'}
            )
            .setFooter(footerString)

    } else {
        logger.log(`!vq for ${courses}`, `${interaction.member}`);

        let ret = new Discord.MessageEmbed()
            .setColor('#500000')
            .setTitle(title)
            .setDescription(description)
            .addFields(
                { name: 'Student', value: qNameStr, inline: true },
                { name: 'Course‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎', value: qClassStr, inline: true },
                { name: 'Queue Time', value: qTimeStr, inline: true },
            )
            .setFooter(footerString)

        if (distroStr !== "") {
            ret.addFields(
                { name: 'Distribution', value: distroStr },
            )
        }

        return ret;
    
    }
}

async function prepareEmbed(msg, courses, combined, distro, options) { /// Not used for slash commands
    
    let maxLen = config['queue-list-amount'];
    if (options['doExtend']) { maxLen = combined.length; }


    // Replace personal queue aliases
    for (let i = 0; i < courses.length; i++) {
        if (courses[i].startsWith('<@')  || config["personal-q-aliases"].includes(courses[i])) {
            courses[i] = "personal queue"
        }
    }

    // Format courses nicely
    let courseStr = courses[0];
    for (let i = 1; i < courses.length - 1; i++) {
        if (courses[i].startsWith('<@') || config["personal-q-aliases"].includes(courses[i])) {
            courseStr += ', ' + 'personal queue';
        } else {
            courseStr += ', ' + courses[i];
        }
    }

    // Slap an 'and' for the last course because we care enough about english to spare 6 lines of code
    if (courses.length > 1) {
        if (courses[courses.length - 1].startsWith('<@')  || config["personal-q-aliases"].includes(courses[courses.length - 1])) {
            courseStr += ' and ' + 'personal queue';
        } else {
            courseStr += ' and ' + courses[courses.length - 1];
        }
    }

    // Format the queue order nicely
    let qNameStr = "";
    let qClassStr = "";
    let qTimeStr = "";
    let i = 0;
    let numDisplayed = 0;
    for (i = 0; i < combined.length && numDisplayed < maxLen; i++, numDisplayed++) {

        // Skip not ready people if we want to skip them
        if (options['doSkipNr'] && combined[i].ready == false) { numDisplayed--; continue; }
        
        if (combined[i].ready === true || combined[i].ready === undefined) {
            qNameStr += `${i + 1}. ${await msg.guild.members.fetch(combined[i].user)}\n`   
        } else {
            // Display with strikethrough to indicate "not ready"
            qNameStr += `~~${i + 1}. ${await msg.guild.members.fetch(combined[i].user)}~~\n`
        }
        
        qClassStr += `${combined[i].course}\n`;
    
        qTimeStr += common.parseTime(combined[i].time) + '\n'
        
        // Conditions for compression
        if (options['doCompress'] &&
            i+2 < combined.length && 
            numDisplayed+2 < maxLen && 
            combined[i].ready === false && 
            combined[i+1].ready === false && 
            combined[i+2].ready === false) {

            // Add ...s and a newline so everything is aligned
            qNameStr += "...\n";
            qClassStr += "\n";
            qTimeStr += "\n";
            numDisplayed++;

            // Seek passed groups of nr people (looking ahead so we include the last fella)
            for (; i+2 < combined.length && i+2 < maxLen && combined[i+2].ready === false; i++) {}
        }
    }

    // Check if the whole queue isn't displayed
    if (i < combined.length) {

        // Want to show the last position
        let last = combined[combined.length - 1];

        if (last.ready === true || last.ready === undefined) {
            qNameStr += `...\n${combined.length}. ${await msg.guild.members.fetch(last.user)}\n`
        } else {
            qNameStr += `...\n~~${combined.length}. ${await msg.guild.members.fetch(last.user)}~~\n`
        }

        qClassStr += `\n${last.course}\n`
        qTimeStr += '\n' + common.parseTime(last.time) + '\n';
    }

    // Format queue distributions
    let distroStr = "";
    for (let [course, amount] of distro) {
        if (amount === 0) { continue; }
        distroStr += `\`${course}: ${amount}\`\n`
    }
    
    let footerString = `Queue is valid as of ${common.parseTime(new Date())}`
    if (msg.channel.name !== "command-spam") {
        footerString += ` & will expire at ${common.parseTime(new Date(Date.now() + config['vq-expire']))}`;
    }

    const totalChars = qNameStr.length + qClassStr.length + qTimeStr.length + footerString.length;
    if (qNameStr.length > 1024 ||
        qClassStr.length > 1024 ||
        qTimeStr.length > 1024 ||
        totalChars > 6000) {

        replies.timedReply(msg, "the queue you are trying to create is too large to send!", config['bot-alert-timeout']);
        throw new CommandError("!vq embed too large", `${msg.author}`);
    }

    if (combined.length === 0) {
        logger.log(`!vq empty for ${courses}`, `${msg.author}`)

        return new Discord.MessageEmbed()
            .setColor('#500000')
            .setTitle(`Queue order of ${courseStr}`)
            .setDescription("description")
            .addFields(
                { name: 'Status', value: 'Queue is Empty!'}
            )
            .setFooter(footerString)

    } else {
        logger.log(`!vq for ${courses}`, `${msg.author}`)

        let ret = new Discord.MessageEmbed()
            .setColor('#500000')
            .setTitle(`Queue order of ${courseStr}`)
            .setDescription("description")
            .addFields(
                { name: 'Student', value: qNameStr, inline: true },
                { name: 'Course‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎', value: qClassStr, inline: true },
                { name: 'Queue Time', value: qTimeStr, inline: true },
            )
            .setFooter(footerString)

        if (distroStr !== "") {
            ret.addFields(
                { name: 'Distribution', value: distroStr },
            )
        }

        return ret;
    
    }
}

function getDistro(courses, queues) {
    // Gets the number of students from each class in the queue
    let distro = new Map();
    for (course of courses) {
        let q = queues.get(common.parseEmoteToChannel(course));

        if (q != undefined) {
            distro.set(course, q.length);
        } else {
            distro.set(course, 0);
        }
    }

    return distro;
}

module.exports = {
    name: 'vq',
    description: 'displays the queue',
    slashes: [
        new SlashCommandBuilder()
            .setName('vq')
            .setDescription('Display the queue or see where you are in line')
            .addSubcommand(subcommand =>
                subcommand.setName('where')
                    .setDescription('Tells you where the user is in the queue')
                    .addUserOption(option =>
                        option.setName('user')
                            .setDescription('Who you want to get the place of')
                            .setRequired(true))
                    .addStringOption(option =>
                        option.setName('courses')
                            .setDescription('Show place in queue for the courses listed')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand.setName('pt-queue')
                    .setDescription('Displays PT\'s queue')
                    .addUserOption(option =>
                        option.setName('peer-teacher')
                            .setDescription('PT who\'s queue you want to display')
                            .setRequired(true))
                    .addStringOption(option => 
                        option.setName('modifier')
                            .setDescription('Modifies the output of the command')
                            .setRequired(false)
                            .addChoice('Prevent compression of nr users in output', 'no-compress')
                            .addChoice('Hide nr users in output', 'hide-nr')
                            .addChoice('Display the entire queue regardless of length', 'extend')
                            .addChoice('Display the entire queue without compressing nr users', 'no-compress+extended')
                            .addChoice('Display the entire queue not including nr users', 'hide-nr+extended')))
            .addSubcommand(subcommand =>
                subcommand.setName('course-queue')
                    .setDescription('Displays the queue for several courses')
                    .addStringOption(option => 
                        option.setName('courses')
                            .setDescription('Only show queues for courses listed')
                            .setRequired(true))
                    .addStringOption(option => 
                        option.setName('modifier')
                            .setDescription('Modifies the output of the command')
                            .setRequired(false)
                            .addChoice('Prevent compression of nr users in output', 'no-compress')
                            .addChoice('Hide nr users in output', 'hide-nr')
                            .addChoice('Display the entire queue regardless of length', 'extend')
                            .addChoice('Display the entire queue without compressing nr users', 'no-compress+extended')
                            .addChoice('Display the entire queue not including nr users', 'hide-nr+extended')))
    ],

    permissions: {
        vq: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        let queues = data.queues;
        let courses = interaction.options.getString('courses');
        let failed = [];

        let qargs = {
            'doCompress': true,
            'doExtend': false,
            'doSkipNr': false,
            'courses': []
        }

        if (courses) {
            courses = courses.split(' ');
            if (courses.includes('all')) { qargs['courses'] = config['course-emotes'] }
            else {
                for (const course of courses) {
                    if (config['course-emotes'].includes(course)) {
                        qargs['courses'].push(course)
                    } else {
                        failed.push(course);
                    }
                }
            }
        }

        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'where') { /// Finds a person in specified queues
            const user = interaction.options.getUser('user');
            if (qargs['courses'].length === 0) {
                for (const [key, qL] of queues) {
                    const found = qL.findIndex(e => e.user === user.id);
                    if (found !== -1) {
                        await interaction.reply(`${user} is ${getPlace(found+1)} in the ${key} queue`);
                        return true;
                    } else {
                        await interaction.reply(`${user} isn't in the ${key} queue`);
                    }
                }
            } else {
                const found = combineQueuesInteraction(queues, qargs['courses']).findIndex(e => e.user === user.id);
                if (found !== -1) {
                    await interaction.reply(`${user} is ${getPlace(found+1)} in the ${qargs['courses'].join(', ')} queue`);
                    return true;
                } else {
                    await interaction.reply(`${user} isn't in the ${qargs['courses'].join(', ')} queue`);
                }
            }

        } else if (subcommand === 'pt-queue' || subcommand === 'course-queue') { /// Displays an embed displaying a queue
            const modifier = interaction.options.getString('modifier');
            let peerteacher = interaction.options.getUser('peer-teacher');

            // Handle modifiers
            if (modifier) {
                if (modifier === 'no-compress') { qargs['doCompress'] = false; }
                else if (modifier === 'hide-nr') { qargs['doSkipNr'] = true; }
                else if (modifier === 'extend') { qargs['doExtend'] = true; }
                else if (modifier === 'no-compress+extended') { 
                    qargs['doCompress'] = false; 
                    qargs['doExtend'] = true; 
                }
                else if (modifier === 'hide-nr+extended') { 
                    qargs['doSkipNr'] = true; 
                    qargs['doExtend'] = true; 
                }
            }

            if (peerteacher) { /// Grab queues from the peer teacher's roles
                peerteacher = await interaction.guild.members.fetch(peerteacher.id);
                for (const [roleId, role] of peerteacher.roles.cache) {
                    if (role.name.startsWith('CSCE')) {
                        qargs['courses'].push(common.parseRoleToEmote(role.name))
                    }
                }

                if (qargs['courses'].length === 0) {
                    interaction.reply(`${peerteacher} isn't registered for any classes (maybe they forgot to stop by <#737169678677311578>?)`);
                    throw new CommandError(`/vq ${peerteacher} not registered`, `${interaction.member}`)
                }

                qargs['courses'].sort();
            } 

            if (qargs['courses'].length === 0) {
                interaction.reply(`No valid courses were specified in ${failed.join(', ')}`);
                throw new CommandError(`/vq no valid courses in ${interaction.options.getString('courses')}`)
            } else {
                let combined = combineQueuesInteraction(queues, qargs['courses']);
                const embed = prepareEmbedInteraction(interaction, qargs, combined, queues, peerteacher);
                await interaction.reply({embeds: [await embed]});
                if (interaction.channel.name !== "command-spam") { 
                    setTimeout(() => { interaction.deleteReply(); }, config['vq-expire']); 
                }
                return true;
            }

        }


        await interaction.reply('Idk how you got down here');
    },

    async execute(msg, args, options) {
        let queues = options.queues;
        let activeVQs = options.activeVQs;
        let deliverable = "An error happened while creating the embed"

        let qList = await queues.get(msg.channel.name);
        
        let embedOptions = {
            'doCompress': true,
            'doExtend': false,
            'doSkipNr': false
        }

        if (args.length > 0) {

            // VQ options
            if (args[0][0] == '-' && args.length > 1) {
                flags = args[0].split("");
                args.splice(0, 1);

                // Grab options from args
                if (flags.indexOf("e") !== -1) { embedOptions['doExtend'] = true; }
                if (flags.indexOf("h") !== -1) { embedOptions['doSkipNr'] = true; }
                else if (flags.indexOf("c") !== -1) { embedOptions['doCompress'] = false; }
            } else if (args[0][0] == '-') {
                // Options provided but no target
                replies.timedReply(msg, `no target was specified, usage \`!q [-{c|e|ce}] [@user] [into <course>] [at <position>\``, config['bot-alert-timeout']);
                throw new CommandError("!vq options \`${args[0]}\` without target", `${msg.author}`);
            }

            if (args[0] == 'all') {
                // Display all the courses
                args = config['course-emotes'];

            } else if (args[0].match(/^<@!?(\d+)>$/g) || args[0] == 'me') {
                // Discern between mention protocol and course protocol

                let mention = await getTarget(msg, args[0]);
                if (mention.roles.cache.find(r => r.name === "Peer Teacher" || r.name === "Off the Clock")) {
                    // Should print the queue using the peer teacher's classes
                    args = getCoursesFromUser(mention);

                    // Get the personal queue if they have one
                    if (queues.has(`<@${msg.author.id}>`)) {
                        args.push(`<@${msg.author.id}>`);
                    }

                } else {
                    let forIndex = args.indexOf("for");
                    let spliced = false;
                    if (forIndex !== -1) {
                        spliced = true;
                        args = args.splice(forIndex + 1);
                        if (args.includes('all')) { args = config['course-emotes'] }
                    }

                    return getPlaceInLine(msg, queues, mention, args, spliced);
                }

            }


            let combined = combineQueues(msg, args, queues);

            deliverable = await prepareEmbed(msg, args, combined, getDistro(args, queues), embedOptions);

        } else {

            // Make sure we're in a course channel
            if (config['course-channels'].includes(msg.channel.name)) {
                deliverable = await displayCurrChan(msg, qList);
            } else {
                replies.timedReply(msg, "you can only use !vq without arguments in a csce channel", config['bot-alert-timeout']);
                throw new CommandError("!vq wrong channel", `${msg.author}`);
            }
            
        }       

        if (typeof deliverable !== 'string' && !(deliverable instanceof String)) {
            msg.channel.send({embeds: [deliverable]}).then(embed => {
                // This code deletes the previous !vq with no args.
                if (args.length === 0) {
                    if (activeVQs.has(msg.channel.name)) {
                        for (msgToDelete of activeVQs.get(msg.channel.name)) {
                            msgToDelete.delete().then(() => {
                                logger.log(`!vq previous in ${msg.channel.name} deleted`, `${msg.author}`)
                            }).catch(function() {
                                logger.log(`!vq previous in ${msg.channel.name} not found`, `${msg.author}`)
                            });
                        }
                    }
                    
                    activeVQs.set(msg.channel.name, [msg, embed]);
                }

                if (msg.channel.name !== "command-spam") {
                    setTimeout(() => { embed.delete(); }, config['vq-expire']);
                    setTimeout(() => { msg.delete(); }, config['vq-expire']);
                }
            });
        } else {
            msg.channel.send(deliverable);
        }

        return true;
    }
}