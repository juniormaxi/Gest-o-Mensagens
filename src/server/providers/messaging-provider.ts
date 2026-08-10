export type NumberValidationResult = 'VALID' | 'INVALID' | 'UNKNOWN' | 'ERROR';
export interface WhatsAppNumberValidator { validate(phone: string): Promise<NumberValidationResult>; }
export interface MessagingProvider {
  openConversation(phone: string, message: string): string;
  validateNumber(phone: string): Promise<NumberValidationResult>;
  sendMessage(): Promise<never>;
  getStatus(): Promise<'UNKNOWN'>;
}
