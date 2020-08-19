const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

module.exports = {
    name: 'end',
    description: 'Deletes a set of discussion rooms',

    addArchiveInterval(archivedChannel, intervalMap) {
        console.log(`Archive expiry added to ${archivedChannel.name}`)
        const intervalID = setInterval(this.checkArchiveTimeout, config['room-inactivity-update'], archivedChannel, intervalMap);
        intervalMap.set(archivedChannel.id, intervalID);
    },
    
    checkArchiveTimeout(archivedChannel, intervalMap) {
        // If the channel is old enough, delete it
        archivedChannel.messages.fetch({ limit: 1}).then(msg => {
            const archiveTime = msg.values().next().value.createdAt;
            if (archiveTime.getTime() + config['archive-timeout'] < Date.now()) {
                console.log(`Archive ${archivedChannel.name} deleted`)
                archivedChannel.delete();
                clearInterval(intervalMap.get(archivedChannel.id));
                intervalMap.delete(archivedChannel.id);
            }
        })
        
    },
    
    async execute(message, args, options) {
        const timeout = config['bot-alert-timeout'];
        const chan = message.channel;
        if (chan.parent.name.endsWith(config['student-chan-specifier'])) {

            // Remove all servers in the same category (archive text channel if applicable)
            for (const deleteChan of chan.parent.children) {
                if (deleteChan[1].type === "text" && config['do-archive-deletions']) {

                    deleteChan[1].send(`***This channel is an archive of a previous student chat room. It will remain here for ${config['archive-timeout'] / 1000 / 60 / 60} hours after its archive date before being deleted forever. Be sure to save anything you need!***`);

                    deleteChan[1].setParent(config['archive-cat-id']).then(movedChan => {
                        movedChan.lockPermissions();
                    });
                    deleteChan[1].setName(deleteChan[1].name + "-archived");

                    this.addArchiveInterval(chan, options.intervalMap);
                } else {
                    deleteChan[1].delete();
                }
            }

            // Remove the category
            chan.parent.delete();

            return true;
            
        } else {
            message.reply(`You can only use this command in student-created discussion rooms`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });

            return false;
        }
    }
}