# objection-before-and-unique

[![Version](https://img.shields.io/github/package-json/v/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique)
[![Build Status](https://travis-ci.org/rafamel/objection-before-and-unique.svg)](https://travis-ci.org/rafamel/objection-before-and-unique)
[![Coverage](https://img.shields.io/coveralls/rafamel/objection-before-and-unique.svg)](https://coveralls.io/github/rafamel/objection-before-and-unique)
[![Dependencies](https://david-dm.org/rafamel/objection-before-and-unique/status.svg)](https://david-dm.org/rafamel/objection-before-and-unique)
[![Vulnerabilities](https://snyk.io/test/npm/objection-before-and-unique/badge.svg)](https://snyk.io/test/npm/objection-before-and-unique)
[![Issues](https://img.shields.io/github/issues/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/issues)
[![License](https://img.shields.io/github/license/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/blob/master/LICENSE)

**Advanced unique validation + Simpler `before` API/checks for [Objection.js](http://vincit.github.io/objection.js/)**

## Install

[`npm install objection-before-and-unique`](https://www.npmjs.com/package/objection-before-and-unique)

## Usage

Because of the way `Objection.js` works, [as it doesn't recover and pass the previous instance implicitly when doing patches or updates through `Model.query()` to `$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate), any [Model.query()](http://vincit.github.io/objection.js/#query) update/patch method will fail. In order to update/patch using this plugin, you must recover the instance first, and then do [`instance.$query()`](http://vincit.github.io/objection.js/#_s_query).

To use, mixin the model:

```javascript
const Model = require('objection').Model;
const beforeUnique = require('objection-before-and-unique');
class MyModel extends beforeUnique(opts)(Model) {
    ...
}
```

Where `opts` is an object with the options taken by `objection-before-and-unique`:

### `unique`

*Optional.* Sets the unique columns.

Takes an **array of objects**, each with keys:

- `col`: String. Column name to check for uniqueness.
- `label` (optional): String. How to name `col` in the response error message.
- `insensitive` (optional): Boolean. If `col` is a string, whether uniqueness should be evaluated as case insensitive.
- `for` (optional): Array of strings. Limits the query for uniqueness to rows that share the same `for` column values. If `{ col: 'alias', for: ['team_id'] }`, uniqueness is checked against all entried with the same `team_id` (`where team_id = ...`).
- `message` (optional): String. Substitutes the default error message.

```javascript
opts.unique = [
    { col: 'username', label: 'User' },
    { col: 'email', label: 'Email', insensitive: true },
    { col: 'alias', for: ['team_id'], message: 'The alias is already taken'}
];
```

If any of the unique checks fails, a [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) will be thrown via [`Model.createValidationError()`](http://vincit.github.io/objection.js/#createvalidationerror), and will have keyword `unique`, if you so wish to catch them. Only the first error thrown will be returned - this is also true for the `before` checks.

### `before`

*Optional.* Defines functions to run before inserting/patching/updating a database entry, to do any additional checks/validations or mutate the object.

Takes an **array of functions**, each:

- Taking two arguments, a first with the new instance created, and a second with the old values if updating/patching an entry:
    - *New instance* object: Bear in mind, when it's a patch it might not have all the values.
    - *Previous instance* object: `undefined` when it's an insert (as there is no previous instance).
- Optionally async/promise returning, and throwing an error to fail the check. For consistency, it would be recommended that you use the built-in [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) via [`Model.createValidationError()`](http://vincit.github.io/objection.js/#createvalidationerror) to throw it. You can optionally also mutate the the *new instance* object before it's written to the database.

```javascript
opts.before = [
    async (newInstance, oldInstance) => {
        // Maybe mutate the object like so
        newInstance.hash = await someAsyncHashFunction(newInstance.pass);
        delete newInstance.pass;
    },
    async (newInstance, oldInstance) => {
        // Do some async checks
        // Throw if it fails
        if (await someValidationFails(newInstance)) {
            throw Error('Some Error');
        }
    },
    (newInstance, oldInstance) => {
        // Maybe some additional sync checks
        // Throw with a Model ValidationError
        if (someValidationFails(newInstance)) {
            throw Model.createValidationError({
                someKey: [{
                    message: 'Some message',
                    keyword: 'unique'
                }]
            });
        }
    }
];
```

### `precedence`

*Optional,* **string.** Defines the order in which the checks should run. Valid values are:

- `'none'`: *Default.* Checks are run in parallel so their completion can happen in no specific order.
- `'before'`: Checks are run sequentially (next check only begins when the previous has ended) in the order they where passed. `before` checks are run first, then `unique`.
- `'unique'`: Checks are run sequentially (next check only begins when the previous has ended) in the order they where passed. `unique` checks are run first, then `before`.

```javascript
opts.precendence = 'unique';
```

### Example

```javascript
const Model = require('objection').Model;
const beforeUnique = require('objection-before-and-unique');

// Once you mixin the Model like so, you'll be able to define
// `uniqueConstraints` and `beforeChecks` in your model
class MyModel extends beforeUnique({
    precedence: 'none',
    unique: [
        { col: 'username', label: 'User' },
        { col: 'email', label: 'Email', insensitive: true },
        { col: 'alias', for: ['team_id'], message: 'The alias is already taken'}
    ],
    before: [
        async (newInstance, oldInstance) => {
            // Do some async checks
            // Throw if it fails
            if (await someValidationFails(newInstance)) {
                throw Error('Some Error');
            }
        },
        (newInstance, oldInstance) => {
            // Maybe some additional sync checks
            // Throw with a Model ValidationError
            if (someValidationFails(newInstance)) {
                throw Model.createValidationError({
                    someKey: [{
                        message: 'Some message',
                        keyword: 'unique'
                    }]
                });
            }
        },
        async (newInstance, oldInstance) => {
            // Maybe mutate the object like so
            newInstance.hash = await someAsyncHashFunction(newInstance.pass);
            delete newInstance.pass;
        }
    ]
})(Model) {
    ...
}
```
