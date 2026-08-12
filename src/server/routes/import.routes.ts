import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { normalizeBrazilianPhone } from "../../shared/phone.js";
import { audit } from "../services/audit.service.js";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";
export const importRoutes = Router();
importRoutes.use(authenticate);
const importScope = (req: Request) =>
  req.user!.role === "ADMIN" ? {} : { campaign: { ownerId: req.user!.id } };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, /\.(csv|xlsx)$/i.test(file.originalname)),
});

importRoutes.get("/template", async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WhatsSender Web";
  const sheet = workbook.addWorksheet("Contatos");
  sheet.columns = [
    { header: "nome", key: "nome", width: 28 },
    { header: "email", key: "email", width: 30 },
    { header: "telefone", key: "telefone", width: 20 },
    { header: "cargo", key: "cargo", width: 24 },
    { header: "cidade", key: "cidade", width: 24 },
    { header: "obs", key: "obs", width: 38 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF147A55" },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = "A1:F1";
  const buffer = await workbook.xlsx.writeBuffer();
  res
    .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .attachment("modelo-contatos-whatssender.xlsx")
    .send(Buffer.from(buffer));
});

importRoutes.get("/", async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(req.query);
  const [items, total] = await prisma.$transaction([
    prisma.import.findMany({
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
      where: importScope(req),
      include: { campaign: { select: { id: true, name: true } } },
    }),
    prisma.import.count({ where: importScope(req) }),
  ]);
  res.json({ items, total, page: query.page, pageSize: query.pageSize });
});

importRoutes.delete("/:id", async (req, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const item = await prisma.import.findFirst({
    where: { id, ...importScope(req) },
    select: { id: true, fileName: true, campaignId: true, status: true },
  });
  if (!item) throw new AppError(404, "Importação não encontrada");
  if (item.status === "PROCESSING") {
    throw new AppError(
      409,
      "Não é possível excluir uma importação em processamento",
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.import.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "DELETE_IMPORT",
        entity: "Import",
        entityId: id,
        ip: req.ip,
        metadata: {
          fileName: item.fileName,
          campaignId: item.campaignId,
          preservedImportedContacts: true,
        },
      },
    });
  });
  res.status(204).end();
});

async function parseSpreadsheet(
  file: Express.Multer.File,
): Promise<Record<string, unknown>[]> {
  if (/\.csv$/i.test(file.originalname)) {
    return parseCsv(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, unknown>[];
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headers = (sheet.getRow(1).values as unknown[])
    .slice(1)
    .map((value) => String(value ?? "").trim());
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as unknown[];
    const item = Object.fromEntries(
      headers.map((header, index) => [header, values[index + 1] ?? ""]),
    );
    if (Object.values(item).some((value) => String(value).trim()))
      rows.push(item);
  });
  return rows;
}

importRoutes.post("/preview", upload.single("file"), async (req, res) => {
  if (!req.file) throw new AppError(400, "Arquivo CSV ou XLSX obrigatório");
  const campaignId = z.string().min(1).parse(req.body.campaignId);
  if (!(await prisma.campaign.count({ where: { id: campaignId, ...(req.user!.role === "ADMIN" ? {} : { ownerId: req.user!.id }) } })))
    throw new AppError(404, "Campanha não encontrada");
  let rows: Record<string, unknown>[];
  try {
    rows = await parseSpreadsheet(req.file);
  } catch {
    throw new AppError(400, "Não foi possível ler a planilha");
  }
  if (!rows.length) throw new AppError(400, "A planilha está vazia");
  if (rows.length > 100000)
    throw new AppError(400, "Limite de 100.000 linhas por importação");
  const item = await prisma.import.create({
    data: {
      campaignId,
      fileName: req.file.originalname,
      rows: {
        create: rows.map((rawData, index) => ({
          rowNumber: index + 2,
          rawData: rawData as object,
        })),
      },
    },
  });
  res.status(201).json({
    id: item.id,
    fileName: item.fileName,
    totalRows: rows.length,
    headers: Object.keys(rows[0]),
    sample: rows.slice(0, 10),
  });
});
const mappingSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  cpf: z.string().optional(),
  url: z.string().optional(),
  custom: z.record(z.string(), z.string()).default({}),
  duplicateAction: z.enum(["IGNORE", "UPDATE", "LINK"]).default("LINK"),
  ignoreInvalid: z.boolean().default(true),
});
importRoutes.post("/:id/validate", async (req, res) => {
  const mapping = mappingSchema.parse(req.body);
  const imp = await prisma.import.findFirst({ where: { id: req.params.id, ...importScope(req) } });
  if (!imp) throw new AppError(404, "Importação não encontrada");
  const rows = await prisma.importRow.findMany({
    where: { importId: imp.id },
    select: { rawData: true },
  });
  const seen = new Set<string>();
  const phones: string[] = [];
  let valid = 0,
    invalid = 0,
    missing = 0,
    duplicatesInFile = 0;
  for (const row of rows) {
    const raw = row.rawData as Record<string, unknown>;
    const value = raw[mapping.phone];
    if (!String(value ?? "").trim()) {
      missing++;
      continue;
    }
    const result = normalizeBrazilianPhone(value);
    if (!result.valid) {
      invalid++;
      continue;
    }
    if (seen.has(result.normalized!)) {
      duplicatesInFile++;
      continue;
    }
    seen.add(result.normalized!);
    phones.push(result.normalized!);
    valid++;
  }
  const duplicatesExisting = await prisma.contact.count({
    where: { phone: { in: phones } },
  });
  res.json({
    total: rows.length,
    valid,
    invalid,
    missing,
    duplicatesInFile,
    duplicatesExisting,
    importable: valid - duplicatesInFile,
  });
});
importRoutes.post("/:id/confirm", async (req, res) => {
  const mapping = mappingSchema.parse(req.body);
  const imp = await prisma.import.findFirst({
    where: { id: req.params.id, ...importScope(req) },
    include: { campaign: true },
  });
  if (!imp) throw new AppError(404, "Importação não encontrada");
  await prisma.import.update({
    where: { id: imp.id },
    data: { status: "PROCESSING", mapping },
  });
  const seen = new Set<string>();
  let imported = 0,
    skipped = 0,
    invalid = 0;
  for (let cursor = 0; ; cursor += 500) {
    const rows = await prisma.importRow.findMany({
      where: { importId: imp.id },
      orderBy: { rowNumber: "asc" },
      skip: cursor,
      take: 500,
    });
    if (!rows.length) break;
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const raw = row.rawData as Record<string, unknown>;
        const parsed = normalizeBrazilianPhone(raw[mapping.phone]);
        if (!parsed.valid || seen.has(parsed.normalized!)) {
          invalid += parsed.valid ? 0 : 1;
          skipped++;
          await tx.importRow.update({
            where: { id: row.id },
            data: { errors: [parsed.reason ?? "Duplicado na planilha"] },
          });
          continue;
        }
        seen.add(parsed.normalized!);
        const standard: Record<string, unknown> = {};
        for (const key of [
          "name",
          "email",
          "city",
          "state",
          "cpf",
          "url",
        ] as const) {
          const column = mapping[key];
          if (column) standard[key] = raw[column];
        }
        const custom = Object.fromEntries(
          Object.entries(mapping.custom).map(([variable, column]) => [
            variable,
            raw[column],
          ]),
        );
        const contactData = {
          name: String(standard.name || "") || null,
          email: String(standard.email || "") || null,
          city: String(standard.city || "") || null,
          state: String(standard.state || "") || null,
          cpf: String(standard.cpf || "") || null,
          customFields: custom as Prisma.InputJsonValue,
        };
        const existing = await tx.contact.findUnique({
          where: { phone: parsed.normalized! },
        });
        if (existing && mapping.duplicateAction === "IGNORE") {
          skipped++;
          continue;
        }
        const contact = existing
          ? mapping.duplicateAction === "UPDATE"
            ? await tx.contact.update({
                where: { id: existing.id },
                data: contactData,
              })
            : existing
          : await tx.contact.create({
              data: { phone: parsed.normalized!, ...contactData },
            });
        const campaignFields = {
          ...custom,
          ...(standard.url ? { url: standard.url } : {}),
        };
        await tx.campaignContact.upsert({
          where: {
            campaignId_contactId: {
              campaignId: imp.campaignId,
              contactId: contact.id,
            },
          },
          create: {
            campaignId: imp.campaignId,
            contactId: contact.id,
            customFields: campaignFields as Prisma.InputJsonValue,
          },
          update:
            mapping.duplicateAction === "UPDATE"
              ? { customFields: campaignFields as Prisma.InputJsonValue }
              : {},
        });
        await tx.contactImport.upsert({
          where: {
            contactId_importId: { contactId: contact.id, importId: imp.id },
          },
          create: { contactId: contact.id, importId: imp.id },
          update: {},
        });
        await tx.importRow.update({
          where: { id: row.id },
          data: {
            imported: true,
            normalizedData: {
              phone: parsed.normalized!,
              ...standard,
              ...custom,
            },
          },
        });
        imported++;
      }
    });
  }
  const summary = { total: seen.size + skipped, imported, skipped, invalid };
  await prisma.import.update({
    where: { id: imp.id },
    data: { status: "COMPLETED", completedAt: new Date(), summary },
  });
  await audit({
    userId: req.user!.id,
    action: "IMPORT_CONTACTS",
    entity: "Import",
    entityId: imp.id,
    ip: req.ip,
    metadata: summary,
  });
  res.json(summary);
});
