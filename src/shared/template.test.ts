import { describe, expect, it } from 'vitest';
import { extractVariables, renderCampaignMessage, renderTemplate, resolveContactData } from './template.js';
describe('template seguro', () => {
  it('substitui variáveis e URL', () => expect(renderTemplate('Olá {{nome}}, veja {{url}}', { nome: 'João', url: 'https://teste.com/123' })).toBe('Olá João, veja https://teste.com/123'));
  it('aplica fallback sem eval', () => expect(renderTemplate('Olá {{nome|cliente}}', { nome: '' })).toBe('Olá cliente'));
  it('lista variáveis uma vez', () => expect(extractVariables('{{nome}} {{cidade}} {{nome}}')).toEqual(['nome', 'cidade']));
  it('expõe campos padrão e personalizados como variáveis em português', () => {
    const data = resolveContactData(
      { name: 'João', phone: '5565999999999', city: 'Cuiabá', customFields: {} },
      { cargo: 'Gerente', obs: 'Cliente preferencial' },
    );
    expect(renderTemplate('{{nome}} - {{telefone}} - {{cidade}} - {{cargo}} - {{obs}}', data)).toBe(
      'João - 5565999999999 - Cuiabá - Gerente - Cliente preferencial',
    );
  });
});
describe('mensagem da campanha', () => {
  it('inclui a URL padrão quando ela não está no texto', () => expect(
    renderCampaignMessage('Olá, {{nome}}', { nome: 'Ana', url: 'https://exemplo.com' }),
  ).toBe('Olá, Ana\n\nhttps://exemplo.com'));
  it('não duplica uma URL usada pela variável', () => expect(
    renderCampaignMessage('Acesse {{url}}', { url: 'https://exemplo.com' }),
  ).toBe('Acesse https://exemplo.com'));
});
