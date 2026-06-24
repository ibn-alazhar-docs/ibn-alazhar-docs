import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { IConversionJobRepository } from "@/domain/repositories/conversion-job.repository.interface";

export class ConversionJobRepository implements IConversionJobRepository {
  async create(data: Prisma.ConversionJobUncheckedCreateInput) {
    return prisma.conversionJob.create({ data });
  }

  async findFirst(where: Prisma.ConversionJobWhereInput) {
    return prisma.conversionJob.findFirst({ where });
  }

  async findMany(options: Prisma.ConversionJobFindManyArgs) {
    return prisma.conversionJob.findMany(options);
  }

  async count(where: Prisma.ConversionJobWhereInput) {
    return prisma.conversionJob.count({ where });
  }

  async update(id: string, data: Prisma.ConversionJobUncheckedUpdateInput) {
    return prisma.conversionJob.update({ where: { id }, data });
  }
}

export const conversionJobRepository = new ConversionJobRepository();
