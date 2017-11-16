'use strict';
const Joi = require('joi');

async function runBeforeChecks(Model, parent,
    { unique: uniqueConstraints, before: beforeChecks }, isPatch, oldInstance) {
    // Function to be execute for every unique constraint
    const checkUnique = async (constraint, ids) => {
        const thisHasCol = this.hasOwnProperty(constraint.col);
        // If the new instance doesn't have the unique column to check, return
        // unless it is a patch and the old instance does have it
        if (!thisHasCol
            && !(isPatch && oldInstance.hasOwnProperty(constraint.col))
        ) {
            return;
        }

        // Get the value of the column to check for uniqueness
        // from new instance (or old, if a patch and the new lacks it)
        const colValue = (thisHasCol)
            ? this[constraint.col]
            : oldInstance[constraint.col];

        // Build query with case sensitivity/insensitivity
        const query = this.constructor.query().first();
        (constraint.insensitive)
            ? query.whereRaw(`LOWER(${constraint.col}) = LOWER('${colValue}')`)
            : query.where(constraint.col, colValue);

        // Additional for constraints on the query, if specified
        if (constraint.for) {
            constraint.for.forEach(col => {
                if (this.hasOwnProperty(col)) {
                    query.where(col, this[col]);
                } else if (isPatch
                    && oldInstance.hasOwnProperty(col)) {
                    query.where(col, oldInstance[col]);
                }
            });
        }

        // Exclude the previous record (if an update/patch)
        // from the uniqueness check
        if (oldInstance) {
            ids.forEach(id => {
                query.whereNot(id, oldInstance[id]);
            });
        }

        // If any results found, the uniqueness test has failed
        // (there is a matching record). Throw an error.
        if (await query) {
            const err = {};
            err[constraint.col] = [{
                message: (constraint.message)
                    ? constraint.message
                    : `${constraint.label || constraint.col} already exists.`,
                keyword: 'unique'
            }];
            throw Model.createValidationError(err);
        }
    };

    // Runs all unique and before checks
    const runner = async () => {
        if (!(uniqueConstraints || beforeChecks)) return;

        const beforeFns = (beforeChecks)
            ? beforeChecks.map(fn => () => fn(this, oldInstance))
            : [];

        const uniqueFns = [];
        if (uniqueConstraints) {
            let ids = this.constructor.idColumn;
            if (!Array.isArray(ids)) ids = [ids];
            for (let constraint of uniqueConstraints) {
                uniqueFns.push(async () => {
                    await checkUnique(constraint, ids);
                });
            }
        }
        const fns = beforeFns.concat(uniqueFns);
        return Promise.all(fns.map(fn => fn()));
    };

    // Wait for before parent promise to return
    // and run all checks
    await parent;
    await runner();
}

module.exports = (opts = {}) => {
    // Validate unique and before
    // eslint-disable-next-line
    if (opts.unique != undefined) {
        const schema = Joi.array().items(
            Joi.object().keys({
                col: Joi.string().min(1),
                label: Joi.string().min(1),
                insensitive: Joi.boolean(),
                message: Joi.string().min(1),
                for: Joi.array().items(Joi.string())
            }).requiredKeys('col')
        );
        const { error } = Joi.validate(opts.unique, schema);
        if (error) throw new Error(`${error.message} for 'unique' key.`);
    }
    // eslint-disable-next-line
    if (opts.before != undefined) {
        const schema = Joi.array().items(Joi.func());
        const { error } = Joi.validate(opts.before, schema);
        if (error) throw new Error(`${error.message} for 'before' key.`);
    }

    // Return the mixed-in Model
    return (Model) => {
        return class extends Model {
            $beforeInsert(queryContext) {
                const parent = super.$beforeInsert(queryContext);
                return runBeforeChecks.call(this, Model, parent, opts);
            }

            $beforeUpdate(updateOpts, queryContext) {
                const parent = super.$beforeUpdate(updateOpts, queryContext);
                if ((opts.unique || opts.before)
                    && !updateOpts.old) {
                    throw new Error(`'unique' and 'before' at update only work with instance queries ($query()).`);
                }
                return runBeforeChecks.call(this, Model, parent, opts,
                    updateOpts.patch, updateOpts.old);
            }
        };
    };
};
