'use strict';
const Joi = require('joi');
const runBeforeChecks = require('./runner');
const config = require('./config');

module.exports = (opts = {}) => {
    // Validate unique and before
    const schema = Joi.object().keys({
        old: Joi.boolean(),
        precedence: Joi.string().valid(['none', 'before', 'unique']),
        before: Joi.array().items(Joi.func()),
        unique: Joi.array().items(
            Joi.object().keys({
                col: Joi.string().min(1),
                label: Joi.string().min(1),
                insensitive: Joi.boolean(),
                message: Joi.string().min(1),
                for: Joi.array().items(Joi.string())
            }).requiredKeys('col')
        )
    });
    const { error } = Joi.validate(opts, schema);
    if (error) {
        throw new Error(`${error.message} on ${config.moduleName} options.`);
    }

    if (!opts.hasOwnProperty('old')) opts.old = true;
    // If no old, disable for
    if (!opts.old && opts.unique) {
        for (let obj of opts.unique) {
            if (obj.hasOwnProperty('for')) {
                throw new Error(`unique.for cannot be used when 'old' is set to false for ${config.moduleName}`);
            }
        }
    }

    // Return the mixed-in Model
    return (Model) => {
        return class extends Model {
            $beforeInsert(queryContext) {
                return Promise.resolve(
                    super.$beforeInsert(queryContext)
                ).then((res) => {
                    const operation = 'insert';
                    return runBeforeChecks.call(
                        this, Model, queryContext, opts, operation
                    ).then(() => res);
                });
            }

            $beforeUpdate(updateOpts, queryContext) {
                if (opts.old
                    && (opts.unique || opts.before)
                    && !updateOpts.old
                ) {
                    throw new Error(`'unique' and 'before' at update only work with instance queries ($query()) for ${config.moduleName}`);
                }

                return Promise.resolve(
                    super.$beforeUpdate(updateOpts, queryContext)
                ).then((res) => {
                    const operation = (updateOpts.patch)
                        ? 'patch'
                        : 'update';
                    return runBeforeChecks.call(
                        this,
                        Model,
                        queryContext,
                        opts,
                        operation,
                        updateOpts.old
                    ).then(() => res);
                });
            }
        };
    };
};
