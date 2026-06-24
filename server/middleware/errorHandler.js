const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.responseCode || 500;
  const message = err.message || 'Sunucu hatası';
  
  console.error(`[ERROR] ${statusCode} - ${message}`, err);

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
