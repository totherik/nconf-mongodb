/**
 * nconf-Mongodb
 * Inspired by nconf-redis by indexzero (https://github.com/indexzero/nconf-redis)
 * and modeled after various nconf stores (https://github.com/flatiron/nconf/tree/master/lib/nconf/stores)
 */

var mongodb = require('mongodb'),
    nconf = require('nconf'),
    async = require('async');


/**
 * 
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
	
    this._mongo = null;
    this._collection = null;
};

Mongodb.prototype.load = function(callback) {
    'use strict';
    
    var self = this;
    async.waterfall([
        function(next) {
            // Create and open the connection
            var server = new mongodb.Server(self.host, self.port, { safe:true, auto_reconnect:true }, {}),
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
            // Get the current working collection
            self._mongo = db;
            db.collection(self.collection, {safe: true}, next);
        },
        function(collection, next) {
            // Get all config items for this app
            collection.find({app: self.app}).toArray(function(err, docs){
                var path = null;
                
                failOn(err);
                
                docs.forEach(function(item) {
                    // Fill the cache
                    path = nconf.path(item.key);
                    self.cache.set(path[1], item);
                    console.log(item);
                });
                
                next(null, collection);
            });
        },
        function(collection, next) {
            // Handle appropriate cleanup
            process.on('SIGINT', function() {
                var db = collection.db;
                // Call the close() method to close the db connections
                if (db.auths && db.auths.length) {
                    db.logout(function() {
                        db.close();
                    });
                } else {
                    db.close();
                }
            });
            next(null, collection);
        }],
        function(err, collection) {
            // Complete initialization and notify callback
            self._collection = collection;
            callback(err, self.cache);
        }
    );

};

function resolveKey(key) {
    var path = nconf.path(key);
    path.splice(1, 0, 'value');
    return nconf.key.apply(null, path);
}

Mongodb.prototype.get = function(key) {
    'use strict';
    
    var self = this,
        now = Date.now(),
        mtime = 0;

    key = resolveKey(key);
    mtime = this.cache.mtimes[key];
    
    if (mtime && (now - mtime) > this.ttl) {
        // Data is expired, so refresh - eventually
        process.nextTick(function() {
            var root = nconf.path(key)[0],
                fullKey = nconf.key(self.namespace, root);
                
            self._collection.findOne({key:fullKey}, function(err, document) {
                if (err) return console.error(err);
                self.cache.set(root, document);
            });
        });
    }
    
    return this.cache.get(key);
};

Mongodb.prototype.set = function(key, value) {
    'use strict';
    
    var self = this,
        root = null,
        fullKey = null,
        document = null,
        success = true;
        
    key = resolveKey(key);
    root = nconf.path(key)[0];
    document = this.get(root);
    
    if (!document)  {
        // Document doesn't yet exist in the cache, so
        // create an empty one and add it.
        fullKey = nconf.key(this.namespace, root);
        document = {key: fullKey, value: {}, app: self.app};
        success = this.cache.set(root, document);   
    }
    
    if (success) {
        // Document exists or was successfully created, so
        // set the requested value.
        success = this.cache.set(key, value);
        if (success) {
            // New value was cached, so async persist the whole document.
            document = this.cache.get(root);
            process.nextTick(function() {
                self._collection.save(document, {safe: true}, function(err) {
                    if (err) console.error(err);
                });
            });
        }
    }
    
    return success;
};

Mongodb.prototype.clear = function(key) {
    var self = this,
        root = null,
        original = null,
        success = false,
        modified = false;
    
    key = resolveKey(key);
    root = nconf.path(key)[0],
    original = this.cache.get(root);
    success = this.cache.clear(key);
    modified = this.cache.get(root);
    
    if (success) {
        process.nextTick(function() {
            var _id = null;
            if (!!modified.value) {
                self._collection.save(modified, {safe: true}, function(err) {
                    if (err) console.error(err);
                });
            } else {
                //_id = mongodb.ObjectID(original._id);
                self._collection.remove(original._id, {safe: true}, function(err, count) {
                    if (err || !count) console.error(err || 'Record not removed');
                });
            }
        });
    }
    
    return success;
};


/**
 * 
 * @param {String} key
 * @patam {Object} value
 */
Mongodb.prototype.merge = function(key, value) {
    
};

Mongodb.prototype.save = function() {
    
};

Mongodb.prototype.reset = function() {
    
};
