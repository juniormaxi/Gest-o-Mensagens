import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { extractVariables } from "../../shared/template.js";
import { audit } from "../services/audit.service.js";

export const templateRoutes = Router();
templateRoutes.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const inputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional(),
  message: z.string().trim().min(1).max(10000),
  defaultUrl: z.string().url().or(z.literal("")).optional(),
  removeAttachment: z.enum(["true", "false"]).optional(),
});
const summarySelect = {
  id: true,
  name: true,
  category: true,
  message: true,
  variables: true,
  defaultUrl: true,
  attachmentName: true,
  attachmentMime: true,
  createdAt: true,
  updatedAt: true,
} as const;

templateRoutes.get("/", async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
    })
    .parse(req.query);
  const where = query.search
    ? { name: { contains: query.search, mode: "insensitive" as const } }
    : {};
  const [items, total] = await prisma.$transaction([
    prisma.messageTemplate.findMany({
      where,
      select: summarySelect,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.messageTemplate.count({ where }),
  ]);
  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});

templateRoutes.post("/", upload.single("attachment"), async (req, res) => {
  const input = inputSchema.parse(req.body);
  const item = await prisma.messageTemplate.create({
    data: {
      name: input.name,
      category: input.category || null,
      message: input.message,
      defaultUrl: input.defaultUrl || null,
      variables: extractVariables(input.message),
      attachmentName: req.file?.originalname,
      attachmentMime: req.file?.mimetype,
      attachmentData: req.file ? Uint8Array.from(req.file.buffer) : undefined,
    },
    select: summarySelect,
  });
  await audit({
    userId: req.user!.id,
    action: "CREATE_MESSAGE_TEMPLATE",
    entity: "MessageTemplate",
    entityId: item.id,
    ip: req.ip,
  });
  res.status(201).json(item);
});

templateRoutes.patch("/:id", upload.single("attachment"), async (req, res) => {
  const id = z.string().parse(req.params.id);
  const input = inputSchema.parse(req.body);
  const attachmentUpdate = req.file
    ? {
        attachmentName: req.file.originalname,
        attachmentMime: req.file.mimetype,
        attachmentData: Uint8Array.from(req.file.buffer),
      }
    : input.removeAttachment === "true"
      ? { attachmentName: null, attachmentMime: null, attachmentData: null }
      : {};
  const item = await prisma.messageTemplate.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category || null,
      message: input.message,
      defaultUrl: input.defaultUrl || null,
      variables: extractVariables(input.message),
      ...attachmentUpdate,
    },
    select: summarySelect,
  });
  await audit({
    userId: req.user!.id,
    action: "UPDATE_MESSAGE_TEMPLATE",
    entity: "MessageTemplate",
    entityId: id,
    ip: req.ip,
  });
  res.json(item);
});

templateRoutes.get("/:id/attachment", async (req, res) => {
  const item = await prisma.messageTemplate.findUnique({
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

templateRoutes.post("/:id/campaign", async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(2).max(120),
      description: z.string().max(2000).optional(),
    })
    .parse(req.body);
  const template = await prisma.messageTemplate.findUnique({
    where: { id: z.string().parse(req.params.id) },
  });
  if (!template) throw new AppError(404, "Modelo não encontrado");
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      description:
        input.description ||
        `Campanha criada a partir do modelo ${template.name}`,
      ownerId: req.user!.id,
      messageTemplate: template.message,
      defaultUrl: template.defaultUrl,
      attachmentName: template.attachmentName,
      attachmentMime: template.attachmentMime,
      attachmentData: template.attachmentData,
    },
    omit: { attachmentData: true },
  });
  await audit({
    userId: req.user!.id,
    action: "CREATE_CAMPAIGN_FROM_TEMPLATE",
    entity: "Campaign",
    entityId: campaign.id,
    ip: req.ip,
    metadata: { templateId: template.id },
  });
  res.status(201).json(campaign);
});

templateRoutes.delete("/:id", async (req, res) => {
  const id = z.string().parse(req.params.id);
  const item = await prisma.messageTemplate.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!item) throw new AppError(404, "Modelo não encontrado");
  await prisma.$transaction(async (tx) => {
    await tx.messageTemplate.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "DELETE_MESSAGE_TEMPLATE",
        entity: "MessageTemplate",
        entityId: id,
        ip: req.ip,
        metadata: { name: item.name },
      },
    });
  });
  res.status(204).end();
});
