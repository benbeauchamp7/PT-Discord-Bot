const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: 'end',
    description: 'Deletes a set of discussion rooms',

    // Archive interval helper functions (exported by module for index access)
    addArchiveInterval(archivedChannel, intervalMap) {
        logger.log("Archive expiry added", `#${archivedChannel.name}`)

        const intervalID = setInterval(this.checkArchiveTimeout, config['room-inactivity-update'], archivedChannel, intervalMap);
        intervalMap.set(archivedChannel.id, intervalID);
    },
    
    checkArchiveTimeout(archivedChannel, intervalMap) {
        // If the channel is old enough, delete it
        archivedChannel.messages.fetch({ limit: 1}).then(msg => {
            const archiveTime = msg.values().next().value.createdAt;
            if (archiveTime.getTime() + config['archive-timeout'] < Date.now()) {
                logger.log("Archive deleted", `#${archivedChannel.name}`)

                archivedChannel.delete();
                clearInterval(intervalMap.get(archivedChannel.id));
                intervalMap.delete(archivedChannel.id);
            }
        })
        
    },
    
    async execute(message, args, options) {
        const timeout = config['bot-alert-timeout'];
        const chan = message.channel;
        const parentID = chan.parent.id;

        // Make sure that the room !end is used on is a temp room
        if (chan.parent.name.endsWith(config['student-chan-specifier']) || chan.parent.name.endsWith(config['sticky-chan-specifier'])) {
            let movePromise = undefined;

            // End command for non-elevated users
            if (chan.name.endsWith(config['sticky-chan-specifier']) && !msg.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
                
                message.reply(`you do not have permission to end a PT room`).then(reply => {
                    reply.delete({'timeout': timeout});
                    message.delete({'timeout': timeout});
                });

                throw new CommandError("PT !end failed (insufficient perms)", `${message.author}`);
            }

            // Remove all channels in the same category (archive text channel if applicable)
            for (const deleteChan of chan.parent.children) {

                // Determine if the text should be archived
                if (args.includes('now') || chan.name === "unnamed" || !(deleteChan[1].type === "text" && config['do-archive-deletions'])) {
                    deleteChan[1].delete();
                } else {
                    // Archive the channel
                    deleteChan[1].send(`***This channel is an archive of a previous student chat room. It will remain here for ${config['archive-timeout'] / 1000 / 60 / 60} hours after its archive date before being deleted forever. Be sure to save anything you need!***`);
                
                    movePromise = deleteChan[1].setParent(config['archive-cat-id']).then(movedChan => {
                        movedChan.lockPermissions();
                        
                        deleteChan[1].setName(deleteChan[1].name + "-archived");
                        this.addArchiveInterval(chan, options.intervalMap);
                    });
                }
            }

            // Remove the category last (if the promise is defined)
            if (movePromise === undefined) {
                logger.log("deleted immediately", `${chan.name}`);
                message.guild.channels.resolve(message.guild.channels.resolveID(parentID)).delete();
                return true;
            }

            // Wait for the text channel to be moved before deleting the category
            await movePromise;
            
            // This is disgusting, but I need to delete the channel by ID and this is how it's done
            logger.log("archived", `${chan.name}`);
            message.guild.channels.resolve(message.guild.channels.resolveID(parentID)).delete();
            

            return true;
            
        } else {
            message.reply(`You can only use this command in student-created discussion rooms`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });

            throw new CommandError("!end wrong room", `${message.author}`);
        }
    }
}