const fs = require('fs');

const Config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = Config;
