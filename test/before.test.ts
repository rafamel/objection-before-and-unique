import db from './utils/db-connection';
import { clear, clearAndInsert } from './utils/db-clear';
import factory from './utils/user-factory';

afterAll(async () => {
  await clear();
  await db.destroy();
});

test(`receives options for old = true`, async () => {
  await clear();
  let options: any;
  const User = factory({
    before: [
      async (opts) => {
        options = opts;
      }
    ]
  });

  const user = await User.query().insert({ username: 'foo' });

  expect(options).not.toBe(undefined);
  expect(options.operation).toBe('insert');
  expect(options.instance).toBeInstanceOf(User);
  expect(options.context).toHaveProperty('transaction');
  expect(options.old).toBe(undefined);

  await user.$query().update({ username: 'baz' });
  expect(options.operation).toBe('update');
  expect(options.instance).toBeInstanceOf(User);
  expect(options.context).toHaveProperty('transaction');
  expect(options.old).toBeInstanceOf(User);
});

test(`receives options for old = false`, async () => {
  await clearAndInsert();
  let options: any;
  const User = factory({
    old: false,
    before: [
      async (opts) => {
        options = opts;
      }
    ]
  });

  const user: any = await User.query()
    .first()
    .where('username', 'foo');
  await user.$query().patch({ email: 'some' });

  expect(options.operation).toBe('patch');
  expect(options.instance).toBeInstanceOf(User);
  expect(options.context).toHaveProperty('transaction');
  expect(options.old).toBe(undefined);
});

test(`mutation succeeds`, async () => {
  await clearAndInsert();
  const getStr = async (): Promise<string> => 'tail';
  const User = factory({
    before: [
      async ({ instance, old }: any) => {
        instance.username = old.username + (await getStr());
      }
    ]
  });

  const doPatch = User.query()
    .first()
    .where('username', 'foo')
    .then((m: any) => m.$query().patchAndFetch({ username: 'goodbye' }));
  await expect(doPatch).resolves.toHaveProperty('username', 'footail');
});

test(`fails on error`, async () => {
  const User = factory({
    before: [
      async () => {
        throw Error('Some Error');
      }
    ]
  });

  const doInsert = User.query().insert({ username: 'hola' });
  await expect(doInsert).rejects.toBeInstanceOf(Error);
});
