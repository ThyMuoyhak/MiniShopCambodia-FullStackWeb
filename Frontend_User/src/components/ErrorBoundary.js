import React, { Component } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <FiAlertTriangle className="w-14 h-14 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Something went wrong</h1>
          <p className="text-gray-500 mt-2 max-w-md">{String(this.state.error?.message || this.state.error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6 px-6 py-2 rounded-lg"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
