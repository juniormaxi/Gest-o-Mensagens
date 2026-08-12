import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate);
dashboardRoutes.get("/", async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);
  const campaignWhere = req.user!.role === "ADMIN" ? {} : { ownerId: req.user!.id };
  const relatedCampaign = req.user!.role === "ADMIN" ? {} : { campaign: campaignWhere };
  const [campaigns, contacts, statuses, sentToday, sentWeek, recent] =
    await prisma.$transaction([
      prisma.campaign.count({ where: campaignWhere }),
      prisma.contact.count({ where: req.user!.role === "ADMIN" ? {} : { campaigns: { some: relatedCampaign } } }),
      prisma.campaignContact.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        where: relatedCampaign,
        _count: true,
      }),
      prisma.messageEvent.count({
        where: {
          eventType: "SENT",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          ...relatedCampaign,
        },
      }),
      prisma.messageEvent.count({
        where: { eventType: "SENT", createdAt: { gte: since }, ...relatedCampaign },
      }),
      prisma.campaign.findMany({
        take: 5,
        where: campaignWhere,
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
