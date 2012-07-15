/**
 * Multilingual ORM for restful public interfaces.
 *
 * @fileOverview
 * @module restful-orm
 * @author Matthew Caruana Galizia <m@m.cg>
 */

'use strict';

/*jshint node:true */

/**
 * Construct object instances.
 *
 * @param {function} Constructor Function for constructing instances
 * @param {Object} data Data object
 * @returns {Object}
 */
exports.create = function(Constructor, data) {
	var key, object = new Constructor();

	for (key in data) {
		if (object.hasOwnProperty(key)) {
			object[key] = data[key];
		}
	}

	return object;
};


/**
 * Construct a list of object instances.
 *
 * @param {function} Constructor
 * @param {Object[]} dataList
 * @returns {Object[]}
 */
exports.createList = function(Constructor, dataList) {
	return dataList.map(Constructor.create);
};


/**
 * Extract values from an object as a list of name and value pairs.
 *
 * @param {Object} object
 * @returns {Object}
 */
exports.data = function(object) {
	var i, l, values = {}, fields = object.constructor.fields;

	for (i = 0, l = fields.length; i < l; i++) {
		values[fields[i]] = object[fields[i]];
	}

	return values;
};


/**
 * Extract language values from an object as a list of name and value pairs.
 *
 * @param {Object} object
 * @returns {Object}
 */
exports.languageData = function(object) {
	var i, l, values = {}, fields = object.constructor.languageFields;

	if (fields) {
		for (i = 0, l = fields.length; i < l; i++) {
			values[fields[i]] = object[fields[i]];
		}
	}

	return values;
};


/**
 * Set the transport module that will provide the base ORM methods for this module.
 *
 * @param {Object} transport Object with methods
 * @returns {Object} The new API
 */
exports.setTransport = function(transport) {
	var key;

	for (key in transport) {
		if (transport.hasOwnProperty(key) && typeof key === 'function') {
			exports[key] = transport[key];
		}
	}

	return exports;
};
