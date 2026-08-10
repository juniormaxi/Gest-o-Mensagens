import { Router } from "express";
import {
  CampaignContactStatus,
  CampaignStatus,
  MessageEventType,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { audit } from "../services/audit.service.js";
import { renderTemplate, resolveContactData } from "../../shared/template.js";
import { WhatsAppWebProvider } from "../providers/whatsapp-web.provider.js";
export const campaignRoutes = Router();
campaignRoutes.use(authenticate);
const campaignInput = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  defaultUrl: z.string().url().or(z.literal("")).optional(),
  messageTemplate: z.string().max(10000).optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
});
campaignRoutes.get("/", async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce
        .number()
        .int()
        .refine((v) => [20, 50, 100, 200].includes(v))
        .default(20),
      search: z.string().optional(),
      status: z.nativeEnum(CampaignStatus).optional(),
    })
    .parse(req.query);
  const where = {
    ...(query.search
      ? { name: { contains: query.search, mode: "insensitive" as const } }
      : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.campaign.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
      omit: { attachmentData: true },
      include: {
        owner: { select: { name: true } },
        _count: { select: { contacts: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ]);
  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});
campaignRoutes.post("/", async (req, res) => {
  const input = campaignInput.parse(req.body);
  const item = await prisma.campaign.create({
    data: {
      ...input,
      defaultUrl: input.defaultUrl || null,
      ownerId: req.user!.id,
    },
    omit: { attachmentData: true },
  });
  await audit({
    userId: req.user!.id,
    action: "CREATE_CAMPAIGN",
    entity: "Campaign",
    entityId: item.id,
    ip: req.ip,
  });
  res.status(201).json(item);
});
campaignRoutes.get("/:id", async (req, res) => {
  const item = await prisma.campaign.findUnique({
    where: { id: req.params.id },
    omit: { attachmentData: true },
    include: {
      owner: { select: { name: true } },
      imports: { orderBy: { createdAt: "desc" } },
      _count: { select: { contacts: true } },
    },
  });
  if (!item) throw new AppError(404, "Campanha não encontrada");
  const grouped = await prisma.campaignContact.groupBy({
    by: ["status"],
    where: { campaignId: item.id },
    _count: true,
  });
  res.json({
    ...item,
    counts: Object.fromEntries(grouped.map((row) => [row.status, row._count])),
  });
});
campaignRoutes.patch("/:id", async (req, res) => {
  const input = campaignInput.partial().parse(req.body);
  const item = await prisma.campaign.update({
    where: { id: req.params.id },
    data: { ...input, defaultUrl: input.defaultUrl || null },
    omit: { attachmentData: true },
  });
  await audit({
    userId: req.user!.id,
    action: "UPDATE_CAMPAIGN",
    entity: "Campaign",
    entityId: item.id,
    ip: req.ip,
  });
  res.json(item);
});
campaignRoutes.delete("/:id", async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const item = await prisma.campaign.findUnique({
    where: { id },
    select: {
      name: true,
      _count: { select: { contacts: true, imports: true, events: true } },
    },
  });
  if (!item) throw new AppError(404, "Campanha não encontrada");
  await prisma.$transaction(async (tx) => {
    await tx.campaign.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "DELETE_CAMPAIGN",
        entity: "Campaign",
        entityId: id,
        ip: req.ip,
        metadata: {
          name: item.name,
          campaignContactsRemoved: item._count.contacts,
          importsRemoved: item._count.imports,
          eventsRemoved: item._count.events,
          contactsPreserved: true,
        },
      },
    });
  });
  res.status(204).end();
});
campaignRoutes.get("/:id/variables", async (req, res) => {
  const imports = await prisma.import.findMany({
    where: { campaignId: z.string().parse(req.params.id), status: "COMPLETED" },
    select: { mapping: true },
  });
  const variables = new Set([
    "nome",
    "email",
    "telefone",
    "cidade",
    "estado",
    "cpf",
    "url",
  ]);
  for (const item of imports) {
    const mapping = item.mapping as Record<string, unknown>;
    const custom = (mapping.custom ?? {}) as Record<string, string>;
    Object.keys(custom).forEach((key) => variables.add(key));
  }
  res.json({ variables: [...variables].sort() });
});
campaignRoutes.get("/:id/attachment", async (req, res) => {
  const item = await prisma.campaign.findUnique({
    where: { id: z.string().parse(req.params.id) },
    select: {
      attachmentName: true,
      attachmentMime: true,
      attachmentData: true,
    },
  });
  if (!item?.attachmentData || !item.attachmentName)
    throw new AppError(404, "Anexo não encontrado");
  res.type(item.attachmentMime || "application/octet-stream");
  res.attachment(item.attachmentName);
  res.send(item.attachmentData);
});
campaignRoutes.get("/:id/queue", async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce
        .number()
        .int()
        .refine((v) => [20, 50, 100, 200].includes(v))
        .default(20),
      status: z.nativeEnum(CampaignContactStatus).optional(),
      search: z.string().optional(),
    })
    .parse(req.query);
  const where = {
    campaignId: req.params.id,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          contact: {
            OR: [
              {
                name: { contains: query.search, mode: "insensitive" as const },
              },
              { phone: { contains: query.search } },
            ],
          },
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.campaignContact.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "asc" },
      include: { contact: true },
    }),
    prisma.campaignContact.count({ where }),
  ]);
  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});
campaignRoutes.get("/:id/queue/:campaignContactId", async (req, res) => {
  const item = await prisma.campaignContact.findFirst({
    where: { id: req.params.campaignContactId, campaignId: req.params.id },
    include: {
      campaign: { omit: { attachmentData: true } },
      contact: true,
    },
  });
  if (!item) throw new AppError(404, "Contato da campanha não encontrado");
  const data = resolveContactData(
    item.contact as unknown as Record<string, unknown>,
    item.customFields as Record<string, unknown>,
    item.campaign.defaultUrl,
  );
  const message = renderTemplate(item.campaign.messageTemplate ?? "", data);
  const url = String(data.url ?? "");
  const whatsappUrl = new WhatsAppWebProvider().openConversation(
    item.contact.phone,
    message,
  );
  res.json({
    ...item,
    generatedMessage: message,
    generatedUrl: url,
    whatsappUrl,
  });
});
const eventStatus = {
  SENT: "SENT",
  NOT_SENT: "NOT_SENT",
  NO_WHATSAPP: "NO_WHATSAPP",
  ERROR: "ERROR",
  SKIPPED: "SKIPPED",
} as const;
campaignRoutes.post(
  "/:id/queue/:campaignContactId/events",
  async (req, res) => {
    const input = z
      .object({ eventType: z.nativeEnum(MessageEventType) })
      .parse(req.body);
    const current = await prisma.campaignContact.findFirst({
      where: { id: req.params.campaignContactId, campaignId: req.params.id },
      include: {
        campaign: { omit: { attachmentData: true } },
        contact: true,
      },
    });
    if (!current) throw new AppError(404, "Contato da campanha não encontrado");
    const data = resolveContactData(
      current.contact as unknown as Record<string, unknown>,
      current.customFields as Record<string, unknown>,
      current.campaign.defaultUrl,
    );
    const message = renderTemplate(
      current.campaign.messageTemplate ?? "",
      data,
    );
    const generatedUrl = String(data.url ?? "");
    const status = eventStatus[input.eventType as keyof typeof eventStatus];
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.messageEvent.create({
        data: {
          campaignId: current.campaignId,
          contactId: current.contactId,
          campaignContactId: current.id,
          userId: req.user!.id,
          eventType: input.eventType,
          message,
          url: generatedUrl || null,
        },
      });
      if (status)
        await tx.campaignContact.update({
          where: { id: current.id },
          data: {
            status,
            generatedMessage: message,
            generatedUrl: generatedUrl || null,
            sentAt: status === "SENT" ? new Date() : current.sentAt,
            sentById: status === "SENT" ? req.user!.id : current.sentById,
          },
        });
      return event;
    });
    await audit({
      userId: req.user!.id,
      action:
        input.eventType === "OPENED_WHATSAPP"
          ? "OPEN_WHATSAPP"
          : `MARK_${input.eventType}`,
      entity: "CampaignContact",
      entityId: current.id,
      ip: req.ip,
    });
    res.status(201).json(result);
  },
);
