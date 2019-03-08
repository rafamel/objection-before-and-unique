/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Model } from 'objection';
import obau from '../../src';
import { IOptions } from '../../src/types';

export default function(options: IOptions = {}) {
  return class User extends obau(options)(Model) {
    public username: string;
    public email: string;
    public hash: string;
    public static tableName = 'users';
  };
}
