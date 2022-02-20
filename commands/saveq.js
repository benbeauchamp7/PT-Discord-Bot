const save = require('../custom_modules/save.js');

// Manually writes the queues to file (this is done automatically most of the time)
module.exports = {
    name: 'saveq',
    description: 'saves the queues',
    async execute(message, args, options) {
        let queues = options.queues;

        save.saveQueue(queues);
        options.updateQueues.val = true;

        message.reply("Queues saved!")
    }
}