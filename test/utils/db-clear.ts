import factory from './user-factory';

const User = factory();

export async function clear(): Promise<void> {
  await User.query().delete();
}

export async function clearAndInsert(): Promise<void> {
  await clear();
  await User.query().insert({
    username: 'foo',
    email: 'foo@foo.foo',
    hash: '123456'
  });
  await User.query().insert({
    username: 'bar',
    email: 'bar@bar.bar',
    hash: '654321'
  });
}
