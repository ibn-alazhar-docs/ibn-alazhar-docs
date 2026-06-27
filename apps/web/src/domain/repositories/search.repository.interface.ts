export interface SearchQueryParams {
  userId?: string;
  isAdmin: boolean;
  normalizedQuery: string;
  rawQuery: string;
  type: string;
  folderId?: string;
  status?: string;
  tagId?: string;
  limit: number;
  offset: number;
}

export interface SearchDocumentRow {
  id: string;
  title: string;
  fileName: string;
  status: string;
  pageCount: number | null;
  fileSize: number;
  outputFormats: string[];
  createdAt: Date;
  folderId: string | null;
  searchpreview: string | null;
  wordcount: number | null;
  rank: number;
  folderName: string | null;
}

export interface SuggestionRow {
  text: string;
  type: string;
  count: bigint;
  id?: string;
}

export interface ISearchRepository {
  countDocuments(params: SearchQueryParams): Promise<number>;
  searchDocuments(params: SearchQueryParams): Promise<SearchDocumentRow[]>;
  getTitleSuggestions(userId: string, query: string): Promise<SuggestionRow[]>;
  getFolderSuggestions(userId: string, query: string): Promise<SuggestionRow[]>;
  getTagSuggestions(userId: string, query: string): Promise<SuggestionRow[]>;
}
