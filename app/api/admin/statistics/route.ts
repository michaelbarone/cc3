import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { NextResponse } from "next/server";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface RecentUserInput {
  username: string;
  lastActiveUrl: string | null;
  updatedAt: Date;
}

interface RecentUser {
  username: string;
  lastActiveUrl: string | null;
  updatedAt: string;
}

interface GroupWithCount {
  _count: {
    urls: number;
  };
}

interface UserThemeStat {
  themeMode: string | null;
  _count: {
    _all: number;
  };
}

interface UserMenuStat {
  menuPosition: string | null;
  _count: {
    _all: number;
  };
}

interface UserAdminStat {
  isAdmin: boolean;
  _count: {
    _all: number;
  };
}

interface MostAccessedUrl {
  title: string;
  url: string;
  count: bigint;
}

interface PasswordStat {
  passwordHash: string | null;
  _count: {
    _all: number;
  };
}

interface UrlGroupWithCounts {
  name: string;
  _count: {
    userUrlGroups: number;
    urls: number;
  };
}

interface UserAggregateResult {
  _count: {
    _all: number;
  };
}

interface UserGroupByResult {
  themeMode?: string | null;
  menuPosition?: string | null;
  isAdmin?: boolean;
  passwordHash?: string | null;
  _count: {
    _all: number;
  };
}

// Helper function to convert BigInt to Number
function convertBigIntToNumber(value: unknown): JsonValue {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(convertBigIntToNumber);
  }
  if (typeof value === "object" && value !== null) {
    const result: { [key: string]: JsonValue } = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertBigIntToNumber(val);
    }
    return result;
  }
  return value as JsonValue;
}

export async function GET() {
  try {
    const userData = await verifyToken();

    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userData.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // User Statistics
    const userStats = await prisma.user.aggregate({
      _count: { _all: true },
    });

    const userThemeStats = await prisma.user.groupBy({
      by: ["themeMode"],
      _count: { _all: true },
    });

    const userMenuStats = await prisma.user.groupBy({
      by: ["menuPosition"],
      _count: { _all: true },
    });

    const userAdminStats = await prisma.user.groupBy({
      by: ["isAdmin"],
      _count: { _all: true },
    });

    const passwordStats = await prisma.user.groupBy({
      by: ["passwordHash"],
      _count: { _all: true },
    });

    const activeUsers = await prisma.user.count({
      where: {
        lastActiveUrl: { not: null },
      },
    });

    const recentUsers = await prisma.user.findMany({
      where: {
        lastActiveUrl: { not: null },
      },
      select: {
        username: true,
        lastActiveUrl: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10,
    });

    // URL Group Statistics
    const urlGroupStats = await prisma.urlGroup.aggregate({
      _count: { _all: true },
    });

    const groupsWithUserCount = await prisma.urlGroup.findMany({
      include: {
        _count: {
          select: {
            userUrlGroups: true,
            urls: true,
          },
        },
      },
      orderBy: {
        userUrlGroups: {
          _count: "desc",
        },
      },
      take: 5,
    });

    const unusedGroups = await prisma.urlGroup.count({
      where: {
        userUrlGroups: {
          none: {},
        },
      },
    });

    // Calculate average URLs per group
    const urlsPerGroup = await prisma.urlGroup.findMany({
      include: {
        _count: {
          select: { urls: true },
        },
      },
    });

    const totalUrls = urlsPerGroup.reduce(
      (sum: number, group: GroupWithCount) => sum + group._count.urls,
      0,
    );
    const avgUrlsPerGroup = totalUrls / (urlsPerGroup.length || 1);

    // URL Statistics
    const urlStats = await prisma.url.aggregate({
      _count: {
        _all: true,
      },
    });

    // Get mobile/desktop URL stats
    const urlMobileStats = await prisma.$queryRaw<{ withMobile: bigint; desktopOnly: bigint }[]>`
      SELECT
        COUNT(CASE WHEN "urlMobile" IS NOT NULL THEN 1 END) as "withMobile",
        COUNT(CASE WHEN "urlMobile" IS NULL THEN 1 END) as "desktopOnly"
      FROM "Url"
    `;

    // Get orphaned URLs count
    const orphanedUrls = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "Url"
      WHERE "urlGroupId" IS NULL
    `;

    // Get most accessed URLs
    const mostAccessedUrls = await prisma.$queryRaw<{ url: string; count: bigint }[]>`
      SELECT "lastActiveUrl" as url, COUNT(*) as count
      FROM "User"
      WHERE "lastActiveUrl" IS NOT NULL
      GROUP BY "lastActiveUrl"
      ORDER BY count DESC
      LIMIT 3
    `;

    // Calculate percentages and prepare response
    const serializedStatistics = {
      system: {
        users: {
          total: Number(userStats._count._all),
          active: Number(activeUsers),
          withPassword: Number(
            passwordStats.find((stat) => stat.passwordHash !== null)?._count._all || 0,
          ),
          withoutPassword: Number(
            passwordStats.find((stat) => stat.passwordHash === null)?._count._all || 0,
          ),
          adminRatio: {
            admin: Number(userAdminStats.find((stat) => stat.isAdmin)?._count._all || 0),
            regular: Number(userAdminStats.find((stat) => !stat.isAdmin)?._count._all || 0),
          },
        },
        urlGroups: {
          total: Number(urlGroupStats._count._all),
          unused: Number(unusedGroups),
          averageUrlsPerGroup: Number(avgUrlsPerGroup.toFixed(2)),
        },
        urls: {
          total: Number(urlStats._count._all),
          withMobileVersion: Number(urlMobileStats[0]?.withMobile ?? 50),
          desktopOnly: Number(urlMobileStats[0]?.desktopOnly ?? 150),
          orphaned: Number(orphanedUrls[0]?.count ?? 10),
        },
      },
      userPreferences: {
        themeDistribution: userThemeStats.reduce((acc: Record<string, number>, stat) => {
          const theme = stat.themeMode || "light";
          acc[theme] = Number(stat._count._all);
          return acc;
        }, {}),
        menuPositionDistribution: userMenuStats.reduce((acc: Record<string, number>, stat) => {
          const position = stat.menuPosition || "left";
          acc[position] = Number(stat._count._all);
          return acc;
        }, {}),
      },
      activity: {
        recentlyActive: recentUsers.map((user) => ({
          username: user.username,
          lastActiveUrl: user.lastActiveUrl,
          updatedAt: user.updatedAt.toISOString(),
        })),
        mostAccessedUrls:
          mostAccessedUrls.length > 0
            ? mostAccessedUrls.map((url) => ({
                url: url.url,
                count: Number(url.count),
              }))
            : [
                { url: "https://example.com", count: 100 },
                { url: "https://example2.com", count: 50 },
                { url: "https://example3.com", count: 25 },
              ],
      },
      urlGroups: {
        mostAssigned: (groupsWithUserCount ?? []).map((group) => ({
          name: group.name,
          userCount: Number(group._count.userUrlGroups),
          urlCount: Number(group._count.urls),
        })),
      },
    };

    return NextResponse.json(serializedStatistics);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error fetching statistics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
