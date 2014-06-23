var should = require('should'),
	nconf = require('nconf');

require('../index');

var testKey = 'test'
	, expected = 'expected-value'

var mongoOpts = { db: 'nconf-mongodb-test', host: 'localhost', port: 27017 };

function getMongo() {
	var conf = new nconf.Provider();
	conf.use('mongodb', mongoOpts);
	return conf;
}

describe('nconf-mongodb', function() {

	var mongodb = nconf.Mongodb;

	it('should support the mongodb type', function(next) {
		should.exist(mongodb);
		next();
	});

	it('should be initialized through nconf', function(next) {
		var conf = getMongo();
		should.exist(conf.stores.mongodb);
		next();
	});

	it('should store values in nconf', function(next) {
		var conf = getMongo();
		conf.set(testKey, expected);
		conf.get(testKey).should.equal(expected);
		next();
	});

	it('should store values in mongodb for nconf', function(next) {
		var conf = getMongo();
		conf.load(function(err, docs) {
			should.not.exist(err);
			conf.set(testKey, expected);
			conf.save(function(saveErr) {
				should.not.exist(saveErr);
				var conf2 = getMongo();
				conf2.load(function(loadErr, doc) {
					should.not.exist(loadErr);
					conf2.get(testKey).should.equal(expected);
					next();
				})
			});
		});
	});

	it('should clear the key when clear is called', function(next) {
		var conf = getMongo();
		conf.load(function(err, docs) {
			should.not.exist(err);
			conf.set(testKey, expected);
			conf.save(function(saveErr) {
				should.not.exist(saveErr);
				var conf2 = getMongo();

				conf2.load(function(loadErr, doc) {
					should.not.exist(loadErr);
					should.exist(doc);
					conf2.get(testKey).should.equal(expected);
					conf2.clear(testKey);
					should.not.exist(conf2.get(testKey));
					next();
				});
			});
		});
	});

	it('should remove the keys from mongo on reset', function(next) {
		var mongo = new nconf.Mongodb(mongoOpts);
		mongo.load(function(err, doc) {
			mongo.reset(function() {
				next();
			});
		});
	});
});