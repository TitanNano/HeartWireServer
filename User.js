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

    /**
     * [load description]
     *
     * @static
     *
     * @param  {string} username [description]
     *
     * @return {Promise}          [description]
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
            .catch(() => {
                console.error('no client with this id or username found!');
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

        return Object.assign(instance, userData);
    },

    /**
     * [set description]
     *
     * @param {string} key   [description]
     * @param {*} value [description]
     *
     * @return {Promise} [description]
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

    export: function() {
        let clone = {
            _id: this._id,
            userName: this.userName,
            color: this.color,
            partner: this.partner,
            online: this.online,
            name: this.name,
            lastSeen: this.lastSeen,
            syncChallenge: !!this.syncChallenge,
        };

        return clone;
    }
};

module.exports = User;
