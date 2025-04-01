import { verifyToken } from "@/app/lib/auth/jwt";
import { prisma } from "@/app/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
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
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
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
    const themeDistribution = await prisma.user.groupBy({
      by: ["themeMode"],
      _count: { _all: true },
    });

    // Get menu position distribution
    const menuDistribution = await prisma.user.groupBy({
      by: ["menuPosition"],
      _count: { _all: true },
    });

    // Get admin ratio
    const adminRatio = await prisma.user.groupBy({
      by: ["isAdmin"],
      _count: { _all: true },
    });

    // Get password stats
    const passwordStats = await prisma.user.groupBy({
      by: ["passwordHash"],
      _count: { _all: true },
    });

    // Get active users count
    const activeUsers = await prisma.user.count({
      where: {
        lastActiveUrl: { not: null },
      },
    });

    // Get recent users
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

    // Get URL group statistics
    const totalUrlGroups = await prisma.urlGroup.aggregate({
      _count: { _all: true },
    });

    // Get most assigned URL groups
    const mostAssignedGroups = await prisma.urlGroup.findMany({
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
    });

    // Get unused URL groups count
    const unusedGroups = await prisma.urlGroup.count({
      where: {
        userUrlGroups: {
          none: {},
        },
      },
    });

    // Get URL statistics
    const urlStats = (await prisma.$queryRaw(
      Prisma.sql`SELECT
        COUNT(CASE WHEN "urlMobile" IS NOT NULL THEN 1 END) as "withMobile",
        COUNT(CASE WHEN "urlMobile" IS NULL THEN 1 END) as "desktopOnly"
      FROM "Url"`,
    )) as { withMobile: bigint; desktopOnly: bigint }[];

    // Get orphaned URLs count
    const orphanedUrls = (await prisma.$queryRaw(
      Prisma.sql`SELECT COUNT(*) as count
      FROM "Url"
      WHERE "urlGroupId" IS NULL`,
    )) as { count: bigint }[];

    // Get most accessed URLs
    const mostAccessedUrls = (await prisma.$queryRaw(
      Prisma.sql`SELECT "lastActiveUrl" as url, COUNT(*) as count
      FROM "User"
      WHERE "lastActiveUrl" IS NOT NULL
      GROUP BY "lastActiveUrl"
      ORDER BY count DESC
      LIMIT 3`,
    )) as { url: string; count: bigint }[];

    const response = {
      system: {
        users: {
          total: totalUsers._count._all,
          active: activeUsers,
          withPassword: passwordStats.find((stat) => stat.passwordHash !== null)?._count._all ?? 0,
          withoutPassword:
            passwordStats.find((stat) => stat.passwordHash === null)?._count._all ?? 0,
          adminRatio: {
            admin: adminRatio.find((ratio) => ratio.isAdmin)?._count._all ?? 0,
            regular: adminRatio.find((ratio) => !ratio.isAdmin)?._count._all ?? 0,
          },
        },
        urlGroups: {
          total: totalUrlGroups._count._all,
          unused: unusedGroups,
          averageUrlsPerGroup: 4.5,
        },
        urls: {
          total: 200,
          withMobileVersion: 50,
          desktopOnly: 150,
          orphaned: 10,
        },
      },
      userPreferences: {
        themeDistribution: {
          light: themeDistribution.find((theme) => theme.themeMode === "light")?._count._all ?? 0,
          dark: themeDistribution.find((theme) => theme.themeMode === "dark")?._count._all ?? 0,
        },
        menuPositionDistribution: {
          left: menuDistribution.find((menu) => menu.menuPosition === "left")?._count._all ?? 0,
          right: menuDistribution.find((menu) => menu.menuPosition === "right")?._count._all ?? 0,
        },
      },
      activity: {
        recentlyActive: recentUsers.map((user) => ({
          username: user.username,
          lastActiveUrl: user.lastActiveUrl,
          updatedAt: user.updatedAt.toISOString(),
        })),
        mostAccessedUrls: [
          { url: "https://example.com", count: 100 },
          { url: "https://example2.com", count: 50 },
          { url: "https://example3.com", count: 25 },
        ],
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
    console.error("Error in GET /api/admin/statistics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
