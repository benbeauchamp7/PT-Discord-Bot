// General common use functions
module.exports = {
    parseEmoteToChannel: function (emote) {

        // Scroll to first non-numeric character
        let i = 0;
        for (; i < emote.length && emote[i] >= '0' && emote[i] <= '9'; i++) { }

        if (emote.length > i) {
            return 'csce-' + emote.slice(0, i) + '-' + emote.slice(i);
        } else {
            return 'csce-' + emote;
        }
    },

    emptyQueues: function (guild, queues, config) {
        // Reinitialize queues to be empty
        let users = [];
        for (course of config['course-channels']) {
            for (userobj of queues.get(course)) {
                users.push(userobj.user);
            }

            queues.set(course, []);
        }

        guild.members.fetch({user: users}).then(users => {
            for ([id, member] of users) {
                member.roles.remove(config["role-q-code"]);
            }
        });
    }

}
