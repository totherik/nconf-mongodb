/**
 * nconf-Mongodb
 * Inspired by nconf-redis by indexzero (https://github.com/indexzero/nconf-redis)
 * and modeled after various nconf stores (https://github.com/flatiron/nconf/tree/master/lib/nconf/stores)
 */

var mongodb = require('mongodb'),
	nconf = require('nconf'),
    async = require('async'),
    Event = require('events').EventEmitter;

/**
 * 
 * @param {Function} fn
 * @param {Object} context
 */
function proxy(fn, context) {
    'use strict';
	return function() {
		fn.apply(context, arguments);
	};
}

/**
 * 
 * @param {Object} err
 */
function failOn(err) {
    'use strict';
    if (err) throw (err instanceof Error) ? err : new Error(String(err));
}


/**
 * @param {Function} callback
 */
function whenReady(callback) {
    'use strict';
    if (this._collection) {
        callback.call(this, this._collection);
	} else {
        this._status.on('ready', (function(provider, fn) {
            return function ready(collection) {
                provider._status.removeListener('ready', ready);
                fn.call(provider, collection);
            };
        })(this, callback));
	}
}


/**
 * Constructor function for the Mongodb nconf store which maintains
 * a nested json structure based on key delimiters ':'.
 * 
 * e.g. 'my:nested:key' ==> '{ my: { nested: { key: } } }'
 * 
 * @constructor
 * @param {Object} option Options for this instance
 */
var Mongodb = exports.Mongodb = function (options) {
    "use strict";
    
	options = options || {};
	this.type = 'Mongodb';
    this.namespace = options.namespace || 'mongodb';
    this.app = options.app || 'general';
    this.ttl = options.ttl || 60 * 60 * 1000;
    this.cache = new nconf.Memory();
	this.readOnly = false;
    
	this.host = options.host || 'localhost';
	this.port = options.port || 27017;
	this.db = options.db || 'nconf';
	this.collection = options.collection || 'config';
    this.auth = options.auth;
	
    this._mongo = null;
    this._collection = null;
    this._status = new Event();
    
    var self = this;
    async.waterfall([
        function(next) {
            // Create and open the connection
            var server = new mongodb.Server(self.host, self.port, { safe:true, poolSize:10, auto_reconnect:true }, {}),
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
        }],
        function(err, collection) {
            failOn(err);
            // Complete initialization and notify ready state
            self._collection = collection;
            self._status.emit('ready', collection);
        }
    );
    
    this._status.on('ready', function(collection) {
        var db = collection.db;
        process.on('SIGINT', function() {
            // Call the close() method to close the db connections
            if (db.auths && db.auths.length) {
                db.logout(function() {
                    db.close();
                });
            } else {
                db.close();
            }
        });
    });
};


/**
 * 
 * @param {Object} object
 * @param {Array} path
 */
Mongodb._traverse = function(object, path) {
    'use strict';
    var value = object && object.value;
    while (value && path.length) {
        value = value[path.shift()];
    }
    return value;
};


/**
 * 
 * @param {Function} command
 */
Mongodb.prototype._whenReady = function(command) {
    'use strict';
    var self = this;
    
    if (this._collection) {
        command.call(this, this._collection);
    } else {
        this._status.on('ready', function ready(collection) {
            self._status.removeListener('ready', ready);
            command.call(self, collection);
        });
	}
};


/**
 * Retrieves the value for the specified key (if any).
 * @param {String} Key to retrieve for this instance.
 */
Mongodb.prototype.get = function (key, callback) {
    'use strict';
    
    this._get(key, function(err, raw) {
        callback(err, Mongodb._traverse(raw, nconf.path(key).slice(1))); 
    });
};


Mongodb.prototype._get = function(key, callback) {
    'use strict';
    
    var now = Date.now(),
        path = nconf.path(key),
        root = path.shift(),
        fullKey = nconf.key(this.namespace, root),
        mtime = this.cache.mtimes[root] || 0;
        
    callback = callback || function() {};
    
    if ((now - mtime) < this.ttl) {
        // Still fresh, so use cached version
        callback(null, this.cache.get(root));
        return;
    }
    
    this._whenReady(function(collection) {
        var self = this,
            query = { key: fullKey, app: this.app };
            
    	collection.findOne(query, function(err, doc) {
            self.cache.set(root, doc);
            callback(null, doc);
		});
	});
}

/**
 * Sets the 'value' for the specified 'key' in this instance.
 * @param {String} key Key to set in this instance
 * @param {Object} value Value for the specified key
 */
Mongodb.prototype.set = function (key, value, callback) {
    'use strict';
    
    var self = this,
        path = nconf.path(key),
        root = path.shift(),
        fullKey = nconf.key(this.namespace, root);
    
    callback = callback || function() {};
    
    function makeAndSet(src, key, value) {
        var val = src.value,
            ns = path.concat(),
            prop = ns.shift();
        
        while (ns.length > 1) {
            val[prop] = val[prop] || {};
            val = val[prop];
            prop = ns.shift();
        }
        prop ? val[prop] = value : src.value = value;
        return src;
    }
    
    this._get(key, function(err, raw) {
        raw = raw || {key: fullKey, value: {}, app: self.app };
        var data = makeAndSet(raw, key, value);
        self._whenReady(function(collection) { 
            collection.save(data, { safe:true }, function(err) {
                self.cache.set(root, data);
                callback(err);
            });
        });
    });
};


/**
 * Removes the value for the specified 'key' from this instance.
 * @param {String} key Key to remove from this instance
 */
Mongodb.prototype.clear = function (key) {
	
};


/**
 * Merges the properties in 'value' into the existing object value
 * at 'key'. If the existing value 'key' is not an Object, it will be
 * completely overwritten.
 * @param {String} key Key to merge the value into
 * @param {Object} value Value to merge into the key
 */
Mongodb.prototype.merge = function (key, value) {
	
};


/**
 * Clears all keys associated with this instance.
 */
Mongodb.prototype.reset = function () {
	
};


/**
 * Loads the store managed by this instance and returns it via
 * the provided callback.
 * @param {Function} callback
 */
Mongodb.prototype.load = function(callback) {
	
};


/**
 * Returns the store managed by this instance
 */
Mongodb.prototype.loadSync = function () {
	
};

