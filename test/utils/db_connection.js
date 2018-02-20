const objection = require('objection');
const Model = objection.Model;
const Knex = require('knex');
const knexConfig = require('../db/knexfile');
const path = require('path');
knexConfig.connection.filename = path.join(
  './test/db/',
  knexConfig.connection.filename
);
const knex = Knex(knexConfig);
Model.knex(knex);
