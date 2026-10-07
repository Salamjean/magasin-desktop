import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoLogin = () => {
    sessionStorage.setItem('gestmag_splash_done', 'true');
    window.location.hash = '#/login';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0055b8] text-slate-800 p-4 select-none font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 shadow-2xl space-y-5 border border-white/40 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-black text-[#0c2340]">Une interruption est survenue</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                L'application a rencontré une erreur d'affichage. Vos données locales sont en sécurité.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono break-all max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleGoLogin}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#003874] hover:bg-[#002b59] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Page de connexion</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
