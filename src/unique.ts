import * as Objection from 'objection';
import { IOptions, TOperation, IUnique, TUniqueQuery, TModel } from './types';

export default function unique(
  self: TModel,
  Model: typeof Objection.Model,
  options: IOptions,
  operation: TOperation,
  old?: TModel
): Array<() => Promise<void>> {
  let uniques: Array<IUnique | TUniqueQuery> = options.unique as any;
  const isArray = Array.isArray(uniques);

  if (!uniques || (isArray && !uniques.length)) return [];
  if (!isArray) uniques = [uniques as any];

  const obj = { instance: self, Model, operation, old };

  return uniques.map((constraint) => {
    const isCustom = typeof constraint === 'function';
    const fn = isCustom
      ? () => (constraint as TUniqueQuery)(obj)
      : defUnique(self, Model, options, operation, constraint as IUnique, old);

    return async () => {
      if (!fn) return;
      const query = fn();
      const res = await query;

      if (res) {
        if (Array.isArray(res) && !res.length) return;
        throw Model.createValidationError({
          type: 'ModelValidation',
          data: {
            key: isCustom ? [] : (constraint as IUnique).key,
            keyword: 'unique'
          }
        });
      }
    };
  });
}

function defUnique(
  self: TModel,
  Model: typeof Objection.Model,
  options: IOptions,
  operation: TOperation,
  constraint: IUnique,
  old?: TModel
): null | (() => Objection.QueryBuilderYieldingOneOrNone<Objection.Model>) {
  let ids: string[] = (self.constructor as any).idColumn;
  if (!Array.isArray(ids)) ids = [ids];

  // Only run this unique test if:
  // - the new instance has the unique column to check
  // or
  // - it is a patch AND the old instance has it
  const isPatch = operation === 'patch';
  let keys = constraint.key as string[];
  if (!Array.isArray(keys)) keys = [keys];

  let all = true;
  const values = keys.reduce((acc: any, key) => {
    const val = self[key] || (isPatch && old && old[key]);
    if (!val) all = false;

    acc[key] = val;
    return acc;
  }, {});

  return all
    ? () => {
        const query = Model.query().first();
        keys.forEach((key) => {
          query.where(key, values[key]);
        });

        // Exclude the previous record (if an update/patch)
        // from the uniqueness check
        if (options.old && old) {
          ids.forEach((id) => {
            query.whereNot(id, old[id]);
          });
        }
        return query;
      }
    : null;
}
