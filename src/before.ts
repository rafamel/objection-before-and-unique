import * as Objection from 'objection';
import { IOptions, TOperation, TBefore, TModel } from '~/types';

export default function before(
  self: TModel,
  queryContext: Objection.QueryContext,
  options: IOptions,
  operation: TOperation,
  old?: TModel
): Array<() => void | Promise<void>> {
  let fns: TBefore[] = options.before as any;
  const isArray = Array.isArray(fns);

  if (!fns || (isArray && !fns.length)) return [];
  if (!isArray) fns = [fns as any];

  const obj = {
    instance: self,
    operation,
    context: queryContext,
    old
  };
  return fns.map((fn) => () => fn(obj));
}
