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
      left: number;
      right: number;
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
    const totalUsers = await prisma.user.count();

    // Get theme mode distribution
    const lightThemeCount = await prisma.user.count({
      where: {
        themeMode: "light",
      },
    });

    const darkThemeCount = await prisma.user.count({
      where: {
        themeMode: "dark",
      },
    });

    // Get menu position distribution
    const leftMenuCount = await prisma.user.count({
      where: {
        menuPosition: "left",
      },
    });

    const rightMenuCount = await prisma.user.count({
      where: {
        menuPosition: "right",
      },
    });

    // Get admin ratio
    const adminCount = await prisma.user.count({
      where: {
        isAdmin: true,
      },
    });

    const regularCount = await prisma.user.count({
      where: {
        isAdmin: false,
      },
    });

    // Get password stats
    const withPasswordCount = await prisma.user.count({
      where: {
        passwordHash: {
          not: null,
        },
      },
    });

    const withoutPasswordCount = await prisma.user.count({
      where: {
        passwordHash: null,
      },
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
    const totalUrlGroups = await prisma.urlGroup.count();

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

    // Get total URLs count
    const totalUrls = await prisma.url.count();

    // Get mobile vs desktop URLs count
    const urlsWithMobile = await prisma.url.count({
      where: {
        urlMobile: {
          not: null,
        },
      },
    });

    const urlsDesktopOnly = await prisma.url.count({
      where: {
        urlMobile: null,
      },
    });

    // Get orphaned URLs count (not in any group)
    const orphanedUrlsCount = await prisma.url.count({
      where: {
        urlGroups: {
          none: {},
        },
      },
    });

    // Get most accessed URLs using standard Prisma queries
    // First, get all users with lastActiveUrl
    const usersWithLastActiveUrl = await prisma.user.findMany({
      where: {
        lastActiveUrl: {
          not: null,
        },
      },
      select: {
        lastActiveUrl: true,
      },
    });

    // Count occurrences of each URL
    const urlCounts = new Map();
    for (const user of usersWithLastActiveUrl) {
      if (user.lastActiveUrl) {
        const count = urlCounts.get(user.lastActiveUrl) || 0;
        urlCounts.set(user.lastActiveUrl, count + 1);
      }
    }

    // Convert to array and sort by count
    const sortedUrls = Array.from(urlCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Fetch the URL details for these most accessed URLs
    const mostAccessedUrls = [];
    for (const [url, count] of sortedUrls) {
      const urlRecord = await prisma.url.findFirst({
        where: {
          url: url,
        },
        select: {
          id: true,
          url: true,
          title: true,
        },
      });

      if (urlRecord) {
        mostAccessedUrls.push({
          id: urlRecord.id,
          url: urlRecord.url,
          title: urlRecord.title,
          count: count,
        });
      }
    }

    // Calculate average URLs per group
    const averageUrlsPerGroup = totalUrlGroups > 0 ? totalUrls / totalUrlGroups : 0;

    const response: StatisticsResponse = {
      system: {
        users: {
          total: totalUsers,
          active: activeUsers,
          withPassword: withPasswordCount,
          withoutPassword: withoutPasswordCount,
          adminRatio: {
            admin: adminCount,
            regular: regularCount,
          },
        },
        urlGroups: {
          total: totalUrlGroups,
          unused: unusedGroups,
          averageUrlsPerGroup: Number(averageUrlsPerGroup.toFixed(2)),
        },
        urls: {
          total: totalUrls,
          withMobileVersion: urlsWithMobile,
          desktopOnly: urlsDesktopOnly,
          orphaned: orphanedUrlsCount,
        },
      },
      userPreferences: {
        themeDistribution: {
          light: lightThemeCount,
          dark: darkThemeCount,
        },
        menuPositionDistribution: {
          left: leftMenuCount,
          right: rightMenuCount,
        },
      },
      activity: {
        recentlyActive: recentUsers.map((user) => ({
          ...user,
          updatedAt: user.updatedAt.toISOString(),
        })),
        mostAccessedUrls: mostAccessedUrls,
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
