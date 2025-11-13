"use strict";
/**
 * Centralized Error Handling
 *
 * Provides consistent error handling and logging across all services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
exports.validationError = validationError;
exports.notFoundError = notFoundError;
exports.unauthorizedError = unauthorizedError;
exports.forbiddenError = forbiddenError;
exports.conflictError = conflictError;
exports.serviceUnavailableError = serviceUnavailableError;
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
/**
 * Express error handling middleware
 */
function errorHandler(err, req, res, next) {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = err.isOperational;
    }
    // Log error
    console.error(`❌ Error [${statusCode}]:`, {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        isOperational,
    });
    // Send response
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
/**
 * Validation error (400)
 */
function validationError(message) {
    return new AppError(400, message);
}
/**
 * Not found error (404)
 */
function notFoundError(resource) {
    return new AppError(404, `${resource} not found`);
}
/**
 * Unauthorized error (401)
 */
function unauthorizedError(message = 'Unauthorized') {
    return new AppError(401, message);
}
/**
 * Forbidden error (403)
 */
function forbiddenError(message = 'Forbidden') {
    return new AppError(403, message);
}
/**
 * Conflict error (409)
 */
function conflictError(message) {
    return new AppError(409, message);
}
/**
 * Service unavailable error (503)
 */
function serviceUnavailableError(message) {
    return new AppError(503, message, false);
}
//# sourceMappingURL=error-handler.js.map