export type RankedItem<T> = {
  item: T;
  score: number;
  reasons?: string[];
};

export function rerank<T>(items: RankedItem<T>[], limit = 5): RankedItem<T>[] {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
