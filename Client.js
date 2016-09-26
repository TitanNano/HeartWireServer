const uuid = require('node-uuid');

/** @lends Client# */
const Client = {
    id: null,
    socket: null,

    /** @type {User} */
    user: null,
    connected: true,

    _handler: {
        any: [],
    },

    init: function(socket) {
        this.id = uuid.v4();
        this.socket = socket;
        this.socket.on('message', this._handleMessage.bind(this));
    },

    _handleMessage: function(message) {
        try {
            message = JSON.parse(message);
        } catch (error) {
            console.error('faild to parse incomming message from', this.id);
        }

        this._handler.any.forEach(fn => fn(message));

        if (this._handler[message.type]) {
            this._handler[message.type].forEach(fn => fn(message));
        }
    },

    disconnect: function(clientInitiated) {
        if (this.connected) {
            if (this.user) {
                this.user.set('connected', false);
                this.user.set('lastSeen', Date.now());
                this.user.set('online', false);
            }

            this.connected = false;

            if (!clientInitiated) {
                this.socket.close();
            }
        }
    },

    _send: function(data, ack = true) {
        console.log(data, this.socket.readyState);

        if (this.socket.readyState === this.socket.OPEN) {
            this.socket.send(JSON.stringify(data));

            if (ack) {
                let idConnectionTimeout = setTimeout(() => {
                    this._send({
                        id: uuid.v4(),
                        type: 'terminate',
                        data: {
                            reason: 'connection timed out!',
                        }
                    }, false);

                    this.disconnect();
                }, 30000);

                let idAckTimeout = setTimeout(() => {
                    this._send(data);
                }, 30001);

                this.on('any', function(){
                    clearTimeout(idConnectionTimeout);
                });

                this.on(`ack:${data.id}`, () => {
                    clearTimeout(idAckTimeout);
                });
            }
        }
    },

    on: function(type, fn) {
        if (!this._handler[type]) {
            this._handler[type] = [];
        }

        this._handler[type].push(fn);
    },

    ack: function(messageId) {
        this._send({
            type: `ack:${messageId}`,
            id: uuid.v4(),
        }, false);
    },

    /**
     * [reply description]
     *
     * @param  {string}  messageId  [description]
     * @param  {Object}  message    [description]
     * @param  {Boolean} [ack=true] [description]
     *
     * @return {void}             [description]
     */
    reply: function(messageId, message, ack=true) {
        this._send({
            type: `response:${messageId}`,
            data: message,
            id: uuid.v4(),
        }, ack);
    },

    /**
     * [push description]
     *
     * @param  {string} type    [description]
     * @param  {Object} message [description]
     * @param {boolean} ack [description]
     *
     * @return {void}
     */
    push: function(type, message, ack=true) {
        this._send({
            id: uuid.v4(),
            type: type,
            data: message,
        }, ack);
    }
};

module.exports = Client;
