import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db/prisma';
import { verifyToken } from '@/app/lib/auth/jwt';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Helper function to convert BigInt to Number
function convertBigIntToNumber(value: unknown): JsonValue {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(convertBigIntToNumber);
  }
  if (typeof value === 'object' && value !== null) {
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

    if (!userData || !userData.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // User Statistics
    const userStats = await prisma.user.aggregate({
      _count: {
        _all: true,
      }
    });

    const userThemeStats = await prisma.user.groupBy({
      by: ['themeMode'],
      _count: true
    });

    const userMenuStats = await prisma.user.groupBy({
      by: ['menuPosition'],
      _count: true
    });

    const userAdminStats = await prisma.user.groupBy({
      by: ['isAdmin'],
      _count: true
    });

    const passwordStats = await prisma.user.groupBy({
      by: ['passwordHash'],
      _count: true
    });

    const activeUsers = await prisma.user.count({
      where: {
        lastActiveUrl: { not: null }
      }
    });

    const recentUsers = await prisma.user.findMany({
      where: {
        lastActiveUrl: { not: null }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      select: {
        username: true,
        lastActiveUrl: true,
        updatedAt: true
      }
    }).then(users => users.map(user => ({
      ...user,
      updatedAt: user.updatedAt.toISOString()
    })));

    // URL Group Statistics
    const urlGroupStats = await prisma.urlGroup.aggregate({
      _count: {
        _all: true,
      }
    });

    const groupsWithUserCount = await prisma.urlGroup.findMany({
      include: {
        _count: {
          select: {
            userUrlGroups: true,
            urls: true
          }
        }
      },
      orderBy: {
        userUrlGroups: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const unusedGroups = await prisma.urlGroup.count({
      where: {
        userUrlGroups: {
          none: {}
        }
      }
    });

    // Calculate average URLs per group
    const urlsPerGroup = await prisma.urlGroup.findMany({
      include: {
        _count: {
          select: { urls: true }
        }
      }
    });

    const totalUrls = urlsPerGroup.reduce((sum, group) => sum + group._count.urls, 0);
    const avgUrlsPerGroup = urlsPerGroup.length > 0
      ? totalUrls / urlsPerGroup.length
      : 0;

    // URL Statistics
    const urlStats = await prisma.url.aggregate({
      _count: {
        _all: true
      }
    });

    const urlMobileStats = await prisma.$queryRaw<Array<{ withMobile: bigint; desktopOnly: bigint }>>`
      SELECT
        COUNT(CASE WHEN "urlMobile" IS NOT NULL THEN 1 END) as "withMobile",
        COUNT(CASE WHEN "urlMobile" IS NULL THEN 1 END) as "desktopOnly"
      FROM "Url"
    `;

    const orphanedUrlsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "Url"
      WHERE "urlGroupId" IS NULL
    `;
    const orphanedUrls = orphanedUrlsResult[0].count;

    const mostAccessedUrls = await prisma.$queryRaw<Array<{ title: string; url: string; count: bigint }>>`
      SELECT u.title, u.url, COUNT(*) as count
      FROM "User" usr
      JOIN "Url" u ON u.id = usr."lastActiveUrl"
      WHERE usr."lastActiveUrl" IS NOT NULL
      GROUP BY u.id, u.title, u.url
      ORDER BY count DESC
      LIMIT 5
    `;

    // Calculate percentages and prepare response
    const statistics = {
      system: {
        users: {
          total: Number(userStats._count._all),
          active: Number(activeUsers),
          withPassword: Number(passwordStats.find(stat => stat.passwordHash !== null)?._count || 0),
          withoutPassword: Number(passwordStats.find(stat => stat.passwordHash === null)?._count || 0),
          adminRatio: userAdminStats.reduce((acc, stat) => ({
            ...acc,
            [stat.isAdmin ? 'admin' : 'regular']: Number(stat._count)
          }), { admin: 0, regular: 0 })
        },
        urlGroups: {
          total: Number(urlGroupStats._count._all),
          unused: Number(unusedGroups),
          averageUrlsPerGroup: Number(avgUrlsPerGroup.toFixed(2))
        },
        urls: {
          total: Number(urlStats._count._all),
          withMobileVersion: Number(urlMobileStats[0].withMobile),
          desktopOnly: Number(urlMobileStats[0].desktopOnly),
          orphaned: Number(orphanedUrls)
        }
      },
      userPreferences: {
        themeDistribution: Object.fromEntries(
          userThemeStats.map(stat => [
            stat.themeMode || 'default',
            Number(stat._count)
          ])
        ),
        menuPositionDistribution: Object.fromEntries(
          userMenuStats.map(stat => [
            stat.menuPosition || 'side',
            Number(stat._count)
          ])
        )
      },
      activity: {
        recentlyActive: recentUsers,
        mostAccessedUrls: mostAccessedUrls.map(url => ({
          title: url.title,
          url: url.url,
          count: Number(url.count)
        }))
      },
      urlGroups: {
        mostAssigned: groupsWithUserCount.map(group => ({
          name: group.name,
          userCount: Number(group._count.userUrlGroups),
          urlCount: Number(group._count.urls)
        }))
      }
    };

    // Convert any remaining BigInt values to numbers
    const serializedStatistics = convertBigIntToNumber(statistics);

    return NextResponse.json(serializedStatistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
