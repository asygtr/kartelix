const sendSuccess = (res, data, statusCode = 200, message = '') => {
  const payload = { success: true };
  if (data !== undefined && data !== null) payload.data = data;
  if (message) payload.message = message;
  return res.status(statusCode).json(payload);
};

const sendError = (res, message, statusCode = 400, details = null) => {
  const payload = { success: false, error: message };
  if (details !== null) payload.details = details;
  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };
