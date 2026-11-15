class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, message, details);
const unauthorized = message => new HttpError(401, message || 'Sign in is required.');
const forbidden = message => new HttpError(403, message || 'You cannot access this resource.');
const notFound = message => new HttpError(404, message || 'Resource not found.');
const conflict = message => new HttpError(409, message);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
