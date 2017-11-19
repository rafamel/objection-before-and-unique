'use strict';

module.exports = async function runBeforeChecks(
    Model, queryContext, opts, isPatch, oldInstance
) {
    // Function to be execute for every unique constraint
    const checkUnique = async (constraint, ids) => {
        const tryFromOld = !opts.ignoreOld && isPatch;
        const thisHasCol = this.hasOwnProperty(constraint.col);
        // Only run this unique test if:
        // - the new instance has the unique column to check
        // or
        // - it is a patch AND the old instance has it AND some of the 'for' columns have changed
        if (!thisHasCol) {
            if (
                tryFromOld
                && constraint.for
                && oldInstance.hasOwnProperty(constraint.col)
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
                } else if (tryFromOld
                    && oldInstance.hasOwnProperty(col)) {
                    query.where(col, oldInstance[col]);
                }
            });
        }

        // Exclude the previous record (if an update/patch)
        // from the uniqueness check
        if (!opts.ignoreOld && oldInstance) {
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
        if (!(opts.unique || opts.before)) return;

        const beforeFns = (opts.before)
            ? opts.before.map(fn => () => fn(this, oldInstance, queryContext))
            : [];

        const uniqueFns = [];
        if (opts.unique) {
            let ids = this.constructor.idColumn;
            if (!Array.isArray(ids)) ids = [ids];
            for (let constraint of opts.unique) {
                uniqueFns.push(async () => {
                    await checkUnique(constraint, ids);
                });
            }
        }

        // Run in parallel or sequentially
        // in the the order determined by 'precedence'
        const fns = (opts.precedence === 'unique')
            ? uniqueFns.concat(beforeFns)
            : beforeFns.concat(uniqueFns);
        if (opts.precedence && opts.precedence !== 'none') {
            for (let fn of fns) { await fn(); }
        } else {
            return Promise.all(fns.map(fn => fn()));
        }
    };

    // Run all checks
    await runner();
};
