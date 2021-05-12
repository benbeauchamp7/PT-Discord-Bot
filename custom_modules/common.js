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

    parseRoleToEmote: function (roleName) {
        // Scroll to first dividing character
        let i = 0;
        for (; i < roleName.length && roleName[i] != '-'; i++) {}
        i++; // Skip the hyphen

        return roleName.slice(i).replace(/-/g, '');
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
    },

    parseTime: function (timeDisplay) {
        // Takes a time object and formats it nicely for output, or repeats back the string
        if (isNaN(timeDisplay)) { return timeDisplay; }
        let time = new Date(timeDisplay);
    
        let amPm = (time.getHours() >= 12 ? 'PM' : 'AM');
        let hrs = (time.getHours() > 12 ? time.getHours() - 12 : time.getHours());
        hrs = (hrs == 0 ? 12 : hrs); // Makes midnight 12am instead of 0am
        let mins = (time.getMinutes() > 9 ? time.getMinutes() : `0${time.getMinutes()}`)
        return `${hrs}:${mins} ${amPm}`;
    }

}
