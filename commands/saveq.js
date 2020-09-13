const logger = require('../logging.js');
const save = require('../save.js');

module.exports = {
    name: 'saveq',
    description: 'saves the queues',
    async execute(message, args, options) {
        let queues = options.queues;

        save.saveQueue(queues);

        message.reply("queues saved!")
    }
}