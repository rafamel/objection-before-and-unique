exports.up = (knex, Promise) => {
    return knex.schema
        .createTable('users', (table) => {
            table.increments('id').primary();
            table.string('username');
            table.string('email');
            table.string('hash');
        });
};

exports.down = (knex, Promise) => {
    return knex.schema
        .dropTableIfExists('users');
};
