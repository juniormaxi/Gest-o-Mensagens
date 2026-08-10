import { describe, expect, it } from 'vitest';
import { normalizeBrazilianPhone } from './phone.js';
describe('normalização de telefone', () => {
  it.each(['(65) 99999-9999', '65 99999 9999', '+55 65 99999-9999', '5565999999999'])('normaliza %s', (phone) => expect(normalizeBrazilianPhone(phone)).toEqual({ normalized: '5565999999999', valid: true }));
  it('rejeita ausente', () => expect(normalizeBrazilianPhone('')).toMatchObject({ valid: false, normalized: null }));
  it('rejeita número curto', () => expect(normalizeBrazilianPhone('659999')).toMatchObject({ valid: false }));
});
