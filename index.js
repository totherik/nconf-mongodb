var nconf = require('nconf'),
	lib = null;

nconf.__defineGetter__('MongoDB', function () {
	return lib || (lib = require('./lib/nconf-mongodb').MongoDB);
});
