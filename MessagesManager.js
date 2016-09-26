const ConnectionManager = require('./ConnectionManager');
const checkAuthStatus = require('./AuthManager').checkAuthStatus;
const User = require('./User');
const Db = require('./Db');
const ConversationEvents = require('./ConversationEvents');
const AuthManager = require('./AuthManager');
const { ObjectId } = require('mongodb');


ConnectionManager.messageHandler('account.sendTextMessage', (client, message) => {
    let actualMessage = message.data;

    if (!checkAuthStatus(client, message)) {
        return false;
    }

    User.load(client.user.partner).then(partner => {
        if (actualMessage.to == partner._id.toString()) {
            // check message validity
            actualMessage._id = null;

            if (actualMessage.body.length <= 0) {
                client.reply(message.id, {
                    error: 'emptyMessage',
                    reason: 'message can\'t be empty!',
                });

                return Promise.reject('emptyMessage');
            }

            actualMessage.type = 'text';
            actualMessage.from = client.user._id.toString();
            actualMessage.date = new Date();

            // everthing looks fine lets store this message
            Db.put('messages', actualMessage);
            ConversationEvents.emit(`${actualMessage.to}:newMessage`);
            client.reply(message.id, { status: true });
        }
    });
});

ConnectionManager.messageHandler('account.syncMessages', (client, message) => {
    if (!checkAuthStatus(client, message)) {
        return false;
    }

    let lastMessage = message.data;

    console.log(client.user.userName, 'wants to sync messages', message.data);

    Db.getList('messages', {
        $or: [
            {from: client.user._id.toString()},
            {to: client.user._id.toString()}
        ],
        _id: { $gt: new ObjectId(lastMessage) },
    }, { allowEmpty: true, limit: 50 }).then(messages => {
        client.reply(message.id, messages);
    });
});

AuthManager.authenticated(client => {
    ConversationEvents.on(`${client.user._id.toString()}:newMessage`, () => {
        client.push('newMessage');
    })
})
