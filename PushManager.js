const ConversationEvents = require('./ConversationEvents');
const User = require('./User');
const BaiduPushClient = require('node-baidu-push/lib/client');
const Config = require('./Config');

const baiduPushClient = new BaiduPushClient(Config.baidu_push_api_key, Config.baidu_push_api_secret, 'api.push.baidu.com');

const LOG_PREFIX = '[PushManager]';

const PUSH_PROVIDERS = ['baidu', 'simple'];

const sendPush = {
    /**
     * @param {string} token
     * @param {Message} message
     * @param {User} sender
     */
    baidu(token, message, sender) {

        const pushMessage = {
            title: sender.name,
            description: message.preview,
            open_type: 2,
            notification_builder_id: 0,
            notification_basic_style: 7,
        };

        console.log(LOG_PREFIX, 'sending baidu push ', pushMessage);

        (new Promise((success, failure) => {
            baiduPushClient.pushMsgToSingleDevice(token, pushMessage, { msg_type: 1 },
                (error, response) => {
                    if (error) {
                        failure(error);
                    } else {
                        success(response.response_params);
                    }
                });
        })).then((result) => {
                console.log(LOG_PREFIX, 'baidu push done:', result);

                setTimeout(() => {
                    baiduPushClient.queryMsgStatus(result.msg_id, (error, result) =>
                        console.log(error, result));
                }, 5000);
        }).catch((error) =>
            console.error(LOG_PREFIX, 'baidu push failed:', error));
    },

    simple(){}
}

const handlePush = function(message) {
    console.log(LOG_PREFIX, 'new message to', message.to);

    Promise.all([User.load(message.to), User.load(message.from)]).then(([receivingUser, sendingUser]) => {

        console.log(LOG_PREFIX, 'receving user is', receivingUser.connected ? 'connected' : 'not connected', receivingUser);

        if (receivingUser.connected) {
            return;
        }

        receivingUser.clients.forEach(clientId => {
            /**
             * @type {{ type: string, token: string }}
             */
            const pushToken = receivingUser.push[clientId];

            if (pushToken) {
                console.log(LOG_PREFIX, 'sending push to client:', clientId, pushToken);

                sendPush[PUSH_PROVIDERS[pushToken.type]](pushToken.token, message, sendingUser);
            }
        })
    });
};

ConversationEvents.all(handlePush);
