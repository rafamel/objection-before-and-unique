import db from './utils/db-connection';
import { clear, clearAndInsert } from './utils/db-clear';
import factory from './utils/user-factory';
import { ValidationError } from 'objection';

afterAll(async () => {
  await clear();
  await db.destroy();
});

describe(`IUnique`, () => {
  test(`suceeds with no previous data`, async () => {
    await clear();
    const User = factory({
      unique: [{ key: 'username' }, { key: ['email'] }]
    });

    await expect(
      User.query().insert({
        username: 'prince',
        email: 'prince@prince.com'
      })
    ).resolves.toHaveProperty('username', 'prince');

    await expect(
      User.query().insert({
        email: 'another@email.com'
      })
    ).resolves.toHaveProperty('email', 'another@email.com');
  });
  test(`suceeds with previous data`, async () => {
    await clearAndInsert();
    const User = factory({
      unique: [{ key: 'username' }, { key: ['email'] }]
    });

    await expect(
      User.query().insert({
        username: 'prince',
        email: 'prince@prince.com'
      })
    ).resolves.toHaveProperty('username', 'prince');

    await expect(
      User.query().insert({
        email: 'another@email.com'
      })
    ).resolves.toHaveProperty('email', 'another@email.com');
  });
  test(`fails`, async () => {
    await clearAndInsert();
    const User = factory({
      unique: [{ key: 'username' }, { key: ['email'] }]
    });

    const insertA = User.query().insert({ username: 'foo' });
    const catcherA = insertA.catch((err) => err.data);

    await expect(insertA).rejects.toBeInstanceOf(ValidationError);
    await expect(catcherA).resolves.toHaveProperty('key', 'username');
    await expect(catcherA).resolves.toHaveProperty('keyword', 'unique');

    const insertB = User.query().insert({ email: 'foo@foo.foo' });
    const catcherB = insertB.catch((err) => err.data);

    await expect(insertB).rejects.toBeInstanceOf(ValidationError);
    await expect(catcherB).resolves.toHaveProperty('key', ['email']);
    await expect(catcherB).resolves.toHaveProperty('keyword', 'unique');
  });
});

describe(`complex IUnique`, () => {
  test(`succeeds`, async () => {
    await clearAndInsert();
    const User = factory({
      unique: { key: ['username', 'email'] }
    });

    const insertA = User.query().insert({ username: 'foo' });
    await expect(insertA).resolves.not.toBeInstanceOf(Error);
  });
  test(`fails`, async () => {
    await clearAndInsert();
    const User = factory({
      unique: { key: ['username', 'email'] }
    });

    const insertA = User.query().insert({
      username: 'foo',
      email: 'foo@foo.foo'
    });
    const catcherA = insertA.catch((err) => err.data);

    await expect(insertA).rejects.toBeInstanceOf(ValidationError);
    await expect(catcherA).resolves.toHaveProperty('key', [
      'username',
      'email'
    ]);
    await expect(catcherA).resolves.toHaveProperty('keyword', 'unique');
  });
});

describe(`TUniqueFn`, () => {
  describe(`returns query`, () => {
    test(`succeeds & receives params`, async () => {
      await clearAndInsert();

      let options: any;
      const User = factory({
        unique: [
          (opts) => {
            options = opts;
            return opts.Model.query().where('username', 'none');
          }
        ]
      });

      const insertA = User.query().insert({
        username: 'foo',
        email: 'foo@foo.foo'
      });

      await expect(insertA).resolves.not.toBeInstanceOf(Error);
      expect(options).not.toBe(undefined);
      expect(options.instance).toBeInstanceOf(User);
      expect(options.Model).toBe(User);
      expect(options.operation).toBe('insert');
      expect(options.old).toBe(undefined);
    });
    test(`fails`, async () => {
      await clearAndInsert();
      const User = factory({
        unique: (options) => {
          return options.Model.query().where(
            'username',
            options.instance.username
          );
        }
      });

      const insertA = User.query().insert({
        username: 'foo',
        email: 'foo@foo.foo'
      });
      const catcherA = insertA.catch((err) => err.data);

      await expect(insertA).rejects.toBeInstanceOf(ValidationError);
      await expect(catcherA).resolves.toHaveProperty('key', []);
      await expect(catcherA).resolves.toHaveProperty('keyword', 'unique');
    });
  });
  
describe(`patch`, () => {
  describe(`old = true`, () => {
    test(`patch and update are disabled`, async () => {
      await clearAndInsert();
      const User = factory({
        unique: [{ key: 'email' }]
      });

      const queryA = User.query().patch({ username: 'foo' });
      const queryB = User.query().update({ username: 'foo' });

      await expect(queryA).rejects.toBeInstanceOf(Error);
      await expect(queryB).rejects.toBeInstanceOf(Error);
    });
    test(`TUniqueFn succeeds & receives params`, async () => {
      await clearAndInsert();

      let options: any;
      const User = factory({
        unique: [
          (opts) => {
            options = opts;
            return opts.Model.query().where('username', 'none');
          }
        ]
      });

      const user: any = await User.query().first();
      const patch = user.$query().patch({ username: 'baz' });

      await expect(patch).resolves.not.toBeInstanceOf(Error);
      expect(options).not.toBe(undefined);
      expect(options.instance).toBeInstanceOf(User);
      expect(options.Model).toBe(User);
      expect(options.operation).toBe('patch');
      expect(options.old).toBeInstanceOf(User);
    });
    test(`IUnique succeeds`, async () => {
      await clearAndInsert();
      const User = factory({
        unique: [{ key: 'username' }]
      });

      const user: any = await User.query()
        .where('username', 'foo')
        .first();
      const patch1 = user.$query().patch({ username: 'foo' });
      const patch2 = user.$query().patch({ email: 'some' });

      await expect(patch1).resolves.not.toBeInstanceOf(Error);
      await expect(patch2).resolves.not.toBeInstanceOf(Error);
    });
    test(`IUnique fails`, async () => {
      await clearAndInsert();
      const User = factory({
        unique: [{ key: 'username' }]
      });

      const user = await User.query()
        .where('username', 'foo')
        .first();
      // @ts-ignore
      const patch = user.$query().patch({ username: 'bar' });

      await expect(patch).rejects.toBeInstanceOf(Error);
    });
  });
  describe(`old = false`, () => {
    test(`patch and update are not disabled`, async () => {
      await clearAndInsert();
      const User = factory({
        old: false,
        unique: [{ key: 'email' }]
      });

      const queryA = User.query().patch({ username: 'foo' });
      const queryB = User.query().update({ username: 'foo' });

      await expect(queryA).resolves.not.toBeInstanceOf(Error);
      await expect(queryB).resolves.not.toBeInstanceOf(Error);
    });
    test(`TUniqueFn succeeds & receives params`, async () => {
      await clearAndInsert();

      let options: any;
      const User = factory({
        old: false,
        unique: [
          (opts) => {
            options = opts;
            return opts.Model.query().where('username', 'none');
          }
        ]
      });

      const user = await User.query().first();
      // @ts-ignore
      const patch = user.$query().patch({ username: 'baz' });

      await expect(patch).resolves.not.toBeInstanceOf(Error);
      expect(options).not.toBe(undefined);
      expect(options.instance).toBeInstanceOf(User);
      expect(options.Model).toBe(User);
      expect(options.operation).toBe('patch');
      expect(options.old).toBe(undefined);
    });
  });
});
