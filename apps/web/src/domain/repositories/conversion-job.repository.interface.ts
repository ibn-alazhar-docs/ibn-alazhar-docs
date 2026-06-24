import type { ConversionJob, Prisma } from "@prisma/client";

export interface IConversionJobRepository {
  create(data: Prisma.ConversionJobUncheckedCreateInput): Promise<ConversionJob>;
  findFirst(where: Prisma.ConversionJobWhereInput): Promise<ConversionJob | null>;
  findMany(options: Prisma.ConversionJobFindManyArgs): Promise<ConversionJob[]>;
  count(where: Prisma.ConversionJobWhereInput): Promise<number>;
  update(id: string, data: Prisma.ConversionJobUncheckedUpdateInput): Promise<ConversionJob>;
}
