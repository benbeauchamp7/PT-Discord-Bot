const logger = require('../logging.js');
const CommandError = require('../commandError.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const Discord = require('discord.js');
const replies = require('../replies.js');

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
        case 9:  return "**nineth**";
        default: return "number **" + rank + "**";
    }
}

function parseTime(time) {
    let amPm = (time.getHours() >= 12 ? 'PM' : 'AM');
    let hrs = (time.getHours() > 12 ? time.getHours() - 12 : time.getHours());
    let mins = (time.getMinutes() > 9 ? time.getMinutes() : `0${time.getMinutes()}`)
    return `${hrs}:${mins} ${amPm}`;
}

function displayCurrChan(msg, qList) {
    let qNameStr = "";
    let qTimeStr = "";

    // Prepare display strings
    for (let i = 0; i < qList.length; i++) {
        qNameStr += `${i + 1}. ${msg.guild.members.cache.get(qList[i].user)}\n`
        let d = new Date(qList[i].time);
        qTimeStr += parseTime(d) + '\n';
    }

    if (qList.length === 0) {

        // For empty queues
        logger.log(`!vq std (empty) for ${msg.channel.name.slice(5)}`, `${msg.author}`)

        return new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Queue order of ${msg.channel.name.slice(5)}`)
            .addFields(
                { name: 'Status', value: 'Queue is Empty!'}
            )
            .setFooter(`Queue is valid as of ${parseTime(new Date())}`)

    } else {
        // For nonempty queues
        logger.log(`!vq std for ${msg.channel.name.slice(5)} len ${qList.length}`, `${msg.author}`)

        return new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Queue order of ${msg.channel.name.slice(5)}`)
            .addFields(
                { name: 'Student', value: qNameStr, inline: true },
                { name: 'Queue Time', value: qTimeStr, inline: true }
            )
            .setFooter(`Queue is valid as of ${parseTime(new Date())}`)
    }
}

function getTarget(msg, mention) {

    // Check for valid mention and for mentioned user's roles if mention
    let mentionUser = undefined;
    if (mention.match(/^<@!?(\d+)>$/g)) {
        mentionUser = msg.guild.members.cache.get(mention.replace(/[\\<>@#&!]/g, ""));
    }

    if (mention == 'me') {
        mentionUser = msg.guild.members.cache.get(msg.author.id);
    }

    if (mention === undefined) {
        replies.timedReply(msg, "that user does not exist", config['bot-alert-timeout'])
        throw new CommandError(`!vq undefined user [${args[0].replace(/[\\<>@#&!]/g, "")}]`, `${msg.author}`)
    }

    return mentionUser;
}

function getCoursesFromUser(userMention) {
    // Should print the queue using the peer teacher's classes
    let args = [];
    for (role of userMention.roles.cache) {
        role = role[1];
        if (role.name.startsWith("CSCE")) {
            args.push(role.name.substr(role.name.length - 3)) // Gets the number from the role
        }
    }

    // If peer teacher has no classes, fail the command
    if (args.length === 0) {
        timedMessage(msg, `${mention} isn't registered for any classes (maybe they forgot to stop by <#737169678677311578>?)`, config['bot-alert-timeout'])
        throw new CommandError(`!vq ${mention.name} not registered`, `${msg.author}`);
    }

    return args;
}

function getPlaceInLine(msg, qList, user) {

    // Tell them the mentioned's spot in line
    for (let i = 0; i < qList.length; i++) {
        if (user.id === qList[i].user) {
            let position = getPlace(i + 1);
            
            msg.channel.send(`${user} is ${position} in line`);
            logger.log(`!vq ${user.name} in line`, `${msg.author}`)
            return true;
        }
    }
    // Person not found in this queue
    msg.channel.send(`${user} is not in line`);
    throw new CommandError(`!vq ${user.name} not in line`, `${msg.author}`);
}

function combineQueues(msg, args, queues) {
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
                targetQueues.push(JSON.parse(JSON.stringify(queues.get('csce-' + course))));
            }

        } catch (err) {
            replies.timedReply(msg, "Unrecognized course, please try again", config['bot-alert-timeout'])
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

        for (let c = 0; c < courses.length; c++) {

            // Skip courses with empty queues
            if (targetQueues[c].length === 0) {
                nonemptyQueues -= 1;
                continue;
            }

            // If we haven't selected a min, or if this one is the new min
            if (min === null || targetQueues[c][0].time < min) {
                min = targetQueues[c][0].time;
                minIndex = c;
            }
        }

        if (minIndex != null) {
            if (courses[minIndex].startsWith('<@')) {
                combined.push({
                    user: targetQueues[minIndex][0].user, 
                    course: 'Personal', 
                    time: targetQueues[minIndex][0].time
                });
            } else {
                combined.push({
                    user: targetQueues[minIndex][0].user, 
                    course: courses[minIndex], 
                    time: targetQueues[minIndex][0].time
                });
            }

            targetQueues[minIndex].shift();

        }
    }

    return combined;
}

function prepareEmbed(msg, courses, combined, distro) {
    // Replace personal queue alieses
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
    for (i = 0; i < combined.length && i < config['queue-list-amount']; i++) {
        
        qNameStr += `${i + 1}. ${msg.guild.members.cache.get(combined[i].user)}\n`
        qClassStr += `${combined[i].course}\n`;

        let d = new Date(combined[i].time);
        qTimeStr += parseTime(d) + '\n';
    }

    // Check if the whole queue isn't displayed
    if (i < combined.length) {

        // Want to show the last position
        let last = combined[combined.length - 1];

        qNameStr += `...\n${combined.length}. ${msg.guild.members.cache.get(last.user)}\n`
        qClassStr += `\n${last.course}\n`
        let d = new Date(last.time);
        qTimeStr += '\n' + parseTime(d) + '\n';
    }

    let distroStr = "";
    // Format queue distributions
    for (let [course, amount] of distro) {
        if (amount === 0) { continue; }
        distroStr += `\`${course}: ${amount}\`\n`
    }
    
    if (combined.length === 0) {
        logger.log(`!vq empty for ${courses}`, `${msg.author}`)

        return new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Queue order of ${courseStr}`)
            .addFields(
                { name: 'Status', value: 'Queue is Empty!'}
            )
            .setFooter(`Queue is valid as of ${parseTime(new Date())}`)

    } else {
        logger.log(`!vq for ${courses}`, `${msg.author}`)

        let ret = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Queue order of ${courseStr}`)
            .addFields(
                { name: 'Student', value: qNameStr, inline: true },
                { name: 'Course‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎‏‏‎ ‎‏‏‎', value: qClassStr, inline: true },
                { name: 'Queue Time', value: qTimeStr, inline: true }
            )
            .setFooter(`Queue is valid as of ${parseTime(new Date())}`)

        if (distroStr !== "") {
            ret.addFields(
                { name: 'Distribution', value: distroStr },
            )
        }

        return ret;
    
    }
}

function getDistro(courses, queues) {
    let distro = new Map();
    for (course of courses) {
        let q = queues.get("csce-" + course);

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
    async execute(msg, args, options) {
        let queues = options.queues;
        let activeVQs = options.activeVQs;
        let deliverable = "An error occured while creating the embed"

        let qList = await queues.get(msg.channel.name);
        

        if (args.length > 0) {

            if (args[0] == 'all') {
                // Display all the courses
                args = config['emote-names'];

            } else if (args[0].match(/^<@!?(\d+)>$/g) || args[0] == 'me') {
                // Discern between mention protocol and course protocol

                let mention = getTarget(msg, args[0]);
                if (mention.roles.cache.find(r => r.name === "Peer Teacher" || r.name === "Off the Clock")) {
                    // Should print the queue using the peer teacher's classes
                    args = getCoursesFromUser(mention);

                    // Get the personal queue if they have one
                    if (queues.has(`<@${msg.author.id}>`)) {
                        args.push(`<@${msg.author.id}>`);
                    }

                } else {
                    return getPlaceInLine(msg, qList, mention);
                }

            }

            let combined = combineQueues(msg, args, queues);

            deliverable = prepareEmbed(msg, args, combined, getDistro(args, queues));

        } else {

            // Make sure we're in a course channel
            if (config['course-channels'].includes(msg.channel.name)) {
                deliverable = displayCurrChan(msg, qList);
            } else {
                replies.timedReply(msg, "you can only use !vq without arguments in a csce channel", config['bot-alert-timeout']);
                throw new CommandError("!vq wrong channel", `${msg.author}`);
            }
            
        }       

        msg.channel.send(deliverable).then(embed => {
            if (args.length === 0) {
                if (activeVQs.has(msg.channel.name)) {
                    for (msgToDelete of activeVQs.get(msg.channel.name)) {
                        logger.log(`!vq previous in ${msg.channel.name} deleted`, `${msg.author}`)
                        msgToDelete.delete();
                    }
                }
                
                activeVQs.set(msg.channel.name, [msg, embed]);
            }
        });

        return true;
    }
}