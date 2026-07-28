import type { Product } from "@/lib/types";

export type ProductSort =
  | "relevance"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name";

export type StockFilter =
  | "all"
  | "in-stock"
  | "low-stock"
  | "out-of-stock";

export interface ProductSearchOptions {
  query: string;
  category: string;
  stockFilter: StockFilter;
  sort: ProductSort;
}

export interface ProductSearchResult {
  product: Product;
  score: number;
}

interface WeightedField {
  value: string;
  weight: number;
}

const LOW_STOCK_THRESHOLD = 5;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 0);
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  );
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (
      let rightIndex = 1;
      rightIndex <= right.length;
      rightIndex += 1
    ) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function fuzzyThreshold(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 7) return 1;
  return 2;
}

function tokenMatchScore(
  queryToken: string,
  candidateToken: string
): number {
  if (candidateToken === queryToken) return 12;
  if (candidateToken.startsWith(queryToken)) return 9;
  if (candidateToken.includes(queryToken)) return 6;

  const threshold = fuzzyThreshold(queryToken);

  if (
    threshold > 0 &&
    Math.abs(candidateToken.length - queryToken.length) <= threshold &&
    levenshteinDistance(queryToken, candidateToken) <= threshold
  ) {
    return 4;
  }

  return 0;
}

function scoreProduct(product: Product, rawQuery: string): number {
  const query = normalizeText(rawQuery);

  if (!query) return 0;

  const queryTokens = tokenize(query);
  const fields: WeightedField[] = [
    { value: normalizeText(product.name), weight: 10 },
    { value: normalizeText(product.category), weight: 7 },
    { value: normalizeText(product.description), weight: 3 },
    { value: normalizeText(product.id), weight: 1 },
  ];

  let score = 0;

  for (const field of fields) {
    if (!field.value) continue;

    if (field.value === query) {
      score += 80 * field.weight;
    } else if (field.value.startsWith(query)) {
      score += 45 * field.weight;
    } else if (field.value.includes(query)) {
      score += 28 * field.weight;
    }
  }

  for (const queryToken of queryTokens) {
    let bestTokenScore = 0;

    for (const field of fields) {
      const candidateTokens = tokenize(field.value);

      for (const candidateToken of candidateTokens) {
        bestTokenScore = Math.max(
          bestTokenScore,
          tokenMatchScore(queryToken, candidateToken) * field.weight
        );
      }
    }

    // Every search token must match somewhere. This prevents broad,
    // irrelevant results when a multi-word search is used.
    if (bestTokenScore === 0) return 0;

    score += bestTokenScore;
  }

  if (product.stock > 0) score += 3;
  if (product.active) score += 2;

  return score;
}

function matchesStockFilter(
  product: Product,
  filter: StockFilter
): boolean {
  if (filter === "in-stock") return product.stock > 0;
  if (filter === "low-stock") {
    return product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  }
  if (filter === "out-of-stock") return product.stock <= 0;

  return true;
}

function compareResults(
  left: ProductSearchResult,
  right: ProductSearchResult,
  sort: ProductSort,
  hasQuery: boolean
): number {
  if (sort === "price-asc") {
    return (
      left.product.price - right.product.price ||
      left.product.name.localeCompare(right.product.name)
    );
  }

  if (sort === "price-desc") {
    return (
      right.product.price - left.product.price ||
      left.product.name.localeCompare(right.product.name)
    );
  }

  if (sort === "name") {
    return left.product.name.localeCompare(right.product.name);
  }

  if (sort === "newest") {
    return (
      right.product.createdAt - left.product.createdAt ||
      left.product.name.localeCompare(right.product.name)
    );
  }

  if (hasQuery && right.score !== left.score) {
    return right.score - left.score;
  }

  return (
    right.product.createdAt - left.product.createdAt ||
    left.product.name.localeCompare(right.product.name)
  );
}

export function searchProducts(
  products: Product[],
  options: ProductSearchOptions
): ProductSearchResult[] {
  const hasQuery = normalizeText(options.query).length > 0;

  return products
    .filter((product) => {
      const matchesCategory =
        options.category === "All" ||
        product.category === options.category;

      return (
        matchesCategory &&
        matchesStockFilter(product, options.stockFilter)
      );
    })
    .map((product) => ({
      product,
      score: hasQuery ? scoreProduct(product, options.query) : 0,
    }))
    .filter((result) => !hasQuery || result.score > 0)
    .sort((left, right) =>
      compareResults(left, right, options.sort, hasQuery)
    );
}

export function buildSearchSuggestions(
  products: Product[],
  query: string,
  maximum = 6
): string[] {
  const normalizedQuery = normalizeText(query);
  const candidates = Array.from(
    new Set(
      products.flatMap((product) => [
        product.name.trim(),
        product.category.trim(),
      ])
    )
  ).filter(Boolean);

  if (!normalizedQuery) {
    return candidates.slice(0, maximum);
  }

  return candidates
    .map((candidate) => {
      const normalizedCandidate = normalizeText(candidate);
      let score = 0;

      if (normalizedCandidate === normalizedQuery) score = 100;
      else if (normalizedCandidate.startsWith(normalizedQuery)) score = 80;
      else if (normalizedCandidate.includes(normalizedQuery)) score = 60;
      else {
        const queryTokens = tokenize(normalizedQuery);
        const candidateTokens = tokenize(normalizedCandidate);

        score = queryTokens.reduce((total, queryToken) => {
          const best = candidateTokens.reduce(
            (tokenBest, candidateToken) =>
              Math.max(
                tokenBest,
                tokenMatchScore(queryToken, candidateToken)
              ),
            0
          );

          return total + best;
        }, 0);
      }

      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.localeCompare(right.candidate)
    )
    .slice(0, maximum)
    .map((item) => item.candidate);
}