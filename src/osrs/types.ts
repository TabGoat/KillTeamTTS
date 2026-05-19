export interface WikiSearchResult {
  title: string;
  snippet: string;
  size: number;
  wordcount: number;
}

export interface WikiPage {
  title: string;
  extract: string;
  wikitext?: string;
  url: string;
  autoCorrectFrom?: string;
}

export interface PriceMapping {
  id: number;
  name: string;
  examine: string;
  members: boolean;
  lowalch: number | null;
  highalch: number | null;
  limit: number | null;
  value: number;
  icon: string;
}

export interface ItemPrice {
  id: number;
  name: string;
  high: number | null;
  highTime: number | null;
  low: number | null;
  lowTime: number | null;
  avgHighPrice?: number | null;
  avgLowPrice?: number | null;
}

export interface OsrsSubcommand {
  name: 'search' | 'item' | 'monster' | 'quest' | 'skill' | 'price';
  query: string;
}
