'use strict';
const Joi = require('joi');
const runBeforeChecks = require('./runner');
const config = require('./config');

function severalWrites() {
    throw Error(`There are several parent write operations in this query, which is not allowed by ${config.moduleName}`);
}

module.exports = (Model, opts) => {

    return class extends Model.QueryBuilder {
        execute(...args) {
            // Determine if we must run
            // checks and/or implicit fetching
            let run = false;
            let isPatch = false;
            let writeOperation;
            const nonWriteOperations = [];
            if (!this._modifiedByBeforeAndUpdate
                && !this.isFindQuery()) {
                for (let op of this._operations) {
                    if (op.name.match(/update/gi)) {
                        run = true;
                        if (writeOperation) severalWrites();
                        writeOperation = op;
                    } else if (op.name.match(/patch/gi)) {
                        run = true;
                        isPatch = true;
                        if (writeOperation) severalWrites();
                        writeOperation = op;
                    } else {
                        nonWriteOperations.push(op);
                    }
                }
                this._modifiedByBeforeAndUpdate = true;
            }


            // If we haven't run the checks before
            // And it's a write query, run, otherwise
            // return super.execute()
            if (!run) return super.execute(...args);

            // If it's an instance query, we already have the
            // old values, therefore return super.execute();
            if (writeOperation.delegate
                && writeOperation.delegate.modelOptions
                && writeOperation.delegate.modelOptions.old
            ) {
                return super.execute(...args);
            }

            // Otherwise we need to get the update/patch values
            const newInstance = writeOperation.model || writeOperation.delegate.model;
            if (!newInstance) {
                throw Error(`Couldn't get the patch/update values ${config.moduleName}.`);
            }

            // Being here, we do need to do a select query
            // to do the checks for all previous values.
            // Therefore clone query without write operations
            const selectQuery = this.clone();
            selectQuery._operations = nonWriteOperations;
            console.log(this.toString());

            let runWrite = true;
            let selectResult;
            return Promise.resolve(
                Promise.resolve(
                    super.execute.call(selectQuery, ...args)
                )
                // If the result of the select query
                // is null, don't run the write query
                // and directly return the result value
                .then(result => {
                    if (Array.isArray(result)) {
                        if (result.length === 0) return [false];
                        else return [true, result]
                    } else if (result === null || result === undefined || result === 0) {
                        return [false];
                    }
                    return [true, [result]];
                })
                .then(([run, result]) => {
                    selectResult = result;
                    if (!run) {
                        runWrite = false;
                        return;
                    }
                    // The result is not empty, therefore
                    // run all the before checks
                    const allChecks = [];
                    result.forEach(old => {
                        allChecks.push(
                            runBeforeChecks.call(
                                newInstance,
                                Model,
                                this.context(),
                                opts,
                                isPatch,
                                old
                            )
                        );
                    });
                    return Promise.all(allChecks);
                })
            )
            .then(() => {
                if (!runWrite) return selectResult;

                const ctx = this.context();
                ctx._implicitForBeforeAndUniqueHasRun = true;

                return super.execute(...args);
            });
        }
    }
};
