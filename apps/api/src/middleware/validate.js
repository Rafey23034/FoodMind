const { badRequest } = require('../errors');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(badRequest('Please check the details and try again.', result.error.issues));
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { validate };
