/**
 * nconf-Mongodb
 * Inspired by nconf-redis by indexzero (https://github.com/indexzero/nconf-redis)
 * and modeled after various nconf stores (https://github.com/flatiron/nconf/tree/master/lib/nconf/stores)
 */

var util = require('util'),
	mongodb = require('mongodb'),
	nconf = require('nconf');

function proxy(fn, context) {
	return function() {
		fn.apply(context, arguments);
	};
}

function init(err, db) {
	if (err) {
		throw err;
	}

	this.db = db;
	if (options.auth) {
		db.authenticate(options.auth.username, options.auth.password, function(err, success) {
			if (err) { throw err; }
		});
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
	nconf.Memory.call(this, options);
	
	options = options || {};
	this.type = 'Mongodb';
	this.readOnly = false;
	this.host = options.host || 'localhost';
	this.port = options.port || 27017;
	this.db = options.db || 'nconf';
	this.collection = options.collection || 'config-data';
	
	var server = new mongodb.Server(this.host, this.port, { auto_reconnect: true }, {}),
		db = new mongodb.Db('node-geodetails', server); 
	
	db.open(proxy(init, this));
};

util.inherits(Mongodb, nconf.Memory);

/**
 * Retrieves the value for the specified key (if any).
 * 
 * @param {String} Key to retrieve for this instance.
 */
Mongodb.prototype.get = function (key) {
	
};


/**
 * Sets the 'value' for the specified 'key' in this instance.
 * @param {String} key Key to set in this instance
 * @param {Object} value Value for the specified key
 */
Mongodb.prototype.set = function (key, value) {
	
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

