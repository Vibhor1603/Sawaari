// Comprehensive error handling utility for Ride Buddy system
import toast from "./toast";

// Error types and their user-friendly messages
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR:
    "Network connection failed. Please check your internet connection.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  SERVER_ERROR: "Server is temporarily unavailable. Please try again later.",

  // Authentication errors
  AUTH_REQUIRED: "Please sign in to access this feature.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  UNAUTHORIZED: "You don't have permission to perform this action.",

  // Validation errors
  INVALID_INPUT: "Please check your input and try again.",
  MISSING_FIELDS: "Please fill in all required fields.",
  INVALID_ROUTE: "Please enter valid source and destination locations.",
  SAME_LOCATIONS: "Source and destination cannot be the same.",

  // Business logic errors
  SELF_REQUEST: "You cannot send a request to yourself.",
  DUPLICATE_REQUEST: "You have already sent a request to this user.",
  REQUEST_NOT_FOUND: "The request could not be found or has expired.",
  MATCH_NOT_FOUND: "The match could not be found or has ended.",
  NO_ACTIVE_SEARCH: "No active search found for this user.",

  // Rate limiting
  RATE_LIMITED: "Too many requests. Please wait a moment before trying again.",

  // Generic fallback
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

// Error severity levels
const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// Error categories
const ERROR_CATEGORIES = {
  NETWORK: "network",
  AUTH: "authentication",
  VALIDATION: "validation",
  BUSINESS: "business_logic",
  SYSTEM: "system",
};

class RideBuddyErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
  }

  /**
   * Handle and categorize errors
   * @param {Error|Object} error - The error to handle
   * @param {Object} context - Additional context about where the error occurred
   * @returns {Object} - Processed error information
   */
  handleError(error, context = {}) {
    const processedError = this.processError(error, context);
    this.logError(processedError);
    this.showUserMessage(processedError);
    return processedError;
  }

  /**
   * Process and categorize the error
   * @param {Error|Object} error - The error to process
   * @param {Object} context - Additional context
   * @returns {Object} - Processed error object
   */
  processError(error, context) {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();

    // Extract error information
    let message = error.message || error.error || "Unknown error";
    let code = error.code || error.status || "UNKNOWN";
    let category = ERROR_CATEGORIES.SYSTEM;
    let severity = ERROR_SEVERITY.MEDIUM;
    let userMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
    let shouldRetry = false;
    let shouldRedirect = false;
    let redirectPath = null;

    // Categorize based on error type/message
    if (this.isNetworkError(error)) {
      category = ERROR_CATEGORIES.NETWORK;
      severity = ERROR_SEVERITY.HIGH;
      userMessage = this.getNetworkErrorMessage(error);
      shouldRetry = true;
    } else if (this.isAuthError(error)) {
      category = ERROR_CATEGORIES.AUTH;
      severity = ERROR_SEVERITY.HIGH;
      userMessage = this.getAuthErrorMessage(error);
      shouldRedirect = true;
      redirectPath = "/signin";
    } else if (this.isValidationError(error)) {
      category = ERROR_CATEGORIES.VALIDATION;
      severity = ERROR_SEVERITY.LOW;
      userMessage = this.getValidationErrorMessage(error);
    } else if (this.isBusinessLogicError(error)) {
      category = ERROR_CATEGORIES.BUSINESS;
      severity = ERROR_SEVERITY.MEDIUM;
      userMessage = this.getBusinessLogicErrorMessage(error);
    }

    return {
      id: errorId,
      timestamp,
      message,
      code,
      category,
      severity,
      userMessage,
      shouldRetry,
      shouldRedirect,
      redirectPath,
      context,
      stack: error.stack,
    };
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error) {
    const networkIndicators = [
      "network",
      "timeout",
      "fetch",
      "connection",
      "offline",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ];

    const errorString = (error.message || error.toString()).toLowerCase();
    return networkIndicators.some((indicator) =>
      errorString.includes(indicator)
    );
  }

  /**
   * Check if error is authentication-related
   */
  isAuthError(error) {
    const authCodes = [401, 403, "UNAUTHORIZED", "FORBIDDEN", "TOKEN_EXPIRED"];
    return (
      authCodes.includes(error.status) ||
      authCodes.includes(error.code) ||
      (error.message && error.message.toLowerCase().includes("auth"))
    );
  }

  /**
   * Check if error is validation-related
   */
  isValidationError(error) {
    const validationCodes = [400, "VALIDATION_ERROR", "INVALID_INPUT"];
    return (
      validationCodes.includes(error.status) ||
      validationCodes.includes(error.code) ||
      (error.message && error.message.toLowerCase().includes("validation"))
    );
  }

  /**
   * Check if error is business logic-related
   */
  isBusinessLogicError(error) {
    const businessCodes = [409, "CONFLICT", "DUPLICATE", "NOT_FOUND"];
    return (
      businessCodes.includes(error.status) || businessCodes.includes(error.code)
    );
  }

  /**
   * Get network error message
   */
  getNetworkErrorMessage(error) {
    if (error.message?.includes("timeout")) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    if (error.status >= 500) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  /**
   * Get authentication error message
   */
  getAuthErrorMessage(error) {
    if (error.code === "TOKEN_EXPIRED" || error.message?.includes("expired")) {
      return ERROR_MESSAGES.SESSION_EXPIRED;
    }
    if (error.status === 403) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    return ERROR_MESSAGES.AUTH_REQUIRED;
  }

  /**
   * Get validation error message
   */
  getValidationErrorMessage(error) {
    const message = error.message?.toLowerCase() || "";

    if (message.includes("same location") || message.includes("same")) {
      return ERROR_MESSAGES.SAME_LOCATIONS;
    }
    if (message.includes("route") || message.includes("location")) {
      return ERROR_MESSAGES.INVALID_ROUTE;
    }
    if (message.includes("required") || message.includes("missing")) {
      return ERROR_MESSAGES.MISSING_FIELDS;
    }
    return ERROR_MESSAGES.INVALID_INPUT;
  }

  /**
   * Get business logic error message
   */
  getBusinessLogicErrorMessage(error) {
    const message = error.message?.toLowerCase() || "";

    if (message.includes("self") || message.includes("yourself")) {
      return ERROR_MESSAGES.SELF_REQUEST;
    }
    if (message.includes("duplicate") || message.includes("already sent")) {
      return ERROR_MESSAGES.DUPLICATE_REQUEST;
    }
    if (message.includes("not found") && message.includes("request")) {
      return ERROR_MESSAGES.REQUEST_NOT_FOUND;
    }
    if (message.includes("not found") && message.includes("match")) {
      return ERROR_MESSAGES.MATCH_NOT_FOUND;
    }
    if (message.includes("rate limit") || message.includes("too many")) {
      return ERROR_MESSAGES.RATE_LIMITED;
    }
    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Log error for debugging
   */
  logError(processedError) {
    // Add to error log
    this.errorLog.unshift(processedError);

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging based on severity
    if (processedError.severity === ERROR_SEVERITY.CRITICAL) {
      console.error("CRITICAL ERROR:", processedError);
    } else if (processedError.severity === ERROR_SEVERITY.HIGH) {
      console.error("HIGH SEVERITY ERROR:", processedError);
    } else if (processedError.severity === ERROR_SEVERITY.MEDIUM) {
      console.warn("MEDIUM SEVERITY ERROR:", processedError);
    } else {
      console.log("LOW SEVERITY ERROR:", processedError);
    }
  }

  /**
   * Show user-friendly message
   */
  showUserMessage(processedError) {
    const { userMessage, severity } = processedError;

    // Use toast notification if available
    if (typeof toast !== "undefined") {
      if (
        severity === ERROR_SEVERITY.CRITICAL ||
        severity === ERROR_SEVERITY.HIGH
      ) {
        toast.error(userMessage);
      } else if (severity === ERROR_SEVERITY.MEDIUM) {
        toast.warning(userMessage);
      } else {
        toast.info(userMessage);
      }
    } else {
      // Fallback to alert
      alert(userMessage);
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Handle retry logic
   */
  shouldRetry(error, context = {}) {
    const { operation } = context;
    const retryKey = `${operation}_${error.code}`;

    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    if (currentAttempts >= this.maxRetryAttempts) {
      this.retryAttempts.delete(retryKey);
      return false;
    }

    // Only retry network errors and server errors
    if (
      this.isNetworkError(error) ||
      (error.status >= 500 && error.status < 600)
    ) {
      this.retryAttempts.set(retryKey, currentAttempts + 1);
      return true;
    }

    return false;
  }

  /**
   * Clear retry attempts for an operation
   */
  clearRetryAttempts(operation) {
    const keysToDelete = [];
    for (const key of this.retryAttempts.keys()) {
      if (key.startsWith(`${operation}_`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.retryAttempts.delete(key));
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCategory: {},
      bySeverity: {},
      recent: this.errorLog.slice(0, 10),
    };

    this.errorLog.forEach((error) => {
      stats.byCategory[error.category] =
        (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
  }

  /**
   * Handle session expiration
   */
  handleSessionExpiration() {
    // Clear any stored auth data
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    // Show message and redirect
    this.showUserMessage({
      userMessage: ERROR_MESSAGES.SESSION_EXPIRED,
      severity: ERROR_SEVERITY.HIGH,
    });

    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = "/signin";
    }, 2000);
  }

  /**
   * Handle network connectivity issues
   */
  handleNetworkError(error, context = {}) {
    const processedError = this.handleError(error, context);

    // Check if we should retry
    if (this.shouldRetry(error, context)) {
      return {
        ...processedError,
        shouldRetry: true,
        retryDelay: Math.min(
          1000 *
            Math.pow(
              2,
              this.retryAttempts.get(`${context.operation}_${error.code}`) || 0
            ),
          10000
        ),
      };
    }

    return processedError;
  }

  /**
   * Validate user input to prevent errors
   */
  validateInput(data, rules) {
    const errors = [];

    Object.keys(rules).forEach((field) => {
      const rule = rules[field];
      const value = data[field];

      if (rule.required && (!value || value.toString().trim() === "")) {
        errors.push(`${field} is required`);
      }

      if (value && rule.minLength && value.toString().length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }

      if (value && rule.maxLength && value.toString().length > rule.maxLength) {
        errors.push(
          `${field} must be no more than ${rule.maxLength} characters`
        );
      }

      if (value && rule.pattern && !rule.pattern.test(value.toString())) {
        errors.push(`${field} format is invalid`);
      }
    });

    return errors;
  }
}

// Create singleton instance
const errorHandler = new RideBuddyErrorHandler();

// Export both the class and instance
export {
  RideBuddyErrorHandler,
  ERROR_MESSAGES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
};
export default errorHandler;
