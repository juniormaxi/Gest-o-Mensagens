import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const reportRoutes = Router();
reportRoutes.use(authenticate);

reportRoutes.get("/summary", async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);
  const [campaigns, campaignStatuses, users, userSent, daily] =
    await prisma.$transaction([
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.campaignContact.groupBy({
        by: ["campaignId", "status"],
        orderBy: [{ campaignId: "asc" }, { status: "asc" }],
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: { active: true },
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
        where: { eventType: "SENT" },
        orderBy: { userId: "asc" },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.$queryRaw<Array<{ day: Date; sent: bigint }>>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS sent
        FROM "message_events"
        WHERE "event_type" = 'SENT' AND "created_at" >= ${since}
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
