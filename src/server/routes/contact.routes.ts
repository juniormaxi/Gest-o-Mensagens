import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { normalizeBrazilianPhone } from "../../shared/phone.js";
import { audit } from "../services/audit.service.js";
import type { Prisma } from "@prisma/client";
export const contactRoutes = Router();
contactRoutes.use(authenticate);
const contactInput = z.object({
  name: z.string().max(160).optional(),
  phone: z.string(),
  email: z.string().email().or(z.literal("")).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(2).optional(),
  notes: z.string().max(3000).optional(),
  customFields: z.record(z.string(), z.unknown()).default({}),
});
contactRoutes.get("/", async (req, res) => {
  const q = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce
        .number()
        .int()
        .refine((v) => [20, 50, 100, 200].includes(v))
        .default(20),
      search: z.string().optional(),
    })
    .parse(req.query);
  const where = q.search
    ? {
        OR: [
          { name: { contains: q.search, mode: "insensitive" as const } },
          { phone: { contains: q.search } },
          { email: { contains: q.search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [items, total, overallTotal] = await prisma.$transaction([
    prisma.contact.findMany({
      where,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        imports: {
          take: 8,
          orderBy: { createdAt: "desc" },
          include: {
            import: {
              select: {
                id: true,
                fileName: true,
                campaign: { select: { id: true, name: true } },
              },
            },
          },
        },
        _count: {
          select: { campaigns: true, events: { where: { eventType: "SENT" } } },
        },
      },
    }),
    prisma.contact.count({ where }),
    prisma.contact.count(),
  ]);
  res.json({
    items: items.map((item) => ({
      ...item,
      sentCount: item._count.events,
      campaignCount: item._count.campaigns,
    })),
    total,
    overallTotal,
    page: q.page,
    pageSize: q.pageSize,
  });
});
contactRoutes.get("/:id", async (req, res) => {
  const id = z.string().parse(req.params.id);
  const item = await prisma.contact.findUnique({
    where: { id },
    include: {
      imports: {
        include: {
          import: {
            include: { campaign: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      campaigns: {
        include: {
          campaign: { select: { id: true, name: true } },
          events: { orderBy: { createdAt: "desc" }, take: 50 },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!item) throw new AppError(404, "Contato não encontrado");
  res.json(item);
});
contactRoutes.delete(
  "/:id/anonymize",
  requireRole("ADMIN"),
  async (req, res) => {
    const id = z.string().parse(req.params.id);
    const item = await prisma.contact.findUnique({ where: { id } });
    if (!item) throw new AppError(404, "Contato não encontrado");
    await prisma.contact.update({
      where: { id },
      data: {
        name: "Contato anonimizado",
        phone: `anon-${id}`,
        email: null,
        city: null,
        state: null,
        cpf: null,
        notes: null,
        customFields: {},
        anonymizedAt: new Date(),
      },
    });
    await audit({
      userId: req.user!.id,
      action: "DELETE_CONTACT",
      entity: "Contact",
      entityId: id,
      ip: req.ip,
      metadata: { mode: "anonymize" },
    });
    res.status(204).end();
  },
);
contactRoutes.post("/", async (req, res) => {
  const input = contactInput.parse(req.body);
  const phone = normalizeBrazilianPhone(input.phone);
  if (!phone.valid) throw new AppError(400, phone.reason!);
  const item = await prisma.contact.create({
    data: {
      ...input,
      email: input.email || null,
      customFields: input.customFields as Prisma.InputJsonValue,
      phone: phone.normalized!,
    },
  });
  res.status(201).json(item);
});
contactRoutes.patch("/:id", async (req, res) => {
  const id = z.string().parse(req.params.id);
  const input = contactInput.parse(req.body);
  const phone = normalizeBrazilianPhone(input.phone);
  if (!phone.valid) throw new AppError(400, phone.reason!);
  const item = await prisma.contact.update({
    where: { id },
    data: {
      ...input,
      phone: phone.normalized!,
      email: input.email || null,
      name: input.name || null,
      city: input.city || null,
      state: input.state || null,
      notes: input.notes || null,
      customFields: input.customFields as Prisma.InputJsonValue,
    },
  });
  await audit({
    userId: req.user!.id,
    action: "UPDATE_CONTACT",
    entity: "Contact",
    entityId: id,
    ip: req.ip,
  });
  res.json(item);
});
