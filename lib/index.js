'use strict';
const Joi = require('joi');
const queryBuilder = require('./query-builder');
const runBeforeChecks = require('./runner');
const config = require('./config');

module.exports = (opts = {}) => {
    // Validate unique and before
    const validate = (schema) => {
    };
    const schema = Joi.object().keys({
        fetching: Joi.string().valid(['implicit', 'explicit', 'ignore']),
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

    // If ignoreOld, disable for
    if (opts.ignoreOld && opts.unique) {
        for (let obj of opts.unique) {
            if (obj.hasOwnProperty('for')) {
                throw new Error(`unique.for cannot be used when ignoreOld is set to true on ${config.moduleName}`);
            }
        }
    }

    // Return the mixed-in Model
    return (Model) => {
        return class extends Model {
            static get QueryBuilder() {
                return queryBuilder(Model, opts);
            }

            $beforeInsert(queryContext) {
                return Promise.resolve(
                    super.$beforeInsert(queryContext)
                ).then((res) => {
                    return runBeforeChecks.call(
                        this, Model, queryContext, opts
                    ).then(() => res);
                });
            }

            $beforeUpdate(updateOpts, queryContext) {
                if (!opts.ignoreOld
                    && (opts.unique || opts.before)
                    && !updateOpts.old
                ) {
                    throw new Error(`'unique' and 'before' at update only work with instance queries ($query()) for ${config.moduleName}`);
                }

                return Promise.resolve(
                    super.$beforeUpdate(updateOpts, queryContext)
                ).then((res) => {
                    // Don't run checks if they already run via someQuery.execute() (for implicit fetching)
                    if (queryContext._implicitForBeforeAndUniqueHasRun) {
                        return res;
                    }

                    return runBeforeChecks.call(
                        this,
                        Model,
                        queryContext,
                        opts,
                        updateOpts.patch,
                        updateOpts.old
                    ).then(() => res);
                });
            }
        };
    };
};
