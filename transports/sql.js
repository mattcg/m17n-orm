/**
 * SQL transport for restful-m17-orm.
 *
 * Two connections are used: one for reading and the other for writing.
 * Transactions on the write client are supported using bminer/node-mysql-queues.
 *
 * @fileOverview
 * @module restful-orm-sql
 * @author Matthew Caruana Galizia <m@m.cg>
 */

'use strict';

/*jshint node:true */

var

Deferred = require('tiny-deferred'),
mysql    = require('mysql'),
queues   = require('mysql-queues'),

readClient,
writeClient;


/**
 * Connect the read client.
 *
 * @param {Object} options
 * @param {function} connectCallback
 */
function connectRead(options, connectCallback) {
	readClient = mysql.createConnection(options);
	readClient.connect(connectCallback);
}


/**
 * Connect the write client.
 *
 * @param {Object} options
 * @param {function} connectCallback
 */
function connectWrite(options, connectCallback) {
	writeClient = mysql.createConnection(options);

	// Set up queueing on the write client
	queues(writeClient, true);
	writeClient.connect(connectCallback);
}


/**
 * Connect both the write and read clients.
 *
 * @param {Object} writeOptions
 * @param {Object} readOptions
 * @returns {Deferred}
 */
exports.connect = function(writeOptions, readOptions) {
	var check, connected = 0, connectDeferred = new Deferred();

	check = function(err) {
		if (err) {
			return connectDeferred.reject(err);
		}

		if (2 === ++connected) {
			connectDeferred.resolve();
		}
	};

	connectWrite(writeOptions, check);
	connectRead(readOptions, check);
	return connectDeferred;
};


/**
 * Remove an object from backend storage.
 *
 * @param {Object} object The object to remove
 * @returns {Deferred}
 */
exports.remove = function(object) {
	var query, constructor = object.constructor, removeDeferred = new Deferred();

	query = 'DELETE FROM ' + constructor.taxonomyName + ' WHERE id = ? LIMIT 1';
	writeClient.query(query, [object.id], function(err) {
		if (err) {
			removeDeferred.reject(err);
		} else {
			removeDeferred.resolve();
		}
	});

	return removeDeferred;
};


/**
 * Remove just the language data from the object.
 *
 * @param {Object} object
 * @returns {Deferred}
 */
exports.removeLanguage = function(object) {
	var query, constructor = object.constructor, removeDeferred = new Deferred();

	query = 'DELETE FROM ' + constructor.taxonomyName + '_language WHERE id = ? AND language = ? LIMIT 1';
	writeClient.query(query, [object.id, object.language], function(err) {
		if (err) {
			removeDeferred.reject(err);
		} else {
			removeDeferred.resolve();
		}
	});

	return removeDeferred;
};


/**
 * Get an object by ID and optional language.
 *
 * @param {Object} constructor
 * @param {number} id
 * @param {string} [languge]
 * @returns {Deferred}
 */
exports.get = function(constructor, id, language) {
	var query, tableName = constructor.taxonomyName, getDeferred = new Deferred();

	if (language) {
		query = 'SELECT ' + constructor.fields + ',' + constructor.languageFields + ' FROM ' + tableName + '_language INNER JOIN ' + tableName + ' USING (id) WHERE id = ? AND language = ? LIMIT 1';
	} else {
		query = 'SELECT ' + constructor.fields + ' FROM ' + tableName + ' WHERE id = ? LIMIT 1';
	}

	readClient.query(query, [id, language], function(err, result) {
		if (err) {
			getDeferred.reject(err);
		} else if (!result || !result.length) {
			getDeferred.reject();
		} else {
			getDeferred.resolve(constructor.create(result[0]));
		}
	});

	return getDeferred;
};


/**
 * Get a list of alternative languages for the object.
 *
 * @param {Object} object
 * @param {string} [nameField] Use to specify another field to return along with the language
 * @returns {Deferred}
 */
exports.getOtherLanguages = function(object, nameField) {
	var query, constructor = object.constructor, getDeferred = new Deferred();

	query = 'SELECT language';
	if (constructor.languageFields.indexOf(nameField) !== -1) {
		query += ', ' + nameField;
	}

	query += ' FROM ' + constructor.taxonomyName + '_language WHERE id = ? AND language != ?';
	readClient.query(query, [object.id, object.language], function(err, result) {
		if (err) {
			getDeferred.reject(err);
		} else if (!result || !result.length) {
			getDeferred.resolve();
		} else {
			getDeferred.resolve(result);
		}
	});

	return getDeferred;
};


/**
 * Save an object with its supported language fields in a single transaction.
 *
 * @param {Object} object The object to save
 * @returns {Deferred}
 */
function saveWithLanguage(object) {
	var trans, onError, constructor = object.constructor, saveDeferred = new Deferred();

	trans = writeClient.startTransaction();
	onError = function(err) {
		if (err && !trans.rolledback) {
			trans.rollback();
			saveDeferred.reject(err);
		}
	};

	trans.query('INSERT INTO ' + constructor.taxonomyName + ' SET ? ON DUPLICATE KEY UPDATE', exports.data(object), onError);
	trans.query('INSERT INTO ' + constructor.taxonomyName + '_language SET ? ON DUPLICATE KEY UPDATE', exports.languageData(object), onError);
	trans.commit(function(err, result) {
		if (err) {
			saveDeferred.reject(err);
		} else {

			// Update the ID on the object when inserted for the first time
			if (!object.id && result.insertId) {
				object.id = result.insertId;
			}

			saveDeferred.resolve(object);
		}
	});

	return saveDeferred;
}


/**
 * Save an object to backend storage.
 *
 * @param {Object} object The object to save
 * @returns {Deferred}
 */
exports.save = function(object) {
	var query, constructor = object.constructor, saveDeferred;

	if (object.language && object.languageFields) {
		return saveWithLanguage(object);
	}

	saveDeferred = new Deferred();
	query = 'INSERT INTO ' + constructor.taxonomyName + ' SET ? ON DUPLICATE KEY UPDATE';
	writeClient.query(query, this.data(object), function(err, result) {
		if (err) {
			saveDeferred.reject(err);
		} else {

			// Update the ID on the object when inserted for the first time
			if (!object.id && result.insertId) {
				object.id = result.insertId;
			}

			saveDeferred.resolve(object);
		}
	});

	return saveDeferred;
};


/**
 * Search for an object from backend storage.
 *
 * @param {Object} constructor
 * @param {string} field
 * @param {string} value
 * @param {string} [language]
 * @param {string} [orderBy]
 * @param {string} [orderDirection]
 * @param {number} [limitFrom]
 * @param {number} [limitTo]
 * @returns {Deferred}
 */
exports.searchByField = function(constructor, field, value, language, orderBy, orderDirection, limitFrom, limitTo) {
	var query, values, tableName = constructor.taxonomyName, limitMax = 1000, searchDeferred;

	if (language) {
		query  = 'SELECT ' + constructor.fields + ',' + constructor.languageFields + ' FROM ' + tableName + '_language INNER JOIN ' + tableName + ' USING (id) WHERE ? = ? AND language = ?';
		values = [field, value, language];
	} else {
		query  = 'SELECT ' + constructor.fields + ' FROM ' + tableName + ' WHERE ? = ?';
		values = [field, value];
	}

	if (orderBy && (orderDirection === 'desc' || orderDirection === 'asc')) {
		query += ' ORDER BY ? ' + orderDirection;
		values.push(orderBy);
	}

	if (!limitTo || limitTo > limitMax) {
		limitTo = limitMax;
	}

	query += 'LIMIT ?, ?';
	values.push(limitFrom || 0, limitTo);

	searchDeferred = new Deferred();
	readClient.query(query, values, function(err, rows) {
		if (err) {
			searchDeferred.reject(err);
		} else {
			searchDeferred.resolve(constructor.createList(rows));
		}
	});

	return searchDeferred;
};
