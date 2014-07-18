/**
 * nconf-Mongodb
 * Inspired by nconf-redis by indexzero (https://github.com/indexzero/nconf-redis)
 * and modeled after various nconf stores (https://github.com/flatiron/nconf/tree/master/lib/nconf/stores)
 */
var mongodb = require('mongodb'),
    nconf = require('nconf'),
    async = require('async');


/**
 * Helper function for appropriately handling invalid states.
 * @param {Object} err
 */
function failOn(err) {
    'use strict';
    if (err) throw (err instanceof Error) ? err : new Error(String(err));
}


var Mongodb = exports.Mongodb = function(opts) {
    "use strict";

    opts = opts || {};
    this.type = 'Mongodb';
    this.namespace = opts.namespace || 'mongodb';
    this.app = opts.app || 'general';
    this.ttl = opts.ttl || 60 * 60 * 1000;
    this.cache = new nconf.Memory();
	this.readOnly = false;

	this.host = opts.host || 'localhost';
	this.port = opts.port || 27017;
	this.db = opts.db || 'nconf';
	this.collection = opts.collection || 'config';
    this.auth = opts.auth;

    this.safe_dbs = opts.safe_dbs || true;
    this.safe_collections = opts.safe_collections || true;

    this._mongo = null;
    this._collection = null;
};



/**
 * Converts the provided key to a key that is correctly formatted
 * to retrieve data from the internal cache.
 */
Mongodb.resolveKey = function(key) {
    'use strict';
    return key;
};



/**
 * Fills the internal cache with data from the remote data store.
 * @param {Function} callback that accepts the following arguments: err {Object}, items {Array}
 */
Mongodb.prototype.load = function(callback) {
    'use strict';

    var self = this;
    async.waterfall([
        function(next) {
            // Create and open the connection
            var server = new mongodb.Server(self.host, self.port, { safe:self.safe_dbs, auto_reconnect:true }, {}),
                db = new mongodb.Db(self.db, server);
            db.open(next);
        },
        function(db, next) {
            // Authenticate [optional]
            if (self.auth) {
                db.authenticate(self.auth.username, self.auth.password, function(err) {
                    next(err, db);
                });
                return;
            }
            next(null, db);
        },
        function(db, next) {
            db.collectionNames(self.collection, function(err, collections) {
                if(err || collections.length > 0) {
                    next(err,db);
                } else {
                    db.createCollection(self.collection, function(err2, collection) {
                        if(!err2) {
                            collection.save({app:self.app}, {safe: self.safe_collections}, function(err3) {
                                next(err3, db);
                            });
                        } else {
                            next(err2, db)
                        }
                    })
                }

            })
        },
        function(db, next) {
            // Get the current working collection
            self._mongo = db;
            db.collection(self.collection, {safe: self.safe_collections}, next);
        },
        function(collection, next) {
            // Get all config items for this app
            collection.find({app: self.app}).toArray(function(err, docs){
                var path = null;

                failOn(err);

                docs.forEach(function(item) {
                    // Fill the cache
                    for(var key in item) {
                        path = nconf.path(key);
                        self.cache.set(path[1] || path[0], item[key]);
                    }
                });
                self.cache.set('app', self.app);

                next(null, collection);
            });
        },
        function(collection, next) {
            // Handle appropriate cleanup
            process.on('exit', function() {
                self._mongo.close();
            });
            next(null, collection);
        }],
        function(err, collection) {
            // Complete initialization and notify callback
            self._collection = collection;
            self.loaded = true;
            if(self.saveRequested) {
                delete self.saveRequested;
                self.save();
            }
            callback(err, self.cache);
        }
    );

};



/**
 * Retrieves the value associated with the given key
 * @param {String} key the key for which to retrieve the associate value
 */
Mongodb.prototype.get = function(key) {
    'use strict';

    key = Mongodb.resolveKey(key);

    return this.cache.get(key);
};



/**
 * Associates the provided value with the provided key
 * @param {String} key the key for which to set the provided value
 * @param {Object} value the value to associate with the provided key
 */
Mongodb.prototype.set = function(key, value) {
    'use strict';

    var self = this,
        success = true;

    key = Mongodb.resolveKey(key);

    success = this.cache.set(key, value);
    self.save();
    return success;
};



/**
 * Removes the value associated with the provided key.
 * @param {String} key The key representing the item to remove
 */
Mongodb.prototype.clear = function(key) {
    'use strict';
    return this.set(key, undefined);
};



/**
 * Merges the properties in 'value' into the existing object value
 * at 'key'. If the existing value 'key' is not an Object, it will be
 * completely overwritten.
 * @param {String} key Key to merge the value into
 * @patam {Object} value Value to merge into the key
 */
Mongodb.prototype.merge = function(key, value) {
    'use strict';

    var self = this,
        merged = null;

    key = Mongodb.resolveKey(key);
    merged = this.cache.merge(key, value);

    // process.nextTick(function() {
    //     var root = nconf.path(key)[0],
    //         document = self.cache.get(root);
    //     self._collection.save(document, {safe:self.safe_collections}, function(err) {
    //         if (err) console.error(err);
    //     });
    // });

    return merged;
};



/**
 * Persists all keys to the backing data store.
 * @param {Function} [callback]
 */
Mongodb.prototype.save = function(callback) {
    'use strict';

    var self = this,
        queue = null;
    if(!self.loaded) {
        self.saveRequested = true;
    } else {
        // Create a queue to process document saves
        queue = async.queue(function (document, callback) {
            self._collection.save(document, {safe:self.safe_collections}, function(err) {
                if (err) console.error(err);
            });
            callback();
        }, 4);

        queue.drain = callback || function() {};
        queue.push(this.cache.store);
    }

};



/**
 * Clears all keys associated with this instance.
 * @param {Function} [callback] optional continuance to be called when rest is complete
 */
Mongodb.prototype.reset = function(callback) {
    'use strict';
    var reset = this.cache.reset();
    if (reset) {
        // Since all properties share the same app name. just remove all for this 'app'
        this._collection.remove({app: this.app}, {safe:true}, callback);
    }
    return reset;
};
