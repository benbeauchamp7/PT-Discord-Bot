module.exports = {
    name: 'online',
    description: 'Removes the "Off the Clock" role',
    async execute(message) {
        if (message.member.roles.cache.find(r => r.name === "Peer Teacher" || r.name === "Professor")) {
            message.guild.member(message.author).roles.remove("743870484898250753");
            return true;
        }

        return false;
    }
}