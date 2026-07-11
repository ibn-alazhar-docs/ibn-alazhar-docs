import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { IConversionJobRepository } from "@/domain/repositories/conversion-job.repository.interface";

export class ConversionJobRepository implements IConversionJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: Prisma.ConversionJobUncheckedCreateInput) {
    return this.prisma.conversionJob.create({ data });
  }

  async findFirst(where: Prisma.ConversionJobWhereInput) {
    return this.prisma.conversionJob.findFirst({ where });
  }

  async findMany(options: Prisma.ConversionJobFindManyArgs) {
    return this.prisma.conversionJob.findMany(options);
  }

  async count(where: Prisma.ConversionJobWhereInput) {
    return this.prisma.conversionJob.count({ where });
  }

  async update(id: string, data: Prisma.ConversionJobUncheckedUpdateInput) {
    return this.prisma.conversionJob.update({ where: { id }, data });
  }
}
