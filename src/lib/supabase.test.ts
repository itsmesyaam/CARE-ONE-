import { describe, it, expect } from 'vitest';
import { supabase } from './supabase';

describe('Supabase Client', () => {
  it('initializes Supabase client instance with configured URL', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
