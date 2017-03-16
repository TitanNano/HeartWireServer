require('newrelic');

const http = require('http');
const WebSocketServer = require("ws").Server;
const express = require('express');
const ConnectionManager = require('./ConnectionManager');

require('./AuthManager');
require('./SyncManager');
require('./UserAccountManager');
require('./MessagesManager');
require('./PushManager');

const port = process.env.PORT || 5000;
const staticServer = express();
const server = http.createServer(staticServer);
const supportedProtocolls = [
    'hwp-1.0',
];

staticServer.use('/', express.static('client'));
server.listen(port);

const webSocket = new WebSocketServer({
    server: server,
    path: '/socket',
    handleProtocols: function(protocols) {
        for (let i = supportedProtocolls.length-1; i >= 0; i--) {
            let protocol = supportedProtocolls[i];

            if (protocols.indexOf(protocol) >= 0) {
                return protocol;
            }
        }

        console.log('Client tried to connect over a deprecated or invalid protocol!');
        return false;
    }
});

ConnectionManager.init(webSocket);
console.log('webSocket is ready...');
