// Basic CommandError for use with commands to communicate to the user why a command failed
class CommandError extends Error {
    constructor(message, person) {
        super(message);
        this.name = "CommandError";
        this.user = person;
    }
}

module.exports = CommandError;