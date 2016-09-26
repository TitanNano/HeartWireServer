const GlobalEvents = require('./GlobalEvents');

const ConversationEvents = Object.create(GlobalEvents);

ConversationEvents.init('ConversationEvents');

module.exports = ConversationEvents;
