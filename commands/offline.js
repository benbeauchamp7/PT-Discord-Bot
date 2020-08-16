module.exports = {
    name: 'offline',
    description: 'Adds the "Off the Clock" role',
    async execute(message) {
        if (message.member.roles.cache.find(r => r.name === "Peer Teacher" || r.name === "Professor")) {
			message.guild.member(message.author).roles.add("743870484898250753");
            return true;
        }

        return false;
    }
}