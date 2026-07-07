import type { Document, Prisma } from "@prisma/client";
import type { CreateDocumentInput, UpdateDocumentInput } from "../types";

export interface IDocumentRepository {
  createDocument(data: CreateDocumentInput): Promise<Document>;
  findDocumentById(
    id: string,
    userId: string,
    include?: Prisma.DocumentInclude,
    role?: string,
  ): Promise<Document | null>;
  findFirst(
    where: Prisma.DocumentWhereInput,
    select?: Prisma.DocumentSelect,
  ): Promise<Document | null>;
  findMany(options: Prisma.DocumentFindManyArgs): Promise<Document[]>;
  count(options: Prisma.DocumentCountArgs): Promise<number>;
  update(id: string, userId: string, data: UpdateDocumentInput, role?: string): Promise<Document>;
  updateSearchVector(id: string, title?: string, description?: string | null): Promise<unknown>;
  updateMany(
    where: Prisma.DocumentWhereInput,
    data: Prisma.DocumentUncheckedUpdateInput,
  ): Promise<{ count: number }>;
}
