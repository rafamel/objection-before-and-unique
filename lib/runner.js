const Joi = require('joi');

module.exports = async function runBeforeChecks(
  Model,
  queryContext,
  opts,
  operation,
  oldInstance
) {
  const isPatch = operation === 'patch';
  // Function to be execute for every unique constraint
  const checkUnique = async (constraint, ids) => {
    const tryFromOld = opts.old && isPatch;
    const thisHasCol = this.hasOwnProperty(constraint.col);
    // Only run this unique test if:
    // - the new instance has the unique column to check
    // or
    // - it is a patch AND the old instance has it AND some of the 'for' columns have changed
    if (!thisHasCol) {
      if (
        tryFromOld &&
        constraint.for &&
        oldInstance.hasOwnProperty(constraint.col)
      ) {
        let anyForColChanged = false;
        for (let col of constraint.for) {
          if (this.hasOwnProperty(col)) {
            anyForColChanged = true;
            break;
          }
        }
        if (!anyForColChanged) {
          return;
        }
      } else {
        return;
      }
    }

    // Get the value of the column to check for uniqueness
    // from new instance (or old, if a patch and the new lacks it)
    const colValue = thisHasCol
      ? this[constraint.col]
      : oldInstance[constraint.col];

    // Build query with case sensitivity/insensitivity
    const query = this.constructor.query().first();
    constraint.insensitive
      ? query.whereRaw(`LOWER(${constraint.col}) = LOWER('${colValue}')`)
      : query.where(constraint.col, colValue);

    // Additional for constraints on the query, if specified
    if (constraint.for) {
      constraint.for.forEach((col) => {
        if (this.hasOwnProperty(col)) {
          query.where(col, this[col]);
        } else if (tryFromOld && oldInstance.hasOwnProperty(col)) {
          query.where(col, oldInstance[col]);
        }
      });
    }

    // Exclude the previous record (if an update/patch)
    // from the uniqueness check
    if (opts.old && oldInstance) {
      ids.forEach((id) => {
        query.whereNot(id, oldInstance[id]);
      });
    }

    // If any results found, the uniqueness test has failed
    // (there is a matching record). Throw an error.
    if (await query) {
      const err = {};
      err[constraint.col] = [
        {
          message: constraint.message
            ? constraint.message
            : `${constraint.label || constraint.col} already exists.`,
          keyword: 'unique'
        }
      ];
      throw Model.createValidationError(err);
    }
  };

  // Runs all unique and before checks
  const runner = async () => {
    if (!(opts.unique || opts.before || opts.schema)) return;
    const fns = {
      unique: [],
      before: [],
      schema: []
    };

    // Add schema to fns
    if (opts.schema) {
      const joiOpts = {
        convert: false,
        allowUnknown: true,
        stripUnknown: false,
        presence: 'optional',
        noDefaults: true
      };
      fns.schema.push(async () => {
        const { error } = Joi.validate(this, opts.schema, joiOpts);
        if (error) {
          let key;
          try {
            key = error.details[0].path[0] || 'unknown';
          } catch (e) {
            key = 'unknown';
          }
          const err = {};
          err[key] = [
            {
              message: error.message,
              keyword: 'schema'
            }
          ];
          throw Model.createValidationError(err);
        }
      });
    }

    // Add before to fns
    if (opts.before) {
      const obj = {
        instance: this,
        context: queryContext,
        operation: operation
      };
      if (opts.old) obj.old = oldInstance;
      fns.before = opts.before.map((fn) => async () => {
        await fn(obj);
      });
    }

    // Add unique to fns
    if (opts.unique) {
      let ids = this.constructor.idColumn;
      if (!Array.isArray(ids)) ids = [ids];
      for (let constraint of opts.unique) {
        fns.unique.push(async () => {
          await checkUnique(constraint, ids);
        });
      }
    }

    // Run in order determined by opts.precedence
    const order = [];
    if (opts.precedence.first) {
      const kindFns = fns[opts.precedence.first];
      if (kindFns.length) order.push(kindFns);
      delete fns[opts.precedence.first];
    }
    let last;
    if (opts.precedence.last) {
      const kindFns = fns[opts.precedence.last];
      if (kindFns.length) last = kindFns;
      delete fns[opts.precedence.last];
    }
    let middle = [];
    Object.keys(fns).forEach((key) => {
      const kindFns = fns[key];
      if (kindFns.length) middle = middle.concat(kindFns);
    });
    if (middle.length) order.push(middle);
    if (last) order.push(last);

    for (let arr of order) {
      await Promise.all(arr.map((fn) => fn()));
    }
  };

  // Run all checks
  await runner();
};
