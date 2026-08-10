import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);
dashboardRoutes.get("/", async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const [campaigns, contacts, statuses, sentToday, sentWeek, recent] =
    await prisma.$transaction([
      prisma.campaign.count(),
      prisma.contact.count(),
      prisma.campaignContact.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: true,
      }),
      prisma.messageEvent.count({
        where: {
          eventType: "SENT",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.messageEvent.count({
        where: { eventType: "SENT", createdAt: { gte: since } },
      }),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { contacts: true } } },
      }),
    ]);
  res.json({
    campaigns,
    contacts,
    statuses: Object.fromEntries(statuses.map((s) => [s.status, s._count])),
    sentToday,
    sentWeek,
    recent,
  });
});
