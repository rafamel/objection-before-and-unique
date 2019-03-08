import * as Objection from 'objection';
import { IOptions, TOperation, TBefore } from '~/types';

export default function before(
  self: Objection.Model,
  queryContext: Objection.QueryContext,
  options: IOptions,
  operation: TOperation,
  old?: Objection.Model
): Array<() => void | Promise<void>> {
  let fns: TBefore[] = options.before as any;
  const isArray = Array.isArray(fns);

  if (!fns || (isArray && !fns.length)) return [];
  if (!isArray) fns = [fns as any];

  const obj = {
    operation,
    instance: self,
    context: queryContext,
    old
  };
  return fns.map((fn) => () => fn(obj));
}
