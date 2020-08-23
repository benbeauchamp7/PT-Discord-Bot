// Require discord dependency and create the 'bot' object
const Discord = require('discord.js');
const bot = new Discord.Client({disableEveryone: false});

// Unique token that allows the bot to login to discord
const fs = require('fs');
const { exit } = require('process');
const token = fs.readFileSync("SecureKey", "utf-8");

// 743606275887333550
bot.on('ready', () => {
    // Ping console when bot is ready
    console.log('Notification Connected');
    bot.channels.fetch('743606275887333550').then(chan => {
        chan.send("@everyone timesheets due tonight at 5PM, be sure to get them in!").then(() => {
            exit();
        })
    });
});

bot.login(token);
