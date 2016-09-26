const UserEvents = require('./UserEvents');
const ConnectionManager = require('./ConnectionManager');
const User = require('./User');

ConnectionManager.messageHandler('account.syncChallenge', (client, message) => {
    if (!client.user) {
        client.reply(message.id, {
            error: 'unauhorized',
            reason: 'this connection hasn\'t been authenticated yet!',
        });

        return false;
    }

    client.user.set('syncChallenge', message.data.syncChallenge).then(() => {
        client.reply(message.id, client.user.export());
    });
});

let syncChallengeReady = function(client, challenge) {
    client.push('partnerSyncStatus', {
        status: 'ready',
        challenge: challenge,
    });
}

let partnerIsOnline = function(client) {
    client.push('partnerSyncStatus', {
        status: 'pending',
        reason: 'waiting for partner...'
    });
}

let partnerIsOffline = function(client) {
    client.push('partnerSyncStatus', {
        status: 'pending',
        reason: 'partner is not available!',
    });
}

ConnectionManager.messageHandler('partner.getSyncChallenge', (client, message) => {
    if (!client) {
        client.reply(message.id, {
            error: 'unauhorized',
            reason: 'this connection hasn\'t been authenticated yet!',
        });

        return false;
    }

    User.load(client.user.partner).then(partner => {
        if (partner.syncChallenge) {
            syncChallengeReady(client, partner.syncChallenge);
        } else {
            if (partner.online) {
                partnerIsOnline(client);
            } else {
                partnerIsOffline(client);
            }

            let onOffSub = UserEvents.on(`${partner._id}:online`, status => {
                status ? partnerIsOnline(client) : partnerIsOffline(client);
            });

            UserEvents.once(`${partner._id}:syncChallenge`, challenge => {
                if (challenge) {
                    syncChallengeReady(client, challenge);
                    onOffSub.then(subscription => subscription.unsubscribe());
                }
            });
        }
    })
});
