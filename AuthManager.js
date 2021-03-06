const ConnectionManager = require('./ConnectionManager');
const User = require('./User');
const sha1 = require('sha1');
const uuid = require('uuid/v4');

let unauthorized = new Map();
let listeners = {
    authenticated: [],
};

ConnectionManager.connected(client => {
    let timeout = setTimeout(() => {
        client.push('authTimeout', {
            reason: 'authentication needs to be initiated in under 10s',
        }, false);

        client.disconnect();
    }, 10000);

    unauthorized.set(client, timeout);

    console.log('AuthManager:', 'waiting for authentication of client', client.id);
});

ConnectionManager.messageHandler('authentication', (client, message) => {
    let { username, password, clientId } = message.data;

    clearTimeout(unauthorized.get(client));

    if (!username || !password) {
        client.reply(message.id, {
            error: 'authFailure',
            reason: 'username or password missing!',
        });

        client.disconnect();
    }

    User.load(username).then(user => {
        password = sha1(password);

        if (clientId) {
            if (user.clients.indexOf(clientId) < 0 && !client.validateId(clientId)) {
                return client.reply(message.id, {
                    error: 'invalid client',
                    reason: 'client id does not belong to this user! security violation!'
                });
            }

            client.id = clientId;
        } else {
            user.clients.push(uuid());
            user.set('clients', user.clients);

            client.id = user.clients[user.clients.length - 1];
        }

        console.log('compare', password, 'and', user.password);

        if (user.password === password) {
            user.set('connected', true);

            client.user = user;
            listeners.authenticated.forEach(fn => fn(client));

            client.reply(message.id, user.export(client));
        } else {
            client.reply(message.id, {
                error: 'authFailure',
                reason: 'incorrect password!',
            }, false);
        }
    }).catch((reason) => {
        console.log('AuthManager:', 'user', username, 'not found', reason);

        client.reply(message.id, {
            error: 'authFailure',
            reason: 'user does not exist!',
        }, false);

        client.disconnect();
    });
});

/**
 * [checkAuthStatus description]
 *
 * @param  {Client} client  [description]
 * @param  {Object} message [description]
 *
 * @return {boolean}         [description]
 */
const checkAuthStatus = function(client, message) {
    if (!client.user) {
        client.reply(message.id, {
            error: 'unauthorized',
            reason: 'this connection hasn\'t been authenticated yet!',
        });

        return false;
    }

    return true;
}

const authenticated = function(fn) {
    if (!listeners.authenticated) {
        listeners.authenticated = [];
    }

    listeners.authenticated.push(fn);
}

exports.checkAuthStatus = checkAuthStatus;
exports.authenticated = authenticated;
