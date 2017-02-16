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

/**
 * regiters a new push token for the current client on a user.
 *
 * @param {Client} client
 * @param {{ type: number, token: string }} message
 */
ConnectionManager.messageHandler('account.push', (client, message) => {
    if (!AuthManager.checkAuthStatus(client, message)) {
        return false;
    }

    if (!client.id) {
        return client.reply(message.id, {
            error: 'invalid client',
            reason: `client doesn't have a id! refused to register for push!`,
        });
    }

    if (client.user) {
        const user = client.user;
        const type = Number.parseInt(message.data.type);
        const token = message.data.token;

        console.log('[ConnectionManager]', 'received push token', message);

        if (Number.isNaN(type)) {
            return client.reply(message.id, {
                error: 'invalid token type',
                reason: 'the submitted token type is not a number',
            });
        }

        if (typeof token !== 'string') {
            return client.reply(message.id, {
                error: 'invalid token',
                reason: 'push token musst be a string!',
            });
        }

        user.push[client.id] = {
            type: type,
            token: token,
        };

        user.set('push', user.push);

        client.reply(message.id, {
            success: 'push token has been updated!',
        });
    } else {
        console.error('user is null!', client);

        return client.reply(message.id, {
            error: 'internal server error!',
            reason: 'current user is undefined!',
        });
    }
});

// subscribe to partner status
AuthManager.authenticated((client) => {
    User.load(client.user.partner).then(partner => {
        let s = UserEvents.on(`${partner._id}:online`, () => {

            User.load(partner._id).then(partner => {
                client.push('partnerStatusChanged', { online: partner.online, lastSeen: partner.lastSeen });
            });

        });

        client.addSubscription(s);
    }).catch(e => console.error(e));
})
