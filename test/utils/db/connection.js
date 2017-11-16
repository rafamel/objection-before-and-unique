const objection = require('objection');
const Model = objection.Model;
const Knex = require('knex');
const knexConfig = require('./knexfile');
const path = require('path');
knexConfig.connection.filename = path.join(
    './test/utils/db/',
    knexConfig.connection.filename
);
const knex = Knex(knexConfig);
Model.knex(knex);
