const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

module.exports = {
    name: 'queue',
    description: 'queue commands',

    enqueue() {

    },

    dequeue() {

    },

    viewqueue() {

    },

    async execute(message, args, options) {
        const elevated = message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name));

        // Only used in course channels (unless an elevated user)
        if (!elevated && !(message.channel.name in config['course-channels'])) { return false; }

        const queues = options.queues;
        switch (args.shift().toLowerCase()) {
            case 'enqueue':
            case 'q':
                this.enqueue();
                break;

            case 'dequeue':
            case 'dq':
                this.dequeue();
                break;

            case 'viewqueue':
            case 'vq':
                this.viewqueue();
                break;
        }
    }
}