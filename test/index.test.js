'use strict';
const dbClear = require('./utils/db-clear');
const userFactory = require('./utils/user-factory');
const ValidationError = require('objection').ValidationError;

const id = (n) => `[${ String(n) }] `;

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
        test(id(2) + `Valid before`, () => {
            expect(() => userFactory({ before: [() => {}] }))
                .not.toThrowError();
        });
        test(id(3) + `Basic Unique`, () => {
            expect(() => userFactory({
                unique: [
                    { col: 'name' }
                ]
            })).not.toThrowError();
        });
        test(id(4) + `Full Unique`, () => {
            expect(() => userFactory({
                unique: [{
                    col: 'name',
                    label: 'Name',
                    insensitive: true,
                    message: 'Some',
                    for: ['some_id']
                }]
            })).not.toThrowError();
        });
        test(id(5) + `Valid precedence`, () => {
            expect(() => userFactory({ precedence: 'none' }))
                .not.toThrowError();
            expect(() => userFactory({ precedence: 'before' }))
                .not.toThrowError();
            expect(() => userFactory({ precedence: 'unique' }))
                .not.toThrowError();
        });
    });
    describe(`- Not Pass`, () => {
        test(id(1) + `Before`, () => {
            expect(() => userFactory({ before: {} })).toThrowError();
            expect(() => userFactory({ before: 5 })).toThrowError();
            expect(() => userFactory({ before: '' })).toThrowError();
            expect(() => userFactory({ before: [''] })).toThrowError();
        });
        test(id(2) + `Precedence`, () => {
            expect(() => userFactory({ precedence: 'some' }))
                .toThrowError();
            expect(() => userFactory({ precedence: 5 }))
                .toThrowError();
        });
        test(id(3) + `Unique: wrong type`, () => {
            expect(() => userFactory({ unique: {} })).toThrowError();
        });
        test(id(4) + `Unique: List of strings`, () => {
            expect(() => userFactory({ unique: [''] })).toThrowError();
        });
        test(id(5) + `Unique: No 'col'`, () => {
            expect(() => userFactory({
                unique: [{ label: 'Name' }]
            })).toThrowError();
        });
        test(id(6) + `Unique: Unknown key`, () => {
            expect(() => userFactory({
                unique: [{
                    col: 'name',
                    foo: ''
                }]
            })).toThrowError();
        });
        test(id(7) + `Unique: Wrong 'insensitive' type`, () => {
            expect(() => userFactory({
                unique: [{
                    col: 'name',
                    insensitive: ''
                }]
            })).toThrowError();
        });
        test(id(8) + `Unique: Wrong 'for' type`, () => {
            expect(() => userFactory({
                unique: [{
                    col: 'name',
                    for: ''
                }]
            })).toThrowError();
        });
        test(id(9) + `Unique: Empty strings`, () => {
            expect(() => userFactory({
                unique: [{ col: '' }]
            })).toThrowError();

            expect(() => userFactory({
                unique: [{ col: 'name', label: '' }]
            })).toThrowError();

            expect(() => userFactory({
                unique: [{
                    col: 'name',
                    message: ''
                }]
            })).toThrowError();
        });
    });
});

describe(`- Unique`, () => {
    describe(`- Basic column uniqueness`, () => {
        const User = userFactory({
            unique: [
                { col: 'username' },
                { col: 'email' }
            ]
        });

        test(id(1) + `Clean insert doesn't reject`, async () => {
            await dbClear();

            await expect(User.query().insert({
                username: 'prince',
                email: 'prince@prince.com'
            })).resolves.toHaveProperty('username', 'prince');

            await expect(User.query().insert({
                email: 'another@email.com'
            })).resolves.toHaveProperty('email', 'another@email.com');
        });
        test(id(2) + `Error/ValidationError (insert)`, async () => {
            await clearAndInsert();
            const promise = User.query().insert({ username: 'prince' });

            await expect(promise).rejects
                .toBeInstanceOf(Error);
            await expect(promise).rejects
                .toBeInstanceOf(ValidationError);
        });
        test(id(3) + `ValidationError (patch & update)`, async () => {
            const user = await User.query().first().where('username', 'isma');
            const promise1 = user.$query().patchAndFetch({ username: 'prince' });
            const promise2 = user.$query().update({ username: 'prince' });

            await expect(promise1).rejects
                .toBeInstanceOf(ValidationError);
            await expect(promise2).rejects
                .toBeInstanceOf(ValidationError);
        });
        test(id(4) + `Errors out when updating/patching from Model`, async () => {
            // Patch
            const promise1 = User.query()
                .patch({ username: 'other' })
                .where('username', 'isma');
            await expect(promise1).rejects
                .toBeInstanceOf(Error);
            await expect(promise1).rejects
                .toHaveProperty('message', `'unique' and 'before' at update only work with instance queries ($query()).`);

            // Update
            const promise2 = User.query()
                .update({ username: 'other' })
                .where('username', 'isma');
            await expect(promise2).rejects
                .toBeInstanceOf(Error);
        });
        test(id(5) + `Multiple uniques`, async () => {
            const promise = User.query().insert({
                username: 'other',
                email: 'prince@prince.com'
            });

            await expect(promise).rejects
                .toBeInstanceOf(ValidationError);
        });
        test(id(6) + `ValidationError structure`, async () => {
            const promise = User.query().insert({ username: 'prince' });
            const catcher = promise.catch(err => err.data.username[0]);

            await expect(promise).rejects
                .toHaveProperty('data');
            await expect(promise).rejects
                .toHaveProperty('data.username');
            await expect(catcher).resolves
                .toHaveProperty('keyword', 'unique');
            await expect(catcher).resolves
                .toHaveProperty('message', 'username already exists.');
        });
    });

    describe(`- Additional features`, () => {
        test(id(1) + `Label`, async () => {
            const User = userFactory({
                unique: [{ col: 'username', label: 'User' }]
            });
            const promise = User.query()
                .insert({ username: 'prince' })
                .catch(err => err.data.username[0]);
            await expect(promise).resolves
                .toHaveProperty('message', 'User already exists.');
        });
        test(id(2) + `Insensitive`, async () => {
            const User = userFactory({
                unique: [{ col: 'username' }]
            });
            const iUser = userFactory({
                unique: [{ col: 'username', insensitive: true }]
            });
            const promise1 = User.query().insert({ username: 'Prince' });
            await expect(promise1).resolves
                .toHaveProperty('username', 'Prince');

            await clearAndInsert();
            const promise2 = iUser.query().insert({ username: 'Prince' });
            await expect(promise2).rejects
                .toBeInstanceOf(ValidationError);
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
            await expect(promise1).rejects
                .toBeInstanceOf(ValidationError);

            const promise2 = User.query().insert({
                username: 'prince',
                email: 'other@email.com',
                hash: '55555'
            });
            await expect(promise2).resolves
                .toHaveProperty('username', 'prince');

            const User2 = userFactory({
                unique: [{ col: 'username', for: ['email', 'hash'] }]
            });
            const promise3 = User2.query().insert({
                username: 'prince',
                email: 'prince@prince.com',
                hash: '55555'
            });
            await expect(promise3).resolves
                .toHaveProperty('username', 'prince');

            const user = await User2.query()
                .first()
                .where('username', 'prince')
                .andWhere('email', 'prince@prince.com')
                .andWhere('hash', '55555');
            const promise4 = user.$query().patchAndFetch({ email: 'other@email.com' });
            const promise5 = user.$query().patchAndFetch({ email: 'other@email.com', hash: '123456' });
            await expect(promise4).rejects
                .toBeInstanceOf(ValidationError);
            await expect(promise5).resolves
                .toHaveProperty('username', 'prince');
        });
        test(id(4) + `Message`, async () => {
            const User = userFactory({
                unique: [{
                    col: 'username',
                    label: 'User',
                    message: 'A message'
                }]
            });
            const promise = User.query()
                .insert({ username: 'prince' })
                .catch(err => err.data.username[0]);
            await expect(promise).resolves
                .toHaveProperty('message', 'A message');
        });
    });

    describe(`- Before`, () => {
        describe(`- Mutation`, () => {
            test(id(1) + `No async`, async () => {
                await clearAndInsert();
                const User = userFactory({
                    before: [
                        (newer) => {
                            newer.username += 'hello';
                        }
                    ]
                });
                const promise = User.query()
                    .insert({ username: 'hola' });
                await expect(promise).resolves
                    .toHaveProperty('username', 'holahello');
            });
            test(id(2) + `Async + Receives oldInstance`, async () => {
                const getStr = async () => 'tail';
                const User = userFactory({
                    before: [
                        async (newer, older) => {
                            if (older) {
                                newer.username = older.username + await getStr();
                            }
                        }
                    ]
                });
                const promise = (
                    await User.query()
                        .first()
                        .where('username', 'holahello')
                ).$query().patchAndFetch({ username: 'goodbye' });
                await expect(promise).resolves
                    .toHaveProperty('username', 'holahellotail');
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
                const promise = User.query()
                    .insert({ username: 'hola' });
                await expect(promise).rejects
                    .toBeInstanceOf(Error);
            });
            test(id(2) + `Async`, async () => {
                const User = userFactory({
                    before: [
                        async () => {
                            throw Error('Some Error');
                        }
                    ]
                });
                const promise = User.query()
                    .insert({ username: 'hola' });
                await expect(promise).rejects
                    .toBeInstanceOf(Error);
            });
        });

        describe(`- Receives query context`, () => {
            test(id(1), async () => {
                await clearAndInsert();
                const User = userFactory({
                    before: [
                        (newer, _, ctx) => {
                            newer.username = ctx.name;
                        }
                    ]
                });
                const promise = User.query()
                    .context({ name: 'Hi' })
                    .insert({});
                await expect(promise).resolves
                    .toHaveProperty('username', 'Hi');
            });
        });
    });
});

describe(`- Precedence`, () => {
    test(id(1), async () => {
        await clearAndInsert();
        const opts = {
            precedence: 'before',
            unique: [{ col: 'username' }],
            before: [
                async (newer) => {
                    newer.username += 'hello';
                }
            ]
        };

        const promise1 = userFactory(opts).query()
            .insert({ username: 'prince' });
        await expect(promise1).resolves
            .toHaveProperty('username', 'princehello');

        opts.precedence = 'unique';
        const promise2 = userFactory(opts).query()
            .insert({ username: 'prince' });
        await expect(promise2).rejects
            .toBeInstanceOf(ValidationError);
    });
});
