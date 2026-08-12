import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const reportRoutes = Router();
reportRoutes.use(authenticate);

reportRoutes.get("/summary", async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const campaignWhere = _req.user!.role === "ADMIN" ? {} : { ownerId: _req.user!.id };
  const relatedCampaign = _req.user!.role === "ADMIN" ? {} : { campaign: campaignWhere };
  const [campaigns, campaignStatuses, users, userSent, daily] =
    await prisma.$transaction([
      prisma.campaign.findMany({
        where: campaignWhere,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["campaignId", "status"],
        orderBy: [{ campaignId: "asc" }, { status: "asc" }],
        _count: { _all: true },
        where: relatedCampaign,
      }),
      prisma.user.findMany({
        where: { active: true, ...(_req.user!.role === "ADMIN" ? {} : { id: _req.user!.id }) },
        select: {
          id: true,
          name: true,
          role: true,
          _count: { select: { campaigns: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.messageEvent.groupBy({
        by: ["userId"],
        where: { eventType: "SENT", ...relatedCampaign },
        orderBy: { userId: "asc" },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      _req.user!.role === "ADMIN"
        ? prisma.$queryRaw<Array<{ day: Date; sent: bigint }>>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS sent
        FROM "message_events"
        WHERE "event_type" = 'SENT' AND "created_at" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC
      `
        : prisma.$queryRaw<Array<{ day: Date; sent: bigint }>>`
        SELECT date_trunc('day', e."created_at") AS day, COUNT(*)::bigint AS sent
        FROM "message_events" e
        JOIN "campaigns" c ON c."id" = e."campaign_id"
        WHERE e."event_type" = 'SENT' AND e."created_at" >= ${since}
          AND c."owner_id" = ${_req.user!.id}
        GROUP BY 1 ORDER BY 1 ASC
      `,
    ]);
  const countsByCampaign = new Map<string, Record<string, number>>();
  for (const row of campaignStatuses) {
    const counts = countsByCampaign.get(row.campaignId) ?? {};
    counts[row.status] = (row._count as { _all?: number } | undefined)?._all ?? 0;
    countsByCampaign.set(row.campaignId, counts);
  }
  const userStats = new Map(userSent.map((row) => [row.userId, row]));
  res.json({
    campaigns: campaigns.map((campaign) => {
      const counts = countsByCampaign.get(campaign.id) ?? {};
      const total = Object.values(counts).reduce(
        (sum, value) => sum + value,
        0,
      );
      const sent = counts.SENT ?? 0;
      return {
        ...campaign,
        total,
        sent,
        pending: counts.PENDING ?? 0,
        noWhatsapp: counts.NO_WHATSAPP ?? 0,
        errors: counts.ERROR ?? 0,
        skipped: counts.SKIPPED ?? 0,
        percentage: total ? Math.round((sent / total) * 1000) / 10 : 0,
      };
    }),
    users: users.map((user) => {
      const stats = userStats.get(user.id);
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        campaigns: user._count.campaigns,
        sent: (stats?._count as { _all?: number } | undefined)?._all ?? 0,
        lastActivity: stats?._max?.createdAt ?? null,
      };
    }),
    daily: daily.map((row) => ({ date: row.day, sent: Number(row.sent) })),
  });
});
