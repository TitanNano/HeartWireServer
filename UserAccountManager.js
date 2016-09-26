const AuthManager = require('./AuthManager');
const ConnectionManager = require('./ConnectionManager');
const User = require('./User');
const UserEvents = require('./UserEvents');

ConnectionManager.messageHandler('account.online', (client, message) => {
    if (AuthManager.checkAuthStatus(client, message)) {
        if (!message.data) {
            client.user.set('lastSeen', Date.now());
        }

        client.user.set('online', message.data).then(() => {
            client.reply(message.id, client.user.export());
        }).catch(e => {
            client.reply(message.id, {
                error: 'unexpected error',
                reason: e,
            });
        });

    }
});

ConnectionManager.messageHandler('account.partner', (client, message) => {
    if (!AuthManager.checkAuthStatus(client, message)) {
        return false;
    }

    User.load(client.user.partner).then(user => {
        client.reply(message.id, user.export());
    });
});

// subscribe to partner status
AuthManager.authenticated((client) => {
    User.load(client.user.partner).then(partner => {
        UserEvents.on(`${partner._id}:online`, () => {

            User.load(partner._id).then(partner => {
                client.push('partnerStatusChanged', { online: partner.online, lastSeen: partner.lastSeen });
            });

        });
    }).catch(e => console.error(e));
})
