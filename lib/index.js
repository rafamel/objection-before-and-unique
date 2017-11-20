'use strict';
const Joi = require('joi');
const runBeforeChecks = require('./runner');
const config = require('./config');

// old.precedence = ['none', 'before', 'unique'],
// old.parallel = {
//     before: true,
//     unique: true
// }

module.exports = (opts = {}) => {
    // Validate unique and before
    const schema = Joi.object().keys({
        old: Joi.boolean()
            .default(true),
        precedence: Joi.object()
            .default({ first: 'before', last: 'unique' })
            .keys({
                first: Joi.string().valid(['before', 'unique', 'schema']),
                last: Joi.string().valid(['before', 'unique', 'schema'])
            }),
        schema: Joi.object(),
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
    const ans = Joi.validate(
        opts, schema, { abortEarly: true, allowUnknown: false }
    );
    // Throw errror if exists
    if (ans.error) {
        throw Error(`${ans.error.message} on ${config.moduleName} options.`);
    }
    // Recover value for defaults
    opts = ans.value;

    // Check schema
    if (opts.schema && !opts.schema.isJoi) {
        throw Error(`'schema' must be a Joi object on ${config.moduleName} options.`);
    }

    // Check precedence
    if (opts.precedence.first
        && opts.precedence.first === opts.precedence.last) {
        throw Error(`precedence.first can't be equal to precedence.last on ${config.moduleName} options.`);
    }

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
