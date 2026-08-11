const VARIABLE = /\{\{\s*([\p{L}\p{N}_-]+)(?:\|([^{}]*))?\s*\}\}/gu;

export function extractVariables(template: string): string[] {
  return [...template.matchAll(VARIABLE)]
    .map((match) => match[1])
    .filter((value, index, all) => all.indexOf(value) === index);
}

export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  return template.replace(
    VARIABLE,
    (_match, key: string, fallback?: string) => {
      const value = data[key];
      return value === undefined ||
        value === null ||
        String(value).trim() === ""
        ? (fallback ?? "")
        : String(value);
    },
  );
}

export function renderCampaignMessage(
  template: string,
  data: Record<string, unknown>,
): string {
  const message = renderTemplate(template, data).trim();
  const url = String(data.url ?? "").trim();
  if (!url || message.includes(url)) return message;
  return [message, url].filter(Boolean).join("\n\n");
}

export function resolveContactData(
  contact: Record<string, unknown>,
  campaignFields: Record<string, unknown>,
  campaignDefaultUrl?: string | null,
): Record<string, unknown> {
  const custom = (contact.customFields ?? {}) as Record<string, unknown>;
  const aliases = {
    nome: contact.name,
    telefone: contact.phone,
    email: contact.email,
    cidade: contact.city,
    estado: contact.state,
    cpf: contact.cpf,
    obs: contact.notes,
  };
  const fields: Record<string, unknown> = {
    ...contact,
    ...aliases,
    ...custom,
    ...campaignFields,
  };
  return { ...fields, url: fields["url"] || campaignDefaultUrl || "" };
}
