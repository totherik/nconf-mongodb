var nconf = require('nconf'),
	lib = null;

nconf.__defineGetter__('Mongodb', function () {
    'use strict';
	return lib || (lib = require('./lib/nconf-mongodb').Mongodb);
});
