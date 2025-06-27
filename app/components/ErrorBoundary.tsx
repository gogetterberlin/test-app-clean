"use client";
import React from "react";

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-600 p-4">Ein Fehler ist aufgetreten. Bitte lade die Seite neu.</div>;
    }
    return this.props.children;
  }
}
