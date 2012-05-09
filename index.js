var nconf = require('nconf'),
	lib = null;

nconf.__defineGetter__('Mongodb', function () {
	return lib || (lib = require('./lib/nconf-mongodb').Mongodb);
});
