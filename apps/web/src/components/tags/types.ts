export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TagWithCount extends Tag {
  _count: { documents: number };
}
