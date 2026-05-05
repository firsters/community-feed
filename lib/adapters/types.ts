export interface Post {
  siteId: string;
  siteName: string;
  id: string;
  title: string;
  url: string;
  author?: string;
  category?: string;
  commentCount?: number;
  viewCount?: number;
  createdAt?: string;
  thumbnail?: string;
}

export type SiteType = "builtin" | "rss" | "html";

export interface SiteConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: SiteType;
  builtinKey?: string;
  rssUrl?: string;
  url?: string;
  selectors?: HtmlSelectors;
  detailSelectors?: DetailSelectors;
  encoding?: string;
  needsCookie?: boolean;
}

export interface DetailSelectors {
  body: string;
  removeInBody?: string[];
  title?: string;
  author?: string;
  date?: string;
  views?: string;
  commentList?: string;
  comment?: {
    body: string;
    author?: string;
    date?: string;
  };
}

export interface CommentItem {
  author?: string;
  bodyHtml: string;
  createdAt?: string;
}

export interface PostDetail {
  title?: string;
  bodyHtml: string;
  author?: string;
  createdAt?: string;
  viewCount?: number;
  commentCount?: number;
  comments?: CommentItem[];
  sourceUrl: string;
}

export interface HtmlSelectors {
  list: string;
  title: string;
  link: string;
  linkAttr?: string;
  author?: string;
  date?: string;
  comments?: string;
  views?: string;
  thumb?: string;
  thumbAttr?: string;
  baseUrl?: string;
}

export interface FetchContext {
  siteId: string;
  cookie?: string;
}

export interface Adapter {
  fetch(site: SiteConfig, ctx: FetchContext): Promise<Post[]>;
}
