var should = require('should'),
	nconf = require('nconf');

require('../index');


describe('nconf-mongodb', function() {
	
	var mongodb = nconf.MongoDB;
	
	it('should support the mongodb type', function(next) {
		should.exist(mongodb);
		next();
	});
	
});