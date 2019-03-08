import * as Objection from 'objection';
import Ajv from 'ajv';
import { IOptions } from './types';
import { JSONSchema7 } from 'json-schema';

const ajv = new Ajv();

export default function schema(
  self: Objection.Model,
  options: IOptions
): Array<() => void> {
  if (!options.schema) return [];

  return [
    () => {
      const validate = ajv.compile(options.schema as JSONSchema7);
      const valid = validate(self);
      if (!valid) {
        throw Objection.Model.createValidationError({
          type: 'ModelValidation',
          data: validate.errors
        });
      }
    }
  ];
}
