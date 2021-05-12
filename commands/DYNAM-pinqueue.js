const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const CommandError = require('../custom_modules/commandError.js');

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'pin-queue',
    description: 'pins and sets a dynamic queue',
    async execute(msg, args, options) {
		let pins = options.pins;
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
			msg.channel.messages.fetch(args[0]).then(target => {
				target.pin();
				pins.set()

			}).catch(err => {
				logger.log("!pin-queue invalid id");
				throw new CommandError("!pin-queue invalid id", `${msg.author}`);
			});

		} else {
			replies.timedReply(msg, "there was a permissions or args error", config['bot-alert-timeout']);
            throw new CommandError("!pin-queue insufficient permissions or no args", `${msg.author}`);
		}
    }
}