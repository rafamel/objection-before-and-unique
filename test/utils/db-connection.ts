import { Model } from 'objection';
import Knex from 'knex';
import knexConfig from '../db/knexfile';
import path from 'path';

knexConfig.connection.filename = path.join(
  './test/db/',
  knexConfig.connection.filename
);
const knex = Knex(knexConfig);
Model.knex(knex);

export default knex;
