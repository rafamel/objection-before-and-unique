const Joi = require('joi');
const sleep = require('sleep-promise');
const dbClear = require('./utils/db-clear');
const userFactory = require('./utils/user-factory');
const ValidationError = require('objection').ValidationError;
const config = require('../lib/config');

const id = (n) => `[${String(n)}] `;

const clearAndInsert = async () => {
  await dbClear();
  const User = userFactory();
  await User.query().insert({
    username: 'prince',
    email: 'prince@prince.com',
    hash: '123456'
  });
  await User.query().insert({
    username: 'isma',
    email: 'isma@isma.com',
    hash: '654321'
  });
};

describe(`- Throws when invalid input / Doesn't with valid`, () => {
  describe(`- Pass`, () => {
    test(id(1) + `Empty`, () => {
      expect(() => userFactory()).not.toThrowError();
    });
    test(id(2) + `Before`, () => {
      expect(() => userFactory({ before: [() => {}] })).not.toThrowError();
    });
    test(id(3) + `Basic Unique`, () => {
      expect(() =>
        userFactory({
          unique: [{ col: 'name' }]
        })
      ).not.toThrowError();
    });
    test(id(4) + `Full Unique`, () => {
      expect(() =>
        userFactory({
          unique: [
            {
              col: 'name',
              label: 'Name',
              insensitive: true,
              message: 'Some',
              for: ['some_id']
            }
          ]
        })
      ).not.toThrowError();
    });
    test(id(5) + `Precedence`, () => {
      expect(() => userFactory({ precedence: {} })).not.toThrowError();
      expect(() =>
        userFactory({ precedence: { first: 'before' } })
      ).not.toThrowError();
      expect(() =>
        userFactory({ precedence: { first: 'unique' } })
      ).not.toThrowError();
      expect(() =>
        userFactory({ precedence: { first: 'schema' } })
      ).not.toThrowError();
      expect(() =>
        userFactory({ precedence: { last: 'before' } })
      ).not.toThrowError();
      expect(() =>
        userFactory({ precedence: { last: 'unique' } })
      ).not.toThrowError();
      expect(() =>
        userFactory({ precedence: { last: 'schema' } })
      ).not.toThrowError();
      expect(() =>
        userFactory({
          precedence: { first: 'schema', last: 'before' }
        })
      ).not.toThrowError();
    });
    test(id(6) + `schema`, () => {
      expect(() => userFactory({ schema: Joi.object() })).not.toThrowError();
    });
    test(id(7) + `old`, () => {
      expect(() => userFactory({ old: true })).not.toThrowError();
      expect(() => userFactory({ old: false })).not.toThrowError();
    });
  });
  describe(`- Not Pass`, () => {
    test(id(1) + `Before`, () => {
      expect(() => userFactory({ before: {} })).toThrowError();
      expect(() => userFactory({ before: 5 })).toThrowError();
      expect(() => userFactory({ before: '' })).toThrowError();
      expect(() => userFactory({ before: [''] })).toThrowError();
    });
    test(id(2) + `Unique: wrong type`, () => {
      expect(() => userFactory({ unique: {} })).toThrowError();
    });
    test(id(3) + `Unique: List of strings`, () => {
      expect(() => userFactory({ unique: [''] })).toThrowError();
    });
    test(id(4) + `Unique: No 'col'`, () => {
      expect(() =>
        userFactory({
          unique: [{ label: 'Name' }]
        })
      ).toThrowError();
    });
    test(id(5) + `Unique: Unknown key`, () => {
      expect(() =>
        userFactory({
          unique: [
            {
              col: 'name',
              foo: ''
            }
          ]
        })
      ).toThrowError();
    });
    test(id(6) + `Unique: Wrong 'insensitive' type`, () => {
      expect(() =>
        userFactory({
          unique: [
            {
              col: 'name',
              insensitive: ''
            }
          ]
        })
      ).toThrowError();
    });
    test(id(7) + `Unique: Wrong 'for' type`, () => {
      expect(() =>
        userFactory({
          unique: [
            {
              col: 'name',
              for: ''
            }
          ]
        })
      ).toThrowError();
    });
    test(id(8) + `Unique: Empty strings`, () => {
      expect(() =>
        userFactory({
          unique: [{ col: '' }]
        })
      ).toThrowError();

      expect(() =>
        userFactory({
          unique: [{ col: 'name', label: '' }]
        })
      ).toThrowError();

      expect(() =>
        userFactory({
          unique: [
            {
              col: 'name',
              message: ''
            }
          ]
        })
      ).toThrowError();
    });
    test(id(9) + `Precedence`, () => {
      expect(() => userFactory({ precedence: 'some' })).toThrowError();
      expect(() => userFactory({ precedence: 5 })).toThrowError();
      expect(() => userFactory({ precedence: { some: 1 } })).toThrowError();
      expect(() =>
        userFactory({ precedence: { some: 'before' } })
      ).toThrowError();
      expect(() =>
        userFactory({
          precedence: { first: 'before', last: 'before' }
        })
      ).toThrowError();
    });
    test(id(10) + `Schema`, () => {
      expect(() => userFactory({ schema: 'some' })).toThrowError();
      expect(() => userFactory({ schema: {} })).toThrowError();
      expect(() => userFactory({ schema: 5 })).toThrowError();
    });
    test(id(11) + `Old: Basic`, () => {
      expect(() => userFactory({ old: 'some' })).toThrowError();
      expect(() => userFactory({ old: '' })).toThrowError();
      expect(() => userFactory({ old: 5 })).toThrowError();
    });
    test(id(12) + `Old: Disable unique for`, () => {
      expect(() =>
        userFactory({
          old: false,
          unique: [{ col: 'name', for: ['some'] }]
        })
      ).toThrowError();
    });
  });
});

describe(`- Unique`, () => {
  describe(`- Basic column uniqueness`, () => {
    const User = userFactory({
      unique: [{ col: 'username' }, { col: 'email' }]
    });

    test(id(1) + `Clean insert doesn't reject`, async () => {
      await dbClear();

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
    test(id(2) + `Error/ValidationError (insert)`, async () => {
      await clearAndInsert();
      const doInsert = User.query().insert({ username: 'prince' });
      const catcher = doInsert.catch((err) => err.data);
      const catchInside = catcher.then((data) => data['username'][0]);

      await expect(doInsert).rejects.toBeInstanceOf(Error);
      await expect(doInsert).rejects.toBeInstanceOf(ValidationError);
      await expect(catcher).resolves.toHaveProperty('username');
      await expect(catchInside).resolves.toHaveProperty('keyword', 'unique');
    });
    test(id(3) + `ValidationError (patch & update)`, async () => {
      const user = await User.query()
        .first()
        .where('username', 'isma');
      const doPatch = user.$query().patchAndFetch({ username: 'prince' });
      const doUpdate = user.$query().update({ username: 'prince' });

      await expect(doPatch).rejects.toBeInstanceOf(ValidationError);
      await expect(doUpdate).rejects.toBeInstanceOf(ValidationError);
    });
    test(id(4) + `Errors out when updating/patching from Model`, async () => {
      const doPatch = User.query()
        .patch({ username: 'other' })
        .where('username', 'isma');

      await expect(doPatch).rejects.toBeInstanceOf(Error);
      await expect(doPatch).rejects.toHaveProperty(
        'message',
        `'unique' and 'before' at update only work with instance queries ($query()) for ${
          config.moduleName
        }`
      );

      const doUpdate = User.query()
        .update({ username: 'other' })
        .where('username', 'isma');
      await expect(doUpdate).rejects.toBeInstanceOf(Error);
    });
    test(id(5) + `Multiple uniques`, async () => {
      const promise = User.query().insert({
        username: 'other',
        email: 'prince@prince.com'
      });

      await expect(promise).rejects.toBeInstanceOf(ValidationError);
    });
    test(id(6) + `ValidationError structure`, async () => {
      const promise = User.query().insert({ username: 'prince' });
      const catcher = promise.catch((err) => err.data.username[0]);

      await expect(promise).rejects.toHaveProperty('data');
      await expect(promise).rejects.toHaveProperty('data.username');
      await expect(catcher).resolves.toHaveProperty('keyword', 'unique');
      await expect(catcher).resolves.toHaveProperty(
        'message',
        'username already exists.'
      );
    });
  });

  describe(`- Additional features`, () => {
    test(id(1) + `Label`, async () => {
      const User = userFactory({
        unique: [{ col: 'username', label: 'User' }]
      });

      const doInsert = User.query()
        .insert({ username: 'prince' })
        .catch((err) => err.data.username[0]);
      await expect(doInsert).resolves.toHaveProperty(
        'message',
        'User already exists.'
      );
    });
    test(id(2) + `Insensitive`, async () => {
      const User = userFactory({
        unique: [{ col: 'username' }]
      });
      const iUser = userFactory({
        unique: [{ col: 'username', insensitive: true }]
      });
      const promise1 = User.query().insert({ username: 'Prince' });
      await expect(promise1).resolves.toHaveProperty('username', 'Prince');

      await clearAndInsert();
      const promise2 = iUser.query().insert({ username: 'Prince' });
      await expect(promise2).rejects.toBeInstanceOf(ValidationError);
    });
    test(id(3) + `For`, async () => {
      const User = userFactory({
        unique: [{ col: 'username', for: ['email'] }]
      });

      const promise1 = User.query().insert({
        username: 'prince',
        email: 'prince@prince.com',
        hash: '55555'
      });
      await expect(promise1).rejects.toBeInstanceOf(ValidationError);

      const promise2 = User.query().insert({
        username: 'prince',
        email: 'other@email.com',
        hash: '55555'
      });
      await expect(promise2).resolves.toHaveProperty('username', 'prince');

      const User2 = userFactory({
        unique: [{ col: 'username', for: ['email', 'hash'] }]
      });
      const promise3 = User2.query().insert({
        username: 'prince',
        email: 'prince@prince.com',
        hash: '55555'
      });
      await expect(promise3).resolves.toHaveProperty('username', 'prince');

      const user = await User2.query()
        .first()
        .where('username', 'prince')
        .andWhere('email', 'prince@prince.com')
        .andWhere('hash', '55555');
      const promise4 = user
        .$query()
        .patchAndFetch({ email: 'other@email.com' });
      const promise5 = user
        .$query()
        .patchAndFetch({ email: 'other@email.com', hash: '123456' });

      await expect(promise4).rejects.toBeInstanceOf(ValidationError);
      await expect(promise5).resolves.toHaveProperty('username', 'prince');
    });
    test(id(4) + `Message`, async () => {
      const User = userFactory({
        unique: [
          {
            col: 'username',
            label: 'User',
            message: 'A message'
          }
        ]
      });

      const doInsert = User.query()
        .insert({ username: 'prince' })
        .catch((err) => err.data.username[0]);
      await expect(doInsert).resolves.toHaveProperty('message', 'A message');
    });
  });
});

describe(`- Before`, () => {
  describe(`- Receives object keys`, () => {
    test(id(1) + `instance`, async () => {
      await clearAndInsert();
      const User = userFactory({
        before: [
          ({ instance }) => {
            if (instance.username !== 'Hi') {
              throw Error();
            }
          }
        ]
      });

      const doInsert = User.query().insert({ username: 'Hi' });
      const doUpdate = User.query()
        .first()
        .where('username', 'isma')
        .then((m) => m.$query().updateAndFetch({ username: 'Hi' }));
      const doPatch = User.query()
        .first()
        .where('username', 'prince')
        .then((m) => m.$query().patchAndFetch({ username: 'Hi' }));

      await expect(doInsert).resolves.toHaveProperty('username', 'Hi');
      await expect(doUpdate).resolves.toHaveProperty('username', 'Hi');
      await expect(doPatch).resolves.toHaveProperty('username', 'Hi');
    });
    test(id(2) + `old`, async () => {
      await clearAndInsert();
      const User = userFactory({
        before: [
          (obj) => {
            if (!obj.hasOwnProperty('old')) {
              throw Error('Old is not received even if undefined');
            } else if (obj.old.username !== 'prince') {
              throw Error();
            }
          }
        ]
      });

      const doInsert = User.query().insert({ username: 'hello' });
      const doUpdate = User.query()
        .first()
        .where('username', 'prince')
        .then((m) => m.$query().update({ username: 'prince' }));
      const doPatch = User.query()
        .first()
        .where('username', 'prince')
        .then((m) => m.$query().patch({ username: 'prince' }));

      await expect(doInsert).rejects.toBeInstanceOf(Error);
      await expect(doInsert).rejects.not.toHaveProperty(
        'message',
        'Old is not received even if undefined'
      );
      await expect(doUpdate).resolves.toBe(1);
      await expect(doPatch).resolves.toBe(1);
    });
    test(id(3) + `context`, async () => {
      await clearAndInsert();
      const User = userFactory({
        before: [
          ({ instance, context }) => {
            instance.username = context.name;
          }
        ]
      });

      const doInsert = User.query()
        .context({ name: 'Hi' })
        .insert({});
      await expect(doInsert).resolves.toHaveProperty('username', 'Hi');
    });
    test(id(4) + `operation`, async () => {
      await clearAndInsert();
      const User = userFactory({
        before: [
          ({ context, operation }) => {
            if (operation !== context.op) {
              throw Error();
            }
          }
        ]
      });

      const doInsert = User.query()
        .context({ op: 'insert' })
        .insert({ username: 'some' });
      const doUpdate = User.query()
        .first()
        .where('username', 'isma')
        .then((m) =>
          m
            .$query()
            .context({ op: 'update' })
            .update({ username: 'some' })
        );
      const doPatch = User.query()
        .first()
        .where('username', 'prince')
        .then((m) =>
          m
            .$query()
            .context({ op: 'patch' })
            .patch({ username: 'some' })
        );

      await expect(doInsert).resolves.toHaveProperty('username', 'some');
      await expect(doUpdate).resolves.toBe(1);
      await expect(doPatch).resolves.toBe(1);
    });
  });
  describe(`- Mutation`, () => {
    test(id(1) + `No async`, async () => {
      await clearAndInsert();
      const User = userFactory({
        before: [
          ({ instance }) => {
            instance.username += 'hello';
          }
        ]
      });

      const doInsert = User.query().insert({ username: 'hola' });
      await expect(doInsert).resolves.toHaveProperty('username', 'holahello');
    });
    test(id(2) + `Async`, async () => {
      const getStr = async () => 'tail';
      const User = userFactory({
        before: [
          async ({ instance, old }) => {
            instance.username = old.username + (await getStr());
          }
        ]
      });

      const doPatch = User.query()
        .first()
        .where('username', 'holahello')
        .then((m) => m.$query().patchAndFetch({ username: 'goodbye' }));
      await expect(doPatch).resolves.toHaveProperty(
        'username',
        'holahellotail'
      );
    });
  });

  describe(`- Checks/Throws`, () => {
    test(id(1) + `Sync`, async () => {
      const User = userFactory({
        before: [
          () => {
            throw Error('Some Error');
          }
        ]
      });

      const doInsert = User.query().insert({ username: 'hola' });
      await expect(doInsert).rejects.toBeInstanceOf(Error);
    });
    test(id(2) + `Async`, async () => {
      const User = userFactory({
        before: [
          async () => {
            throw Error('Some Error');
          }
        ]
      });

      const doInsert = User.query().insert({ username: 'hola' });
      await expect(doInsert).rejects.toBeInstanceOf(Error);
    });
  });
});

describe(`- Schema`, () => {
  test(id(1) + `Not pass`, async () => {
    await clearAndInsert();
    const User = userFactory({
      schema: Joi.object().keys({
        a: Joi.object()
          .keys({
            b: Joi.any().required()
          })
          .required()
      })
    });

    const promise = User.query().insert({ username: 'hola', a: {} });
    const catcher = promise.catch((err) => err.data);
    const catchInside = catcher.then((data) => data['a'][0]);

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    await expect(catcher).resolves.toHaveProperty('a');
    await expect(catchInside).resolves.toHaveProperty('keyword', 'schema');
  });
  test(id(2) + `Pass`, async () => {
    await clearAndInsert();
    const User = userFactory({
      schema: Joi.object().keys({
        hash: Joi.string().required(),
        password: Joi.any().forbidden()
      }),
      before: [
        ({ instance }) => {
          if (!instance.password) throw Error();
          instance.hash = instance.password + '1';
          delete instance.password;
        }
      ]
    });

    const doInsert = await User.query().insert({ password: 'hello' });
    expect(doInsert).toHaveProperty('hash', 'hello1');
    expect(doInsert).not.toHaveProperty('password');
  });
});

describe(`- Precedence`, () => {
  const opts = {
    schema: Joi.object().keys({
      hash: Joi.string().required(),
      password: Joi.any().forbidden()
    }),
    unique: [{ col: 'hash' }],
    before: [
      async ({ instance }) => {
        await sleep(1000);
        if (!instance.password) throw Error();
        instance.hash = instance.password;
        delete instance.password;
      }
    ]
  };
  test(id(1) + `First (defaults: before, schema, unique)`, async () => {
    await clearAndInsert();

    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });

    await expect(promise).resolves.toHaveProperty('hash', 'hi');
  });
  test(id(2), async () => {
    await clearAndInsert();

    opts.precedence = { first: 'before', last: 'schema' };
    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });

    await expect(promise).resolves.toHaveProperty('hash', 'hi');
  });
  test(id(3), async () => {
    await clearAndInsert();

    opts.precedence = { last: 'unique' };
    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });
  test(id(4), async () => {
    await clearAndInsert();

    opts.precedence = { first: 'unique' };
    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });
  test(id(5), async () => {
    await clearAndInsert();

    opts.precedence = { first: 'schema' };
    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });
  test(id(6), async () => {
    await clearAndInsert();

    opts.precedence = { last: 'schema' };
    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });
  test(id(7) + `No precedence`, async () => {
    await clearAndInsert();

    opts.precedence = {};
    const promise = userFactory(opts)
      .query()
      .insert({ password: 'hi', hash: '123456' });
    await expect(promise).rejects.toBeInstanceOf(ValidationError);
  });
});

describe(`- Old`, () => {
  const User = userFactory({
    old: false,
    unique: [{ col: 'username' }, { col: 'email' }]
  });
  test(id(1) + `Doesn't reject Model patches`, async () => {
    await clearAndInsert();

    const doPatch = User.query()
      .first()
      .where('username', 'prince')
      .patch({ username: 'another' });

    await expect(doPatch).resolves.toBe(1);
  });
  test(id(2) + `Doesn't reject Model updates`, async () => {
    await clearAndInsert();

    const doUpdate = User.query()
      .first()
      .where('username', 'prince')
      .update({ username: 'another' });

    await expect(doUpdate).resolves.toBe(1);
  });
  test(
    id(3) + `Doesn't take updates with the same value for the same record`,
    async () => {
      await clearAndInsert();

      const doUpdate = User.query()
        .first()
        .where('username', 'prince')
        .update({ username: 'prince' });
      const doPatch = User.query()
        .first()
        .where('username', 'prince')
        .patch({ username: 'prince' });

      await expect(doUpdate).rejects.toBeInstanceOf(ValidationError);
      await expect(doPatch).rejects.toBeInstanceOf(ValidationError);
    }
  );
  test(id(4) + `Doesn't send old to before fns`, async () => {
    await clearAndInsert();
    const UserEx = userFactory({
      old: false,
      before: [
        (obj) => {
          if (obj.hasOwnProperty('old')) {
            throw Error();
          }
        }
      ]
    });

    const doInsert = UserEx.query().insert({ username: 'some' });
    const doUpdate = UserEx.query()
      .first()
      .where('username', 'isma')
      .then((m) => m.$query().update({ username: 'some' }));
    const doPatch = UserEx.query()
      .first()
      .where('username', 'prince')
      .then((m) => m.$query().patch({ username: 'some' }));

    await expect(doInsert).resolves.toHaveProperty('username', 'some');
    await expect(doUpdate).resolves.toBe(1);
    await expect(doPatch).resolves.toBe(1);
  });
});
