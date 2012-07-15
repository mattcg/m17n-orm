# m17n-orm

Multilingual ORM for restful public interfaces.

## Howto

Start by choosing a transport and passing it to `setTransport`. All transports export the same methods.

## Main Methods

If you're using the bundled transports, there's only one method on the main module which you'll need to use.

### setTransport(transport)

Set the transport module that will be used to carry out ORM requests.

```javascript
var orm = require('m17n-orm');

orm.setTransport(require('m17n-orm/transports/ajax'));
```

## Transport Methods

Transports must export at least the following set of methods.

### get(constructor, id, [language])

Get an object by ID and optional language.

### remove(object)

Remove an object entirely from backend storage.

### removeLanguage(object)

Remove an object's language data from backend storage.

### save(object)

Save an object to backend storage.

### searchByField(constructor, field, value, [language], [orderBy], [orderDirection], [limitFrom], [limitTo])

Search for an object from backend storage.

### getOtherLanguages(object, [nameField])

Get a list of alternative languages for the object. Use `nameField` to specify another field to return along with the language.