
const mubsub = require('mubsub');
const Db = require('./Db');

let client = Db.getDbInstance().then(db => mubsub(db));

const GlobalEvents = {

    _channel: null,

    init: function(name) {
        this._channel = client.then(client => client.channel(name, { max: 20 }));
    },

    on: function(type, listener) {
        return this._channel.then(channel => {
            return channel.subscribe(type, listener);
        });
    },

    once: function(type, listener) {
        return this._channel.then(channel => {
            let registration = channel.subscribe(type, (...args) => {
                registration.unsubscribe();
                return listener(...args);
            });

            return registration;
        });
    },

    all(listener) {
        return this._channel.then(channel => {
            return channel.subscribe(listener);
        });
    },

    emit: function(type, message) {
        this._channel.then(channel => {
            return channel.publish(type, message);
        });
    }

};

module.exports = GlobalEvents;
