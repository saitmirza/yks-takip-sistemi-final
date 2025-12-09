import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error: error, errorInfo: errorInfo });
    console.error("Uygulama Çöktü:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Bir şeyler ters gitti!</h1>
          <p className="mb-4">iOS cihazınızda bir hata oluştu.</p>
          <div className="bg-gray-800 p-4 rounded text-left text-xs font-mono overflow-auto w-full max-w-lg mb-4">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-indigo-600 px-6 py-3 rounded-xl font-bold"
          >
            Sayfayı Yenile
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;