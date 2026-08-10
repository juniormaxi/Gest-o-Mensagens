import { Router } from "express";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { audit } from "../services/audit.service.js";

export const userRoutes = Router();
userRoutes.use(authenticate, requireRole("ADMIN"));

const baseInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  role: z.nativeEnum(UserRole),
  active: z.boolean().default(true),
});
const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { campaigns: true, events: true } },
} as const;

userRoutes.get("/", async (_req, res) => {
  const items = await prisma.user.findMany({
    select: safeSelect,
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  res.json({ items, total: items.length });
});

userRoutes.post("/", async (req, res) => {
  const input = baseInput
    .extend({ password: z.string().min(8).max(128) })
    .parse(req.body);
  if (await prisma.user.count({ where: { email: input.email } }))
    throw new AppError(409, "Já existe um usuário com este e-mail");
  const item = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      passwordHash: await bcrypt.hash(input.password, 12),
    },
    select: safeSelect,
  });
  await audit({
    userId: req.user!.id,
    action: "CREATE_USER",
    entity: "User",
    entityId: item.id,
    ip: req.ip,
    metadata: { role: item.role },
  });
  res.status(201).json(item);
});

userRoutes.patch("/:id", async (req, res) => {
  const id = z.string().parse(req.params.id);
  const input = baseInput
    .extend({
      password: z.string().min(8).max(128).or(z.literal("")).optional(),
    })
    .parse(req.body);
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new AppError(404, "Usuário não encontrado");
  if (id === req.user!.id && !input.active)
    throw new AppError(400, "Você não pode desativar sua própria conta");
  if (id === req.user!.id && input.role !== "ADMIN")
    throw new AppError(
      400,
      "Você não pode remover seu próprio acesso administrativo",
    );
  if (
    await prisma.user.count({
      where: { email: input.email, id: { not: id } },
    })
  )
    throw new AppError(409, "Já existe um usuário com este e-mail");
  const item = await prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      ...(input.password
        ? { passwordHash: await bcrypt.hash(input.password, 12) }
        : {}),
    },
    select: safeSelect,
  });
  await audit({
    userId: req.user!.id,
    action: "UPDATE_USER",
    entity: "User",
    entityId: item.id,
    ip: req.ip,
    metadata: {
      role: item.role,
      active: item.active,
      passwordChanged: Boolean(input.password),
    },
  });
  res.json(item);
});
