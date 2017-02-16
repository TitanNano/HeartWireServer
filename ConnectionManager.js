const Client = require('./Client.js');

/**
 * @callback MessageHandler
 * @param {Client} client
 * @param {Object} message
 */

/** @lends ConnectionManager */
const ConnectionManager = {

    /**
     * [_messageHandlers description]
     *
     * @type {Function[]}
     */
    _messageHandlers: {
        all: [],
    },

    /**
     * [_connectedHandler description]
     *
     * @type {Function[]}
     */
    _connectedHandler: [],

    /**
     * [_disconnectedHandler description]
     *
     * @type {Function[]}
     */
    _disconnectedHandler: [],

    /**
     * [_server description]
     *
     * @type {WebSocketServer}
     */
    _server: null,

    _clients: {},

    _handleConnection: function(client) {
        this._connectedHandler = this._connectedHandler.filter(handler => (handler.fn(client), !handler.once));
    },

    _handleDisconnect: function(client) {
        this._disconnectedHandler.forEach(handler => (handler.fn(client), !handler.once));
    },

    _handleMessage: function(client, message) {
        try {
            message = JSON.parse(message);
        } catch (error) {
            console.error('faild to parse incomming message from', client.id);
        }

        console.log('incomming message from', client.id, 'type:', message.type);

        this._messageHandlers.all.filter(handler => (handler.fn(client, message), !handler.once));

        if (this._messageHandlers[message.type]) {
            this._messageHandlers[message.type].filter(handler => (handler.fn(client, message), !handler.once));
        }
    },

    /**
     * [init description]
     *
     * @param  {WebSocketServer} server [description]
     *
     * @return {void}
     */
    init: function(server) {
        this._server = server;

        this.messageHandler((client, message) => {
            if (message.type.search('ack') < 0) {
                client.ack(message.id);
            }
        })

        this._server.on('connection', socket => {
            let client = Object.create(Client);

            client.init(socket);
            client.socket.on('message', this._handleMessage.bind(this, client));
            client.socket.on('close', () => {
                delete this._clients[client.id];
                client.disconnect(true);
                console.log(`client ${client.id}: ${client.user && client.user.userName} disconnected!`);
            });

            console.log('new client connected:', client.id);
            this._handleConnection(client);
        });
    },

    /**
     * [messageHandler description]
     *
     * @param  {string}   type [description]
     * @param  {MessageHandler} fn   [description]
     * @param  {boolean}   once [description]
     *
     * @return {void}     [description]
     */
    messageHandler: function(type, fn, once) {
        if (once === undefined || once === null) {
            once = fn;
        }

        if (!fn) {
            fn = type;
        }

        if (typeof type === 'string') {
            if (!this._messageHandlers[type]) {
                this._messageHandlers[type] = [];
            }

            this._messageHandlers[type].push({ fn: fn, once: !!once });
        } else {
            this._messageHandlers.all.push({ fn: fn, once: !!once });
        }
    },

    /**
     * @callback ClientConnectedCallback
     * @param {Client} client
     *
     * @return {void}
     */
    /**
     * Registers an eventhandler which will be executed once a client has been connected.
     *
     * @param  {ClientConnectedCallback} fn           [description]
     * @param  {Boolean}  [once=false] [description]
     * @return {void}                [description]
     */
    connected: function(fn, once = false) {
        this._connectedHandler.push({ fn: fn, once: once });
    },

    disconnected: function(fn, once = false) {
        this._disconnectedHandler.push({ fn: fn, once: once });
    }
};

module.exports = ConnectionManager;
