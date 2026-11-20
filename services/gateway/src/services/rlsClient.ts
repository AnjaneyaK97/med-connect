import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface UserContext {
  userId: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export class RlsClient {
  /**
   * Executes a database query within an RLS-scoped transaction.
   * Sets PostgreSQL session variables `app.current_user_id` and `app.current_user_role`.
   */
  public static async withContext<T>(
    context: UserContext,
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      // Set PostgreSQL session settings for the current transaction
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_user_id = '${context.userId.replace(/'/g, "''")}';`
      );
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_user_role = '${context.role.replace(/'/g, "''")}';`
      );

      return fn(tx);
    });
  }

  /**
   * Helper generating the SQL statement to set RLS context for raw queries
   */
  public static getContextSql(context: UserContext): string {
    const escapedUserId = context.userId.replace(/'/g, "''");
    const escapedRole = context.role.replace(/'/g, "''");
    return `SET LOCAL app.current_user_id = '${escapedUserId}'; SET LOCAL app.current_user_role = '${escapedRole}';`;
  }
}
