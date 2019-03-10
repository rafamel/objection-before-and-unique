import * as Objection from 'objection';
import { IOptions, TOperation, IOrder, TModel } from './types';
import before from './before';
import schema from './schema';
import unique from './unique';

export default async function run(
  self: TModel,
  Model: typeof Objection.Model,
  queryContext: Objection.QueryContext,
  options: IOptions,
  operation: TOperation,
  old?: TModel
): Promise<void> {
  if (!(options.unique || options.before || options.schema)) return;

  const fns = {
    before: before(self, Model, queryContext, options, operation, old),
    schema: schema(self, options),
    unique: unique(self, Model, options, operation, old)
  };

  // Run in order determined by options.order
  const order = options.order as IOrder;
  const orderArr: Array<Array<() => void | Promise<void>>> = [];
  if (order.first) {
    const kindFns = fns[order.first];
    if (kindFns.length) orderArr.push(kindFns);
    delete fns[order.first];
  }
  let last: void | Array<() => void | Promise<void>>;
  if (order.last) {
    const kindFns = fns[order.last];
    if (kindFns.length) last = kindFns;
    delete fns[order.last];
  }
  let middle: Array<() => void | Promise<void>> = [];
  Object.keys(fns).forEach((key) => {
    const kindFns = (fns as any)[key];
    if (kindFns.length) middle = middle.concat(kindFns);
  });
  if (middle.length) orderArr.push(middle);
  if (last) orderArr.push(last);

  for (let arr of orderArr) {
    await Promise.all(arr.map((fn) => fn()));
  }
}
