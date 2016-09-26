const MongoClient = require('mongodb').MongoClient;
const Config = require('./Config');

const dbHost = Config.db_domain;

let connectDb = function() {
    return MongoClient.connect(dbHost).then(db => {
        console.log('successfully connected to the db!');

        return db.createCollection('users')
            .catch(error => console.error('couldn\'t create collection!', error))
            .then(() => db);
    }).then(db => {
        console.log('db is ready!');

        db.collection('users').createIndexes([{
            key: { userName: 1 },
            name: 'userName',
            unique: true,
        }]);

        return db;
    }).catch(error => console.error('db connection faild', error));
}

let ensureConnection = function() {
    return db.then(dbInstance => {
        if (!dbInstance.topology.isConnected()) {
            console.warn('db connection lost... trying to reconnect!');
            db = connectDb();
        }

        return db;
    });
}

console.log('trying to connect to the db...');
let  db = connectDb();

let Db = {

    getDbInstance: ensureConnection,

    put: function(collection, doc) {
        return ensureConnection().then(db => {
            let query = null;

            if (doc._id) {
                query = { _id: doc._id };
            } else {
                query = doc;
            }

            delete doc._id;

            return db.collection(collection).updateOne(query, { $set: doc }, { upsert: true });
        })
    },

    get: function(collection, query, {allowEmpty = false, limit = 0 } = {}) {
        return ensureConnection().then(db => {
            return db.collection(collection).find(query).limit(limit).toArray();
        }).then(list => {
            if (list.length < 2) {
                if (list[0]) {
                    return list[0];
                }

                if (allowEmpty) {
                    return [];
                } else {
                    return Promise.reject('no results');
                }
            } else {
                return list;
            }
        });
    },

    getList: function(collection, query, allowEmpty) {
        return this.get(collection, query, allowEmpty).then(data => {
            if (!Array.isArray(data)) {
                return [data];
            } else {
                return data;
            }
        })
    },

};

module.exports = Db;
