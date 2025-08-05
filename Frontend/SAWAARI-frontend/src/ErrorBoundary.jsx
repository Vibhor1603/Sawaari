/* eslint-disable react/prop-types */
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error("Error caught by boundary:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="container text-center" style={{ marginTop: "120px" }}>
          <div className="alert alert-danger">
            <h2>
              <i className="fas fa-exclamation-triangle me-2"></i>
              Something went wrong
            </h2>
            <p>We&apos;re sorry, but something unexpected happened.</p>

            {import.meta.env.DEV && (
              <details className="mt-3" style={{ textAlign: "left" }}>
                <summary>Error Details (Development Mode)</summary>
                <pre
                  className="mt-2"
                  style={{
                    fontSize: "12px",
                    background: "#f8f9fa",
                    padding: "10px",
                    borderRadius: "4px",
                  }}
                >
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="mt-3">
              <button
                className="btn btn-primary me-2"
                onClick={() => window.location.reload()}
              >
                <i className="fas fa-refresh me-1"></i>
                Reload Page
              </button>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                  })
                }
              >
                <i className="fas fa-undo me-1"></i>
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Render children normally when there's no error
    return this.props.children;
  }
}

export default ErrorBoundary;
