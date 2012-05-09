var should = require('should'),
	nconf = require('nconf');

require('../index');


describe('nconf-mongodb', function() {
	
	var mongodb = nconf.Mongodb;
	
	it('should support the mongodb type', function(next) {
		should.exist(mongodb);
		next();
	});
	
	it('should be initialized through nconf', function(next) {
		nconf.use('mongodb', { host: 'localhost', port: 27017 });
		next();
	});
	
});