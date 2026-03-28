/**
 * Auto-Archive Utility
 * 
 * Archives overtime posts that are older than 5 days and cleans up associated records
 */

import { prisma } from './prisma';

/**
 * Archive overtime posts older than 5 days and clean up associated records
 * This is safe and idempotent - can be run multiple times
 */
export async function autoArchiveOldOvertimePosts(): Promise<{
  archivedCount: number;
  deletedApplications: number;
  deletedInboxItems: number;
}> {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  // Find overtime posts to archive
  const postsToArchive = await prisma.overtimeRequest.findMany({
    where: {
      date: {
        lt: fiveDaysAgo,
      },
      archived: false,
    },
    select: {
      id: true,
    },
  });
  
  if (postsToArchive.length === 0) {
    return {
      archivedCount: 0,
      deletedApplications: 0,
      deletedInboxItems: 0,
    };
  }
  
  const postIds = postsToArchive.map(p => p.id);
  
  // Delete inbox items first (they reference applications)
  const deletedInboxItems = await prisma.inboxItem.deleteMany({
    where: {
      postId: {
        in: postIds,
      },
    },
  });
  
  // Delete pay segments (they reference applications)
  await prisma.overtimePaySegment.deleteMany({
    where: {
      application: {
        overtimeId: {
          in: postIds,
        },
      },
    },
  });
  
  // Delete applications
  const deletedApplications = await prisma.overtimeApplication.deleteMany({
    where: {
      overtimeId: {
        in: postIds,
      },
    },
  });
  
  // Mark posts as archived
  const archivedResult = await prisma.overtimeRequest.updateMany({
    where: {
      id: {
        in: postIds,
      },
    },
    data: {
      archived: true,
      status: 'ARCHIVED',
    },
  });
  
  return {
    archivedCount: archivedResult.count,
    deletedApplications: deletedApplications.count,
    deletedInboxItems: deletedInboxItems.count,
  };
}
