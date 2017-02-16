const Db = require('./Db');
const UserEvents = require('./UserEvents');
const { ObjectId } = require('mongodb');

const EVENT_PROPERTIES = ['online', 'syncChallenge'];

/** @lends User# */
const User = {
    _id: null,
    userName: '',
    password: '',
    name: '',
    online: false,
    connected: false,
    partner: '',
    lastSeen: '',
    color: 'green',
    syncChallenge: null,
    clients: null,
    push: null,

    /**
     * [load description]
     *
     * @static
     *
     * @param  {string} username [description]
     *
     * @return {Promise<User>}          [description]
     */
    load: function(username) {
        let id = null;

        try {
            id = new ObjectId(username);
        } catch (e) {
            id = new ObjectId(0);
        }

        return Db.get('users', { $or: [{ userName: username }, { _id: id }] })
            .then(this.create.bind(this))
            .catch((reason) => {
                console.error('no client with this id or username found!', username, reason);

                return Promise.reject();
            });
    },

    /**
     * [create description]
     *
     * @static
     *
     * @param  {Object} userData [description]
     *
     * @return {User}          [description]
     */
    create: function(userData) {
        let instance = Object.create(this);

        instance.push = {};
        instance.clients = [];

        return Object.assign(instance, userData);
    },

    /**
     * applies a value to the given property name and persists the user object.
     *
     * @param {string} key   the property name
     * @param {*} value any value to apply
     *
     * @return {Promise} returns a promise for when the object has been saved.
     */
    set: function(key, value) {
        let update = { _id: this._id };

        update[key] = value;

        return Db.put('users', update).then(result => {
            this[key] = value;

            if (EVENT_PROPERTIES.indexOf(key) > -1) {
                UserEvents.emit(`${this._id}:${key}`, value);
            }

            return result;
        });
    },

    /**
     * returns a save data object to send to the client
     *
     * @param  {Client} [client] the client who is requesting the export
     *
     * @return {Object} the data object
     */
    export: function(client) {
        let clone = {
            _id: this._id,
            userName: this.userName,
            color: this.color,
            partner: this.partner,
            online: this.online,
            name: this.name,
            lastSeen: this.lastSeen,
            syncChallenge: !!this.syncChallenge,
            push: client ? (client.id in this.push) : undefined,
            clientId: client ? client.id : undefined,
        };

        return clone;
    }
};

module.exports = User;
