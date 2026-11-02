import { validationResult } from 'express-validator';
import { HttpError } from '../utils/httpError.js';

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = {};
  for (const err of result.array()) {
    if (!errors[err.path]) errors[err.path] = err.msg;
  }
  next(new HttpError(422, 'Data yang dikirim tidak valid', errors));
}
