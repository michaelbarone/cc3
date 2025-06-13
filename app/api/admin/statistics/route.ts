import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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
  id: string;
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

interface StatisticsResponse {
  system: {
    users: {
      total: number;
      active: number;
      withPassword: number;
      withoutPassword: number;
      adminRatio: {
        admin: number;
        regular: number;
      };
    };
    urlGroups: {
      total: number;
      unused: number;
      averageUrlsPerGroup: number;
    };
    urls: {
      total: number;
      withMobileVersion: number;
      desktopOnly: number;
      orphaned: number;
    };
  };
  userPreferences: {
    themeDistribution: {
      light: number;
      dark: number;
    };
    menuPositionDistribution: {
      side: number;
      top: number;
    };
  };
  activity: {
    recentlyActive: RecentUser[];
    mostAccessedUrls: Array<{
      id: string;
      title: string;
      url: string;
      count: number;
    }>;
  };
  urlGroups: {
    mostAssigned: Array<{
      name: string;
      userCount: number;
      urlCount: number;
    }>;
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

export async function GET(
  request: NextRequest,
): Promise<NextResponse<StatisticsResponse | { error: string }>> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;

    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(authToken);
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: user ? "Forbidden" : "Unauthorized" },
        { status: user ? 403 : 401 },
      );
    }

    // Get total users count
    const totalUsers = await prisma.user.aggregate({
      _count: { _all: true },
    });

    // Get theme mode distribution
    const themeDistribution = (await prisma.user.groupBy({
      by: ["themeMode"],
      _count: { _all: true },
    })) as unknown as UserThemeStat[];

    // Get menu position distribution
    const menuDistribution = (await prisma.user.groupBy({
      by: ["menuPosition"],
      _count: { _all: true },
    })) as unknown as UserMenuStat[];

    // Get admin ratio
    const adminRatio = (await prisma.user.groupBy({
      by: ["isAdmin"],
      _count: { _all: true },
    })) as unknown as UserAdminStat[];

    // Get password stats
    const passwordStats = (await prisma.user.groupBy({
      by: ["passwordHash"],
      _count: { _all: true },
    })) as unknown as PasswordStat[];

    // Get active users count
    const activeUsers = await prisma.user.count({
      where: {
        lastActiveUrl: { not: null },
      },
    });

    // Get recent users
    const recentUsers = (await prisma.user.findMany({
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
    })) as RecentUserInput[];

    // Get URL group statistics
    const totalUrlGroups = await prisma.urlGroup.aggregate({
      _count: { _all: true },
    });

    // Get most assigned URL groups
    const mostAssignedGroups = (await prisma.urlGroup.findMany({
      select: {
        name: true,
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
    })) as UrlGroupWithCounts[];

    // Get unused URL groups count
    const unusedGroups = await prisma.urlGroup.count({
      where: {
        userUrlGroups: {
          none: {},
        },
      },
    });

    // Get total URLs count
    const totalUrls = await prisma.url.aggregate({
      _count: { _all: true },
    });

    // Get mobile vs desktop URLs count
    const mobileStats = await prisma.$queryRaw<[{ withMobile: bigint; desktopOnly: bigint }]>`
      SELECT
        COUNT(*) FILTER (WHERE "urlMobile" IS NOT NULL) as "withMobile",
        COUNT(*) FILTER (WHERE "urlMobile" IS NULL) as "desktopOnly"
      FROM "Url"
    `;

    // Get orphaned URLs count (not in any group)
    const orphanedUrls = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Url" u
      WHERE NOT EXISTS (
        SELECT 1 FROM "urls_in_groups" uig WHERE uig."urlId" = u.id
      )
    `;

    // Get most accessed URLs
    const mostAccessedUrls = await prisma.$queryRaw<MostAccessedUrl[]>`
      SELECT u.url, u.title, COUNT(*) as count
      FROM "User" usr
      JOIN "Url" u ON usr."lastActiveUrl" = u.url
      GROUP BY u.url, u.title
      ORDER BY count DESC
      LIMIT 5
    `;

    // Calculate average URLs per group
    const averageUrlsPerGroup =
      totalUrlGroups._count._all > 0 ? totalUrls._count._all / totalUrlGroups._count._all : 0;

    // Process theme distribution
    const themeStats = {
      light: themeDistribution.find((t) => t.themeMode === "light")?._count._all ?? 0,
      dark: themeDistribution.find((t) => t.themeMode === "dark")?._count._all ?? 0,
    };

    // Process menu distribution
    const menuStats = {
      side: menuDistribution.find((m) => m.menuPosition === "side")?._count._all ?? 0,
      top: menuDistribution.find((m) => m.menuPosition === "top")?._count._all ?? 0,
    };

    // Process admin ratio
    const adminStats = {
      admin: adminRatio.find((a) => a.isAdmin)?._count._all ?? 0,
      regular: adminRatio.find((a) => !a.isAdmin)?._count._all ?? 0,
    };

    // Process password stats
    const passwordCounts = {
      withPassword: passwordStats.find((p) => p.passwordHash !== null)?._count._all ?? 0,
      withoutPassword: passwordStats.find((p) => p.passwordHash === null)?._count._all ?? 0,
    };

    const response: StatisticsResponse = {
      system: {
        users: {
          total: totalUsers._count._all,
          active: activeUsers,
          withPassword: passwordCounts.withPassword,
          withoutPassword: passwordCounts.withoutPassword,
          adminRatio: adminStats,
        },
        urlGroups: {
          total: totalUrlGroups._count._all,
          unused: unusedGroups,
          averageUrlsPerGroup: Number(averageUrlsPerGroup.toFixed(2)),
        },
        urls: {
          total: totalUrls._count._all,
          withMobileVersion: Number(mobileStats[0].withMobile),
          desktopOnly: Number(mobileStats[0].desktopOnly),
          orphaned: Number(orphanedUrls[0].count),
        },
      },
      userPreferences: {
        themeDistribution: themeStats,
        menuPositionDistribution: menuStats,
      },
      activity: {
        recentlyActive: recentUsers.map((user) => ({
          ...user,
          updatedAt: user.updatedAt.toISOString(),
        })),
        mostAccessedUrls: mostAccessedUrls.map((url: MostAccessedUrl) => ({
          id: url.url,
          title: url.title,
          url: url.url,
          count: Number(url.count),
        })),
      },
      urlGroups: {
        mostAssigned: mostAssignedGroups.map((group) => ({
          name: group.name,
          userCount: group._count.userUrlGroups,
          urlCount: group._count.urls,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
  }
}
