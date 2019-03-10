
import * as Objection from 'objection';
import { JSONSchema7 } from 'json-schema';

/**
 * See [`obau()`](#obau).
 */
export type TMixin = <T>(Model: T & typeof Objection.Model) => T;

/**
 * `obau()` options.
 */
export interface IOptions {
  /**
   * Allows unique checks before inserts, patches, and updates. Unique tests can be determined either by a `IUnique` object specifying the columns to be considered, or by a query returning function.
   */
  unique?: IUnique | TUniqueQuery | Array<IUnique | TUniqueQuery>;
  /**
   * Defines hooks to be run before inserts, patches, and updates to a database entry. Can perform additional checks or validations, as well as mutate the objects.
   */
  before?: TBefore | TBefore[];
  /**
   * A JSON Schema intended for partial validation to be run when data objects are mutated by the before hooks. If the data fails to pass the schema validation, an *Objection.js* [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) will be thrown via [`Model.createValidationError()`.](http://vincit.github.io/objection.js/#createvalidationerror)
   */
  schema?: JSONSchema7;
  /**
   * Defines the order in which tasks will run. See [`IOrder`](./iorder.html).
   */
  order?: IOrder;
  /**
   * Preserves default behavior when `true`. If `false`, old database record values will be ignored when patching and updating. **Please be aware of the repercusions:** see [static `update` and `patch`](https://github.com/rafamel/objection-before-and-unique#static-update-and-patch) for more information.
   *
   * Default: `true`.
   */
  old?: boolean;
}

export type TModel = Objection.Model & { [key: string]: any };

/**
 * An object definition of uniqueness.
 */
export interface IUnique {
  /**
   * The column or combinations of columns that identify the uniqueness of an instance.
   */
  key: string | string[];
}

/**
 * A query returning function definition of uniqueness.
 *
 * If the returned query resolves with any instance, the
 * uniqueness check will fail (a new instance will be considered not unique).
 */
export type TUniqueQuery = (options: {
  /**
   * New model instance being tested for uniqueness
   */
  instance: TModel;
  /**
   * Objection Model
   */
  Model: typeof Objection.Model;
  /**
   * Current operation
   */
  operation: TOperation;
  /**
   * Old instance, if the operation is an update/patch and it's available
   */
  old?: TModel;
}) =>
  | Objection.QueryBuilder<any, any, any>
  | Promise<void | Objection.Model | Objection.Model[]>;

/**
 * Each of the `before` hooks to be run. See [`IOptions`](./interfaces/ioptions.html).
 *
 * Should throw an error for failed checks. For consistency, it would be recommended that you use the built-in [`ValidationError`](http://vincit.github.io/objection.js/#validationerror) via [`Model.createValidationError()`](http://vincit.github.io/objection.js/#createvalidationerror) to throw it. You can optionally also mutate the the `instance` object before it is persisted.
 */
export type TBefore = (opts: {
  /**
   * The new model instance created on insert/update/patch. Keep in mind that, if the operation is a patch, the instance data might not be complete.
   */
  instance: TModel;
  /**
   * Objection Model
   */
  Model: typeof Objection.Model;
  /**
   * The type of operation the hook was executed for.
   */
  operation: TOperation;
  /**
   * The [_query context_](http://vincit.github.io/objection.js/#context) object.
   */
  context: Objection.QueryContext;
  /**
   * The old model instance (with the values prior to the update/patch operation). It is `undefined` when the operation is an insert (as there is no previous instance), and [inexistent/not passed when `IOptions.old` is set to `false`](./interfaces/ioptions.html#old).
   */
  old?: TModel;
}) => Promise<void> | void;

export type TOperation = 'insert' | 'update' | 'patch';

/**
 * Defines the order in which tasks will run. Default: `{ first: "before", last: "unique" }`.
 *
 * If `IOrder.first === "before" && IOrder.last === "unique"`, each stage will run serially following the order:
 *
 * 1. `before`
 * 2. `schema`
 * 3. `unique`
 *
 * However, all tests within each _stage_ will be run in parallel.
 *
 * If only `IOrder.first` is defined, but not `IOrder.last`, the other two tasks will run in parallel after the first has completed. As an example, if `IOrder.first === "before"` and `IOrder.last == null`, then `schema` and `unique` checks will run in parallel *after* `before` checks have completed.
 *
 * The same also applies in reverse, when only `IOrder.last` is defined. As an example, if `IOrder.last === "schema"` and `IOrder.first == null`, both `before` and `unique` tasks would run in parallel first while `schema` tasks would only be run after they have completed.
 *
 * If `IOrder.first == null` and `IOrder.last == null`, all tests will be run in parallel.
 */
export interface IOrder {
  first?: TOrder;
  last?: TOrder;
}

export type TOrder = 'before' | 'unique' | 'schema';