import db from './utils/db-connection';
import { clear } from './utils/db-clear';
import factory from './utils/user-factory';

afterAll(() => db.destroy());

const User = factory({
  schema: {
    type: 'object',
    required: ['username']
  }
});

test(`succeeds`, async () => {
  await clear();
  await expect(
    User.query().insert({ email: 'foo@foo.com' })
  ).rejects.toBeInstanceOf(Error);
});

test(`fails`, async () => {
  await clear();

  await expect(
    User.query().insert({ username: 'foo' })
  ).resolves.not.toBeInstanceOf(Error);
});
