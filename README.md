# objection-before-and-unique

[![Version](https://img.shields.io/github/package-json/v/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique)
[![Build Status](https://travis-ci.org/rafamel/objection-before-and-unique.svg)](https://travis-ci.org/rafamel/objection-before-and-unique)
[![Coverage](https://img.shields.io/coveralls/rafamel/objection-before-and-unique.svg)](https://coveralls.io/github/rafamel/objection-before-and-unique)
[![Dependencies](https://david-dm.org/rafamel/objection-before-and-unique/status.svg)](https://david-dm.org/rafamel/objection-before-and-unique)
[![Vulnerabilities](https://snyk.io/test/npm/objection-before-and-unique/badge.svg)](https://snyk.io/test/npm/objection-before-and-unique)
[![Issues](https://img.shields.io/github/issues/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/issues)
[![License](https://img.shields.io/github/license/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/blob/master/LICENSE)

**Advanced unique validation + Simpler `before` checks + Final instance validation for [Objection.js](http://vincit.github.io/objection.js/)**

## Install

[`npm install objection-before-and-unique`](https://www.npmjs.com/package/objection-before-and-unique)

## Usage

Because of the way `Objection.js` works, [as it doesn't recover and pass the previous instance implicitly when doing patches or updates through `Model.query()` to `$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate), any [Model.query()](http://vincit.github.io/objection.js/#query) update/patch method will fail. In order to update/patch using this plugin, you must recover the instance first, and then do [`instance.$query()`](http://vincit.github.io/objection.js/#_s_query). This will have a negative performance impact.

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

- Taking an object with keys:
    - `instance`: The new model instance created by the insert/update/patch. Keep in mind that, if the operation is a patch, the instance data might not be complete.
    - `old`: The old model instance (with the values prior to the update/patch operation). It is `undefined` when the operation is an insert (as there is no previous instance), and [inexistent/not passed when opts.old is set to `false`](#old).
    - `context`: The [*query context*](http://vincit.github.io/objection.js/#context) object.
    - `operation`: *String*. The type of operation; it can have values `'insert'`, `'update'`, or `'patch'`.
- Optionally async/promise returning, and throwing an error to fail the check. For consistency, it would be recommended that you use the built-in [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) via [`Model.createValidationError()`](http://vincit.github.io/objection.js/#createvalidationerror) to throw it. You can optionally also mutate the the `instance` object before it's written to the database.

You can [destructure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) the object each function takes as desired:

```javascript
opts.before = [
    ({ instance, old, operation, context }) => {
        // Maybe mutate the object like so
        if (operation !== 'insert' && old.someProperty) {
            instance.someProperty += old.someProperty;
        } else if (context.toAdd) {
            instance.someProperty += context.toAdd;
        }
    },
    async ({ instance }) => {
        // Or mutate the object asynchronously like so
        instance.hash = await someAsyncHashFunction(instance.password);
        delete instance.password;
    },
    async ({ instance }) => {
        // Do some async checks
        // Throw if it fails
        if (await someValidationFails(instance)) {
            throw Error('Some Error');
        }
    },
    ({ instance }) => {
        // Maybe some additional sync checks
        // Throw with a Model ValidationError
        if (someValidationFails(instance)) {
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

**Setting precedence to any other than `'none'` will, however, negatively impact performance** (as checks are not being run in parallel).

```javascript
opts.precendence = 'unique';
```

### Example

```javascript
const Model = require('objection').Model;
const beforeUnique = require('objection-before-and-unique');

// Mixin the Model like so, and define
// `objection-before-and-unique` options
class MyModel extends beforeUnique({
    precedence: 'none',
    unique: [
        { col: 'username', label: 'User' },
        { col: 'email', label: 'Email', insensitive: true },
        { col: 'alias', for: ['team_id'], message: 'The alias is already taken'}
    ],
    before: [
        ({ instance, old, operation, context }) => {
            // Maybe mutate the object like so
            if (operation !== 'insert' && old.someProperty) {
                instance.someProperty += old.someProperty;
            } else if (context.toAdd) {
                instance.someProperty += context.toAdd;
            }
        },
        async ({ instance }) => {
            // Or mutate the object asynchronously like so
            instance.hash = await someAsyncHashFunction(instance.password);
            delete instance.password;
        },
        async ({ instance }) => {
            // Do some async checks
            // Throw if it fails
            if (await someValidationFails(instance)) {
                throw Error('Some Error');
            }
        },
        ({ instance }) => {
            // Maybe some additional sync checks
            // Throw with a Model ValidationError
            if (someValidationFails(instance)) {
                throw Model.createValidationError({
                    someKey: [{
                        message: 'Some message',
                        keyword: 'unique'
                    }]
                });
            }
        }
    ]
})(Model) {
    ...
}
```
