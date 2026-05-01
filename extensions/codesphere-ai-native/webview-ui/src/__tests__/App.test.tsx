import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    // Mock VS Code API
    (window as any).acquireVsCodeApi = vi.fn().mockReturnValue({
      postMessage: vi.fn(),
    });
  });

  it('renders CodeSphere AI header', () => {
    render(<App />);
    expect(screen.getByText('CodeSphere AI')).toBeInTheDocument();
  });

  it('renders help message', () => {
    render(<App />);
    expect(screen.getByText('How can I help you code?')).toBeInTheDocument();
  });

  it('renders input area', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Ask CodeSphere AI...')).toBeInTheDocument();
  });
});
