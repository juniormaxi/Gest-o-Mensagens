import type { MessagingProvider, NumberValidationResult } from './messaging-provider.js';
export class WhatsAppWebProvider implements MessagingProvider {
  openConversation(phone: string, message: string) { return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`; }
  async validateNumber(_phone: string): Promise<NumberValidationResult> { return 'UNKNOWN'; }
  async sendMessage(): Promise<never> { throw new Error('WhatsApp Web exige envio manual pelo operador'); }
  async getStatus(): Promise<'UNKNOWN'> { return 'UNKNOWN'; }
}
