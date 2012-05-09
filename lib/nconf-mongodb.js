/**
 * nconf-mongodb
 * Inspired by nconf-redis by indexzero (https://github.com/indexzero/nconf-redis)
 * and modeled after various nconf stores (https://github.com/flatiron/nconf/tree/master/lib/nconf/stores)
 */

var util = require('util'),
	mongodb = require('mongodb'),
	nconf = require('nconf');


/**
 * Constructor function for the MongoDB nconf store which maintains
 * a nested json structure based on key delimiters ':'.
 * 
 * e.g. 'my:nested:key' ==> '{ my: { nested: { key: } } }'
 * 
 * @constructor
 * @param {Object} option Options for this instance
 */
var MongoDB = exports.MongoDB = function (options) {
	nconf.Memory.call(this, options);
	
	options = options || {};
	this.type = 'mongodb';
//	this.store = {};
//	this.mtimes = {};
	this.readOnly = false;
//	this.loadFrom = options.loadFrom || null;
};

util.inherits(MongoDB, nconf.Memory);

/**
 * Retrieves the value for the specified key (if any).
 * 
 * @param {String} Key to retrieve for this instance.
 */
MongoDB.prototype.get = function (key) {
	
};


/**
 * Sets the 'value' for the specified 'key' in this instance.
 * @param {String} key Key to set in this instance
 * @param {Object} value Value for the specified key
 */
MongoDB.prototype.set = function (key, value) {
	
};


/**
 * Removes the value for the specified 'key' from this instance.
 * @param {String} key Key to remove from this instance
 */
MongoDB.prototype.clear = function (key) {
	
};


/**
 * Merges the properties in 'value' into the existing object value
 * at 'key'. If the existing value 'key' is not an Object, it will be
 * completely overwritten.
 * @param {String} key Key to merge the value into
 * @param {Object} value Value to merge into the key
 */
MongoDB.prototype.merge = function (key, value) {
	
};


/**
 * Clears all keys associated with this instance.
 */
MongoDB.prototype.reset = function () {
	
};


/**
 * Loads the store managed by this instance and returns it via
 * the provided callback.
 * @param {Function} callback
 */
MongoDB.prototype.load = function(callback) {
	
};


/**
 * Returns the store managed by this instance
 */
MongoDB.prototype.loadSync = function () {
	
};

