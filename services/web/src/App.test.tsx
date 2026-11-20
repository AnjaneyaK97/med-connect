import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import './i18n';

describe('MediConnect Frontend App', () => {
  it('renders brand name and medical disclaimer across navigation', () => {
    render(<App />);

    expect(screen.getAllByText('MediConnect').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Clinical Decision Support Prototype: AI assists clinicians/i)
    ).toBeInTheDocument();
  });

  it('renders landing page hero and core clinical pillars', () => {
    render(<App />);

    expect(screen.getByText(/Next-Generation Telemedicine with/i)).toBeInTheDocument();
    expect(screen.getByText(/Voice-to-Triage \(Whisper\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Red-Flags/i)).toBeInTheDocument();
    expect(screen.getByText(/Citations & SOAP Drafts/i)).toBeInTheDocument();
    expect(screen.getByText(/AES-256 & Postgres RLS/i)).toBeInTheDocument();
  });

  it('renders multilingual language toggle button', () => {
    render(<App />);

    const langButton = screen.getByTitle('Switch Language');
    expect(langButton).toBeInTheDocument();

    // Toggle language
    fireEvent.click(langButton);
    expect(document.body).toBeDefined();
  });
});
