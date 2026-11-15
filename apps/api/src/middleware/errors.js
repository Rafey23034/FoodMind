const { HttpError } = require('../errors');

function notFound(req, res, next) {
  next(new HttpError(404, 'Route not found.'));
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const status = error.status || (error.name === 'ZodError' ? 400 : 500);
  const message = status >= 500 ? 'Something went wrong.' : error.message;

  if (status >= 500) console.error(error);

  res.status(status).json({
    error: message,
    ...(error.details ? { details: error.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
