class CommandError extends Error {
    constructor(message, person) {
        super(message);
        this.name = "CommandError";
    }
}

module.exports = CommandError;