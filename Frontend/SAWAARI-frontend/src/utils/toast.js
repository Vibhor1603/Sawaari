// Toast Notification Utility
class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById("toast-container")) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById("toast-container");
    }
  }

  show(message, type = "info", duration = 5000, options = {}) {
    const toast = {
      id: Date.now() + Math.random(),
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration,
      ...options,
    };

    this.toasts.push(toast);
    this.render(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, duration);
    }

    return toast.id;
  }

  success(message, duration = 4000, options = {}) {
    return this.show(message, "success", duration, options);
  }

  error(message, duration = 6000, options = {}) {
    return this.show(message, "error", duration, options);
  }

  warning(message, duration = 5000, options = {}) {
    return this.show(message, "warning", duration, options);
  }

  info(message, duration = 4000, options = {}) {
    return this.show(message, "info", duration, options);
  }

  loading(message, options = {}) {
    return this.show(message, "loading", 0, { ...options, showSpinner: true });
  }

  remove(toastId) {
    this.toasts = this.toasts.filter((toast) => toast.id !== toastId);
    const toastElement = document.getElementById(`toast-${toastId}`);
    if (toastElement) {
      toastElement.classList.add("toast-exit");
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 300);
    }
  }

  clear() {
    this.toasts.forEach((toast) => this.remove(toast.id));
  }

  render(toast) {
    const toastElement = document.createElement("div");
    toastElement.id = `toast-${toast.id}`;
    toastElement.className = `toast toast-${toast.type}`;

    const icon = this.getIcon(toast.type);
    const spinner = toast.showSpinner
      ? '<div class="toast-spinner"></div>'
      : "";

    toastElement.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">
          ${spinner}${icon}
        </div>
        <div class="toast-message">${toast.message}</div>
        <button class="toast-close" onclick="window.toast.remove(${toast.id})">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="toast-progress"></div>
    `;

    // Add click to dismiss
    toastElement.addEventListener("click", (e) => {
      if (!e.target.closest(".toast-close")) {
        this.remove(toast.id);
      }
    });

    this.container.appendChild(toastElement);

    // Trigger animation
    setTimeout(() => {
      toastElement.classList.add("toast-show");
    }, 10);

    // Progress bar animation
    if (toast.duration > 0) {
      const progressBar = toastElement.querySelector(".toast-progress");
      progressBar.style.animationDuration = `${toast.duration}ms`;
      progressBar.classList.add("toast-progress-animate");
    }
  }

  getIcon(type) {
    const icons = {
      success: "🛺✅", // Auto-rickshaw with success
      error: "🛺❌", // Auto-rickshaw with error
      warning: "🛺⚠️", // Auto-rickshaw with warning
      info: "🛺ℹ️", // Auto-rickshaw with info
      loading: "🛺💨", // Auto-rickshaw moving
    };
    return `<span class="toast-rickshaw-icon">${
      icons[type] || icons.info
    }</span>`;
  }

  // Promise wrapper for async operations
  async promise(promise, messages = {}) {
    const loadingId = this.loading(messages.loading || "Processing...", {
      persistent: true,
    });

    try {
      const result = await promise;
      this.remove(loadingId);

      if (messages.success) {
        this.success(messages.success);
      }

      return result;
    } catch (error) {
      this.remove(loadingId);

      const errorMessage =
        messages.error || error.message || "An unexpected error occurred";

      this.error(errorMessage);
      throw error;
    }
  }
}

// Create global instance
const toast = new ToastManager();

// Make it available globally
window.toast = toast;

export default toast;
