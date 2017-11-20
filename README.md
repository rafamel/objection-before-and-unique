# objection-before-and-unique

[![Version](https://img.shields.io/github/package-json/v/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique)
[![Build Status](https://travis-ci.org/rafamel/objection-before-and-unique.svg)](https://travis-ci.org/rafamel/objection-before-and-unique)
[![Coverage](https://img.shields.io/coveralls/rafamel/objection-before-and-unique.svg)](https://coveralls.io/github/rafamel/objection-before-and-unique)
[![Dependencies](https://david-dm.org/rafamel/objection-before-and-unique/status.svg)](https://david-dm.org/rafamel/objection-before-and-unique)
[![Vulnerabilities](https://snyk.io/test/npm/objection-before-and-unique/badge.svg)](https://snyk.io/test/npm/objection-before-and-unique)
[![Issues](https://img.shields.io/github/issues/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/issues)
[![License](https://img.shields.io/github/license/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/blob/master/LICENSE)

**Advanced unique validation + Simpler `before` checks + Final schema validation for [Objection.js](http://vincit.github.io/objection.js/)**

## Install

[`npm install objection-before-and-unique`](https://www.npmjs.com/package/objection-before-and-unique)

## Important

- By default, all [`Model.query()`](http://vincit.github.io/objection.js/#query) update and patch operations are disabled. You must use [`instance.$query()`](http://vincit.github.io/objection.js/#_s_query) for any update or patch operation. [You can check here how to do it instead,](#instance-updatepatch-queries) or [check `opts.old` for more information.](#optsold)
- This plugin uses [`$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate) and [`$beforeInsert`](http://vincit.github.io/objection.js/#_s_beforeinsert) to run all checks. If you want to use them in your model instead of [opts.before](#optsbefore), you should always call `super.$beforeInsert` or `super.$beforeUpdate` first. [Here's how](#using-beforeinsert-and-beforeupdate-in-your-model).
- Only the first error thrown by the [unique](#optsunique) and [before](#optsbefore) checks will be thrown. [Here's more information on the errors thrown by the unique checks.](#optsunique)

## Setup

To set up, mixin the model:

```javascript
const Model = require('objection').Model;
const beforeUnique = require('objection-before-and-unique');
// Pass`objection-before-and-unique` options
// when you mixin the model
const opts = {
    ...
};
class MyModel extends beforeUnique(opts)(Model) {
    ...
}
```

Where `opts` is an object with the options taken by this plugin - [here's a complete example.](#complete-setup-example)

### `opts.unique`

*Optional.* Sets the unique columns.

**Array of objects**, each with keys:

- `col`: *String.* Column name to check for uniqueness.
- `label` (optional): *String.* How to name `col` in the response error message - if any.
- `insensitive` (optional): *Boolean.* If `col` is a string, whether uniqueness should be evaluated as case insensitive.
- `for` (optional): *Array of strings.* Limits the query for uniqueness to rows that share the same `for` column values. If `{ col: 'alias', for: ['team_id'] }`, uniqueness is checked against all records with the same `team_id` (`where team_id = ...`). [Its usage is forbidden when `opts.old` is set to `false`.](#optsold)
- `message` (optional): *String.* Substitutes the default error message.

```javascript
opts.unique = [
    { col: 'username', label: 'User' },
    { col: 'email', label: 'Email', insensitive: true },
    { col: 'alias', for: ['team_id'], message: 'The alias is already taken'}
];
```

If any of the unique checks fails, a [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) will be thrown via [`Model.createValidationError()`](http://vincit.github.io/objection.js/#createvalidationerror) with a `keyword` value of `'unique'`, if you so wish to catch them. Only the first error thrown will be returned - this is also true for the [`before`](#optsbefore) checks.

### `opts.before`

*Optional.* Defines functions to run before inserting/patching/updating a database entry, to do any additional checks/validations or mutate the instance object.

**Array of functions**, each:

- Taking an object with keys:
    - `instance`: The new model instance created by the insert/update/patch. Keep in mind that, if the operation is a patch, the instance data might not be complete.
    - `old`: The old model instance (with the values prior to the update/patch operation). It is `undefined` when the operation is an insert (as there is no previous instance), and [inexistent/not passed when opts.old is set to `false`](#optsold).
    - `context`: The [*query context*](http://vincit.github.io/objection.js/#context) object.
    - `operation`: *String.* The type of operation; it can have values `'insert'`, `'update'`, or `'patch'`.
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

### `opts.schema`

*Optional,* [*Joi schema object.*](https://github.com/hapijs/joi/blob/master/API.md#validatevalue-schema-options-callback)

Intended as a partial validation for anything that might have changed via your [`before`](#optsbefore) checks since the instance was created and validated via the default *Objection.js* validator (which always runs before).

The instance itself will **not be mutated** by this validation, as it's intended as a last step.

Even though, *Joi* is used, if the instance fails to pass the schema, a *Objection.js* [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) will be thrown via [`Model.createValidationError()`], with `keyword` of `schema`.

The following options are [passed to the *Joi* validation](https://github.com/hapijs/joi/blob/master/API.md#validatevalue-schema-options-callback):

```javascript
{
    abortEarly: true,
    convert: false,
    allowUnknown: true,
    stripUnknown: false,
    presence: 'optional',
    noDefaults: true
}
```

```javascript
const joi = require('joi');
opts.schema = Joi.object().keys({
    hash: Joi.string().required(),
    password: Joi.any().forbidden()
});
```

### `opts.precedence`

*Optional.* Defines the order in which the checks should run.

**Object** with keys.

- `first`: *String.* Valid values are:
    - `'before'`
    - `'unique'`
    - `'schema'`
- `last`: *String.* Valid values are:
    - `'before'`
    - `'unique'`
    - `'schema'`

If `first` has a value of `'before'` and `last` of `'unique'`, checks will be run in the following order (next will only begin once the previous has ended):

1. `before`
1. `schema`
1. `unique`

However, all tests within each *stage* will be run in parallel.

If `first` is defined, but not `last`, the other two will run in parallel after the first has completed. If, for example:

```javascript
opts.precedence = { first: 'before' };
```

`schema` and `unique` checks will run in parallel *after* `before` checks have completed. This is also true for when only `last` is defined. If, for example:

```javascript
opts.precedence = {
    last: 'schema'
};
```

Both `before` and `unique` checks will run in parallel first and then, `schema` checks would be run once they both have completed.

To run all tests (`before`, `unique`, and `schema`) in parallel pass an empty object (`opts.precedence = {}`).

The default value for `opts.precedence` is:

```javascript
opts.precedence = {
    first: 'before',
    last: 'unique'
};
```

### `opts.old`

*Optional,* **boolean.**

- `true`: *Default.* Preserves the default behavior - description below.
- `false`: Old database record values will be ignored when patching/updating. **Please be aware of the repercusions** - more information below.

Because of the way `Objection.js` works, [as it doesn't recover and pass the previous instance when doing patches or updates through `Model.query()` to `$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate), any [`Model.query()`](http://vincit.github.io/objection.js/#query) update/patch will lack any information regarding the database record to update/patch. The implication of this is that, when validating the [uniqueness](#optsunique) of any value, if any of the values to update/patch is equal to the previous value in the database for that record, we won't know that it is actually the same record and therefore the validation will fail.

Within this limitations, there are two options:

- Completely disable updates/patches when we lack the information about the previous record (*a.k.a,* when doing them via [`Model.query()`](http://vincit.github.io/objection.js/#query)). This is the default behavior.
- Acknowledge that [unique validations](#optsunique) will fail if any update/patch operation contain any unique field with unchanged data in relation to the database record.

Therefore, **[`Model.query()`](http://vincit.github.io/objection.js/#query) patches and updates are disabled by default** - [you can check here how to do it instead.](#instance-updatepatch-queries) Though having to do a select query to recover all records we'd like to change will have some negative performance impact, it's the price to pay to effectively check for uniqueness. However, **the default behavior can be disabled,** as long as you're aware that, when doing so:

- As it was mentioned, any update/patch operation containing any unique field with unchanged data for a record will fail.
- The `for` option for [`opts.unique`](#optsunique) will be disabled (and forbidden), as there won't be a reliable way to check the complete records.
- The `old` key will never be passed to the functions within [`opts.before`](#optsbefore), to ensure consistency and prevent mistakes.

It would be, for example, fitting to disable the default behavior when there are no [checks for uniqueness](#optsunique) and you don't require any information from the previous values on your [`opts.before`](#optsbefore) functions.

```javascript
opts.old = true;
```

### Complete Setup Example

```javascript
const Model = require('objection').Model;
const beforeUnique = require('objection-before-and-unique');

const opts = {
    schema: Joi.object().keys({
        hash: Joi.string().required(),
        password: Joi.any().forbidden()
    }),
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
};

class MyModel extends beforeUnique(opts)(Model) {
    ...
}
```

## Usage

Once [you've set it up](#setup), you can use your model as you would with any other [Objection.js](http://vincit.github.io/objection.js/) model, with the difference that [you won't be able to do any update/patch via `Model.query()`](#optsold).

### Instance update/patch queries

For single queries, you could follow these straightforward patterns when you lack the instance to update/patch:

```javascript
MyModel().query()
    .first()
    .where('column', 'value')
    // Throw if no result found for the select query.
    .throwIfNotFound()
    .then(m => m.$query()
        .updateAndFetch({ myColToChange: 'myNewValue' })
    );
```

Or:

```javascript
MyModel().query()
    .first()
    .where('column', 'value')
    // Return without patching if there is no result.
    // The check would be 'm.length < 1' if we were
    // expecting an array instead of a single object.
    .then(m => (!m) ? m : m.$query()
        .patchAndFetch({ myColToChange: 'myNewValue' })
    );
```

### Using $beforeInsert and $beforeUpdate in your Model

As this plugin uses [`$beforeInsert`](http://vincit.github.io/objection.js/#_s_beforeinsert) and [`$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate) under the hood, if you decide to use them instead of or in addition to [`opts.before`](#optsbefore) checks, make sure to always call and resolve the `super` of the function like so:

```javascript
const Model = require('objection').Model;
const beforeUnique = require('objection-before-and-unique');
class MyModel extends beforeUnique(opts)(Model) {
    $beforeInsert(context) {
        return Promise.resolve(
            super.$beforeInsert(context)
        ).then(() => {
            // Your $beforeInsert checks
        });
    }

    $beforeUpdate(options, context) {
        return Promise.resolve(
            super.$beforeUpdate(options, context)
        ).then((res) => {
            // Your $beforeUpdate checks
        });
    }
}
```
