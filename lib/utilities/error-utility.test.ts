import { describe, it, expect } from 'vitest';
import {
  normalizeAuthError,
  normalizeChatError,
} from '@/lib/utilities/error-utility';

describe('normalizeAuthError', () => {
  it('maps known Supabase auth messages to friendly copy', () => {
    expect(normalizeAuthError(new Error('Invalid login credentials'))).toBe(
      'Incorrect email or password.',
    );
    expect(normalizeAuthError(new Error('User already registered'))).toBe(
      'An account with this email already exists.',
    );
    expect(normalizeAuthError(new Error('Email not confirmed'))).toBe(
      'Please confirm your email address before signing in.',
    );
    expect(normalizeAuthError(new Error('Request rate limit reached'))).toBe(
      'Too many attempts. Please wait a moment and try again.',
    );
    expect(
      normalizeAuthError(new Error('Password should be at least 6 characters')),
    ).toBe('Please choose a stronger password.');
  });

  it('never leaks an unrecognized raw message', () => {
    expect(
      normalizeAuthError(new Error('relation "users" does not exist')),
    ).toBe('Something went wrong. Please try again.');
    expect(normalizeAuthError('a bare string')).toBe(
      'Something went wrong. Please try again.',
    );
    expect(normalizeAuthError(null)).toBe(
      'Something went wrong. Please try again.',
    );
  });
});

describe('normalizeChatError', () => {
  it('maps access rejections (RLS and privilege layer) to friendly copy', () => {
    expect(
      normalizeChatError(
        new Error(
          'new row violates row-level security policy for table "chat_messages"',
        ),
      ),
    ).toBe('You do not have access to chat.');
    expect(
      normalizeChatError(
        new Error('permission denied for table chat_messages'),
      ),
    ).toBe('You do not have access to chat.');
  });

  it('maps check-constraint violations to friendly copy', () => {
    expect(
      normalizeChatError(
        new Error(
          'new row for relation "chat_messages" violates check constraint "chat_messages_content_check"',
        ),
      ),
    ).toBe('That message could not be sent.');
  });

  it('never leaks an unrecognized raw message', () => {
    expect(normalizeChatError(new Error('connection refused'))).toBe(
      'Something went wrong. Please try again.',
    );
    expect(normalizeChatError(null)).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
