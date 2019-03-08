# **obau:** objection-before-and-unique

[![Version](https://img.shields.io/npm/v/objection-before-and-unique.svg)](https://www.npmjs.com/package/objection-before-and-unique)
[![Build Status](https://img.shields.io/travis/rafamel/objection-before-and-unique.svg)](https://travis-ci.org/rafamel/objection-before-and-unique)
[![Coverage](https://img.shields.io/coveralls/rafamel/objection-before-and-unique.svg)](https://coveralls.io/github/rafamel/objection-before-and-unique)
[![Dependencies](https://img.shields.io/david/rafamel/objection-before-and-unique.svg)](https://david-dm.org/rafamel/objection-before-and-unique)
[![Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/objection-before-and-unique.svg)](https://snyk.io/test/npm/objection-before-and-unique)
[![License](https://img.shields.io/github/license/rafamel/objection-before-and-unique.svg)](https://github.com/rafamel/objection-before-and-unique/blob/master/LICENSE)
[![Types](https://img.shields.io/npm/types/objection-before-and-unique.svg)](https://www.npmjs.com/package/objection-before-and-unique)

<!-- markdownlint-disable MD036 -->
**Unique validation + Simpler `before` checks + Final schema validation for [`Objection.js`](http://vincit.github.io/objection.js/)**
<!-- markdownlint-enable MD036 -->

* [Install](#install)
* [Important notes](#important-notes)
* [Documentation](#documentation)
* [Setup](#setup)
* [Caveats](#caveats)

## Install

[`npm install objection-before-and-unique`](https://www.npmjs.com/package/objection-before-and-unique)

## Important notes

* By default, all [`Model.query()`](http://vincit.github.io/objection.js/#query) update and patch operations are disabled. You must use [`instance.$query()`](http://vincit.github.io/objection.js/#_s_query) for any update or patch operation. [You can check here how to do it instead,](#instance-updatepatch-queries) and review [static `update` and `patch`](#static-update-and-patch) for more information.
* This plugin uses [`$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate) and [`$beforeInsert`](http://vincit.github.io/objection.js/#_s_beforeinsert) to run all checks. If you want to use them in your model, you should always call `super.$beforeInsert` or `super.$beforeUpdate` first. [Here's how.](#beforeinsert-and-beforeupdate)

## Documentation

[Docs can be found here.](https://rafamel.github.io/objection-before-and-unique/) Be sure to check out the [complete setup example](#complete-example) and [caveats](#caveats) first.

## Setup

To set up, mixin the model:

```javascript
import { Model } from 'objection';
import obau from 'objection-before-and-unique';
// pass options when mixin in the model
const opts = {
  // ...
};
class MyModel extends obau(opts)(Model) {
  // ...
}
```

### Complete Example

```javascript
import { Model } from 'objection';
import obau from 'objection-before-and-unique';

const opts = {
  schema: {
    type: 'object',
    required: ['hash'],
    properties: {
      hash: { type: 'string' }
    }
  },
  unique: [
    { key: 'username' },
    { key: 'email' },
    { key: ['alias', 'team_id'] }
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

class MyModel extends obau(opts)(Model) {
  ...
}
```

## Caveats

### Static `update` and `patch`

Because of the way `Objection.js` works, [as it doesn't recover and pass the previous instance when doing patches or updates through `Model.query()` to `$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate), any update/patch call to the static [`Model.query()`](http://vincit.github.io/objection.js/#query) method will lack any information regarding the database record to update/patch. The implication of this being that, when validating the uniqueness of any value, if any of the values to update/patch is equal to the previous value in the database for that record, we won't know that it is actually the same record and therefore the validation will fail.

Within this limitations, there are two available options:

* Completely disable updates/patches when we lack the information about the previous record, that is, when doing them via [`Model.query()`](http://vincit.github.io/objection.js/#query). This is the default behavior.
* Acknowledge that unique validations will fail if any update/patch operation contain any unique field with unchanged data in relation to the already existing database record.

With this module, **[`Model.query()`](http://vincit.github.io/objection.js/#query) patches and updates are disabled by default** -[you can check how to do it instead below.](#patterns-for-instance-updatepatch-queries) However, **this default behavior can be disabled** by setting the `old` option key to `false` when calling the default export of this module, as long as you're aware that, when doing so:

* As it was mentioned, any update/patch operation containing any unique field with unchanged data for a record will fail.
* The `old` key will never be passed to `before` hooks or `unique` callbacks, to ensure consistency and prevent mistakes.

It would be, for example, fitting to disable the default behavior when there are no checks for uniqueness and you don't require any information from the previous values on your `before` hooks.

#### Patterns for instance update/patch queries

For single queries, you could follow these straightforward patterns when you lack the instance to update/patch:

**Update:**

```javascript
MyModel
  .query()
  .first()
  .where('column', 'value')
  // Throw if no result found for the select query.
  .throwIfNotFound()
  .then((m) => m.$query().updateAndFetch({ myColToChange: 'myNewValue' }));
```

**Patch:**

```javascript
MyModel
  .query()
  .first()
  .where('column', 'value')
  // Return without patching if there is no result.
  // The check would be 'm.length < 1' if we were
  // expecting an array instead of a single object.
  .then(
    (m) => (!m ? m : m.$query().patchAndFetch({ myColToChange: 'myNewValue' }))
  );
```

### `$beforeInsert` and `$beforeUpdate`

As this plugin uses [`$beforeInsert`](http://vincit.github.io/objection.js/#_s_beforeinsert) and [`$beforeUpdate`](http://vincit.github.io/objection.js/#_s_beforeupdate) under the hood, if you decide to use them instead of or in addition to [`opts.before`](#optsbefore) checks, make sure to always call and resolve the `super` of the function like so:

```javascript
import { Model } from 'objection';
import obau from 'objection-before-and-unique';

class MyModel extends obau(opts)(Model) {
  async $beforeInsert(context) {
    await super.$beforeInsert(context);

    // Your $beforeInsert checks
  }

  async $beforeUpdate(options, context) {
    await super.$beforeUpdate(options, context);

    // Your $beforeUpdate checks
  }
}
```