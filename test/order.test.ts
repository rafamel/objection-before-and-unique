import db from './utils/db-connection';
import { clear } from './utils/db-clear';
import factory from './utils/user-factory';
import { ValidationError } from 'objection';

afterAll(async () => {
  await clear();
  await db.destroy();
});

test(`default order`, async () => {
  await clear();
  let before = false;
  let unique = false;
  const User = factory({
    before: [
      async ({ instance }) => {
        before = true;
        if ((instance as any).email === 'bar@bar.bar') throw Error();
      }
    ],
    schema: {
      type: 'object',
      required: ['username']
    },
    unique: ({ Model }) => {
      unique = true;
      return Model.query();
    }
  });

  await expect(
    User.query().insert({ email: 'bar@bar.bar' })
  ).rejects.not.toBeInstanceOf(ValidationError);
  expect(before).toBe(true);
  expect(unique).toBe(false);

  before = false;
  await expect(
    User.query().insert({ email: 'foo@foo.foo' })
  ).rejects.toBeInstanceOf(ValidationError);
  expect(before).toBe(true);
  expect(unique).toBe(false);

  await expect(
    User.query().insert({ username: 'foo' })
  ).resolves.not.toBeInstanceOf(Error);

  before = false;
  unique = false;
  await expect(User.query().insert({ username: 'bar' })).rejects.toBeInstanceOf(
    ValidationError
  );
  expect(before).toBe(true);
  expect(unique).toBe(true);
});

test(`altered order`, async () => {
  await clear();
  let before = false;
  let unique = false;
  const User = factory({
    order: {
      first: 'unique',
      last: 'schema'
    },
    before: [
      async ({ instance }) => {
        before = true;
        if ((instance as any).email === 'bar@bar.bar') throw Error();
      }
    ],
    schema: {
      type: 'object',
      required: ['username']
    },
    unique: ({ Model }) => {
      unique = true;
      return Model.query();
    }
  });

  await expect(
    User.query().insert({ username: 'foo' })
  ).resolves.not.toBeInstanceOf(Error);

  before = false;
  unique = false;
  await expect(
    User.query().insert({ email: 'bar@bar.bar' })
  ).rejects.toBeInstanceOf(ValidationError);
  expect(before).toBe(false);
  expect(unique).toBe(true);

  clear();
  unique = false;
  await expect(
    User.query().insert({ email: 'bar@bar.bar' })
  ).rejects.not.toBeInstanceOf(ValidationError);
  expect(before).toBe(true);
  expect(unique).toBe(true);

  before = false;
  unique = false;
  await expect(
    User.query().insert({ email: 'foo@foo.foo' })
  ).rejects.toBeInstanceOf(ValidationError);
  expect(before).toBe(true);
  expect(unique).toBe(true);
});
