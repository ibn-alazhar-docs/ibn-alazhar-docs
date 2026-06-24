export interface ISearchRepository {
  queryRaw<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
}

export const searchRepository: ISearchRepository = {
  async queryRaw<T = unknown>(query: string, ...values: unknown[]) {
    const { prisma } = await import("@/lib/prisma");
    return prisma.$queryRawUnsafe<T>(query, ...values);
  },
};
