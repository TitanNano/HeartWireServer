const GlobalEvents = require('./GlobalEvents');

const UserEvents = Object.create(GlobalEvents);

UserEvents.init('UserEvents');

module.exports = UserEvents;
