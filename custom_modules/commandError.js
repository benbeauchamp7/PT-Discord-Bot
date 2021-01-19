class CommandError extends Error {
    constructor(message, person) {
        super(message);
        this.name = "CommandError";
        this.user = person;
    }
}

module.exports = CommandError;