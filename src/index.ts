/* eslint-disable @typescript-eslint/explicit-function-return-type */

import * as Objection from 'objection';
import { IOptions, TMixin } from './types';

function run(...opts: any[]) {}

/**
 * Default export on module entry point.
 * Returns a function to mixin your `Model` with.
 * See [`IOptions`](./interfaces/ioptions.html).
 *
 * Usage:
 * ```javascript
 *  import { Model } from 'objection';
 *  import obau from 'objection-before-and-unique';
 *
 *  class MyModel extends obau({
 *    // ...options
 *  })(Model) {
 *    // ...
 *  }
 * ```
 */
export default function obau(options: IOptions): TMixin {
  // Set defaults
  options = Object.assign(
    {
      order: { first: 'before', last: 'unique' },
      old: true
    },
    options
  );

  return function(Model: typeof Objection.Model) {
    return class extends Model {
      // ****************
      public async $beforeInsert(
        queryContext: Objection.QueryContext
      ): Promise<any> {
        const res = await super.$beforeInsert(queryContext);

        await run(
          this,
          this.constructor as typeof Model,
          queryContext,
          options,
          'insert'
        );

        return res;
      }
      public async $beforeUpdate(
        opt: Objection.ModelOptions,
        queryContext: Objection.QueryContext
      ): Promise<any> {
        if (
          options.old &&
          (options.unique || options.before) &&
          !(opt as any).old
        ) {
          throw new Error(
            `unique' and 'before' are only available on instance queries: instance.$query()`
          );
        }

        const res = await super.$beforeUpdate(opt, queryContext);

        await run(
          this,
          this.constructor as typeof Model,
          queryContext,
          options,
          opt.patch ? 'patch' : 'update',
          options.old ? (opt as any).old : undefined
        );

        return res;
      }
      // ****************
    } as any;
  };
}
