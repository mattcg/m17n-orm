/**
 * AJAX transport for restful-m17-orm.
 *
 * @fileOverview
 * @module restful-orm-ajax
 * @author Matthew Caruana Galizia <m@m.cg>
 */

'use strict';

/*jshint node:true */

var

ajax = require('responsive-ajax'),

headers;


/**
 * Set the HTTP Authorization header for all requests.
 *
 * @param {string} auth
 */
exports.setAuth = function(auth) {
	if (!auth) {
		if (headers && headers.Authorization) {
			delete headers.Authorization;
		}
	} else {
		if (!headers) {
			headers = {};
		}
	
		headers.Authorization = auth;
	}
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
	var path;

	path = '/' + constructor.taxonomyName + '/' + id;
	if (language) {
		path = path + '/' + language;
	}

	return ajax.get(path, null, headers).done(function(status, data) {
		return constructor.create(data);
	});
};


/**
 * Remove an object entirely from backend storage.
 *
 * @param {Object} object The object to remove
 * @returns {Deferred}
 */
exports.remove = function(object) {
	return ajax.del('/' + object.constructor.taxonomyName + '/' + object.id, null, headers);
};


/**
 * Remove an object's language data from backend storage.
 *
 * @param {Object} object The object for which to remove data
 * @returns {Deferred}
 */
exports.removeLanguage = function(object) {
	return ajax.del('/' + object.constructor.taxonomyName + '/' + object.id + '/' + object.language, null, headers);
};


/**
 * Save an object to backend storage.
 *
 * @param {Object} object The object to save
 * @returns {Deferred}
 */
exports.save = function(object) {
	var path, constructor = object.constructor;

	if (object.id) {
		path   = '/' + constructor.taxonomyName + '/' + object.id;

		if (object.language) {
			path += '/' + object.language;
		}

		return ajax.putJSON(path, exports.data(object), headers);
	}

	return ajax.postJSON('/' + constructor.taxonomyName, exports.data(object), headers);
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
	return ajax.get('/' + constructor.taxonomyName, {
		searchField:    field,
		searchValue:    value,
		searchLanguage: language,
		orderBy:        orderBy,
		orderDirection: orderDirection,
		limitFrom:      limitFrom,
		limitTo:        limitTo
	}, headers).done(function(dataList) {
		return constructor.createList(dataList);
	});
};


/**
 * Get a list of alternative languages for the object.
 *
 * @param {Object} object
 * @param {string} [nameField] Use to specify another field to return along with the language
 * @returns {Deferred}
 */
exports.getOtherLanguages = function(object, nameField) {
	return ajax.get('/' + object.constructor.taxonomyName + '/' + object.id  + '/' + object.language + '/others', {
		nameField: nameField
	}, headers);
};
