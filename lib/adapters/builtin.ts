import { rssAdapter } from "./rss";
import { htmlAdapter } from "./html";
import { DetailSelectors, FetchContext, Post, SiteConfig } from "./types";

// 빌트인 사이트별 본문/댓글 셀렉터 — 사이트 HTML 변경 시 여기서 조정
export const builtinDetailSelectors: Record<string, DetailSelectors> = {
  clien: {
    body: ".post_article",
    removeInBody: [".post_signature", "script", "style"],
    author: ".post_view .post_author",
    date: ".post_view .post_time .timestamp",
    commentList: ".comment_row",
    comment: { body: ".comment_view", author: ".nickname", date: ".timestamp" },
  },
  ppomppu: {
    body: ".JS_ContentMain",
    removeInBody: ["script", "style", "ins", ".ad-banner", ".ad_container", ".w2g-slot"],
    commentList: ".comment_wrapper",
    comment: { body: ".comment_div0", author: ".nick a, .nickname", date: ".time" },
  },
  fmkorea: {
    body: ".xe_content",
    removeInBody: ["script", "style"],
    author: ".side a",
    date: ".date",
    commentList: ".fdb_lst_ul li.fdb_itm",
    comment: { body: ".xe_content", author: ".member", date: ".date" },
  },
  dcinside: {
    body: ".write_div",
    removeInBody: ["script", "style", ".adv_writing_w"],
    author: ".gall_writer",
    date: ".gall_date",
  },
  ruliweb: {
    body: ".view_content",
    removeInBody: ["script", "style"],
    author: ".user_info .nick",
    date: ".user_info .regdate",
    commentList: ".comment_element",
    comment: { body: ".comment_view", author: ".nick", date: ".time" },
  },
  theqoo: {
    body: ".rd_body, article",
    removeInBody: ["script", "style"],
    author: ".side a",
    date: ".date",
  },
  bobaedream: {
    body: ".bodyCont, #bodyCont",
    removeInBody: ["script", "style"],
    author: ".writerInfo .name",
    date: ".date",
  },
  mlbpark: {
    body: "#contentDetail, .view_context",
    removeInBody: ["script", "style"],
    author: ".user",
    date: ".date",
  },
  eomisae: {
    body: "article .xe_content, .rd_body .xe_content",
    removeInBody: ["script", "style"],
    author: ".author, .side a",
    date: ".date, .time",
    commentList: ".fdb_lst_ul li.fdb_itm",
    comment: { body: ".xe_content", author: ".member", date: ".date" },
  },
};

// 사이트별 페이지 인코딩 — 본문 fetch 시 적용
const builtinEncodings: Record<string, string> = {
  ppomppu: "euc-kr",
  bobaedream: "euc-kr",
  mlbpark: "euc-kr",
};

export function resolveSiteForDetail(site: SiteConfig): SiteConfig {
  let next = site;
  if (!next.detailSelectors && next.type === "builtin" && next.builtinKey) {
    const ds = builtinDetailSelectors[next.builtinKey];
    if (ds) next = { ...next, detailSelectors: ds };
  }
  if (!next.encoding && next.type === "builtin" && next.builtinKey) {
    const enc = builtinEncodings[next.builtinKey];
    if (enc) next = { ...next, encoding: enc };
  }
  return next;
}

type BuiltinFetcher = (site: SiteConfig, ctx: FetchContext) => Promise<Post[]>;

// 각 빌트인은 SiteConfig 의 user-facing 필드(name, enabled)는 그대로 사용하되
// 내부적으로 url/selectors 등을 주입해서 generic adapter 로 위임한다.
export const builtinFetchers: Record<string, BuiltinFetcher> = {
  // 클리앙 모두의공원 — RSS
  clien: (site, ctx) =>
    rssAdapter.fetch({ ...site, rssUrl: "https://www.clien.net/service/rss/park" }, ctx),

  // 뽐뿌 자유게시판 — RSS (URL 은 http → https 로 정규화)
  ppomppu: async (site, ctx) => {
    const posts = await rssAdapter.fetch(
      { ...site, rssUrl: "https://www.ppomppu.co.kr/rss.php?id=freeboard" },
      ctx,
    );
    return posts.map((p) => ({
      ...p,
      url: p.url.replace(/^http:\/\//, "https://"),
      id: p.id.replace(/^http:\/\//, "https://"),
    }));
  },

  // 펨코 포텐 터짐
  fmkorea: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://www.fmkorea.com/index.php?mid=best",
        selectors: {
          list: ".fm_best_widget li",
          title: "h3.title a",
          link: "h3.title a",
          author: ".author",
          date: ".regdate",
          comments: ".comment_count",
          baseUrl: "https://www.fmkorea.com",
        },
      },
      ctx,
    ),

  // DCInside 실시간 베스트
  dcinside: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://www.dcinside.com/",
        selectors: {
          list: ".rank_lst li",
          title: ".tit_txt",
          link: "a",
          baseUrl: "https://www.dcinside.com/",
        },
      },
      ctx,
    ),

  // 루리웹 유머 BEST
  ruliweb: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://bbs.ruliweb.com/best/humor",
        selectors: {
          list: "table.board_list_table tr.table_body",
          title: "a.subject_link",
          link: "a.subject_link",
          author: ".writer",
          date: ".time",
          comments: ".num_reply .num",
          views: ".hit",
          baseUrl: "https://bbs.ruliweb.com",
        },
      },
      ctx,
    ),

  // 더쿠 핫게시물
  theqoo: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://theqoo.net/hot",
        selectors: {
          list: "table.bd_lst tbody tr",
          title: ".hx a",
          link: ".hx a",
          author: ".author",
          date: ".time",
          comments: ".cmt",
          views: ".count",
          baseUrl: "https://theqoo.net",
        },
      },
      ctx,
    ),

  // 보배드림 베스트
  bobaedream: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://www.bobaedream.co.kr/list?code=best",
        selectors: {
          list: "table.basic_table01 tbody tr",
          title: "a.bsubject",
          link: "a.bsubject",
          author: "td:nth-child(3)",
          date: "td:nth-child(5)",
          comments: ".count",
          baseUrl: "https://www.bobaedream.co.kr",
        },
      },
      ctx,
    ),

  // MLBPark 불펜 BEST
  mlbpark: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://mlbpark.donga.com/mp/b.php?b=bullpen&pl=&select=&query=&subselect=&subquery=&user=&sphere=&page=1",
        selectors: {
          list: "table.tbl_type01 tbody tr",
          title: "a.bullpenbox",
          link: "a.bullpenbox",
          author: ".user",
          date: ".date",
          views: ".viewV",
          baseUrl: "https://mlbpark.donga.com",
        },
      },
      ctx,
    ),

  // 어미새 패션정보
  eomisae: (site, ctx) =>
    htmlAdapter.fetch(
      {
        ...site,
        url: "https://eomisae.co.kr/fs",
        selectors: {
          list: "table._listA tbody tr:not(.notice)",
          title: "td.title a.pjax",
          link: "td.title a.pjax",
          author: "td:nth-child(3)",
          date: "td:nth-child(4)",
          views: "td:nth-child(5)",
          baseUrl: "https://eomisae.co.kr",
        },
      },
      ctx,
    ),
};

export const builtinSeeds: SiteConfig[] = [
  { id: "clien", name: "클리앙 · 모두의공원", enabled: true, type: "builtin", builtinKey: "clien" },
  { id: "ppomppu", name: "뽐뿌 · 자유게시판", enabled: true, type: "builtin", builtinKey: "ppomppu" },
  { id: "fmkorea", name: "펨코 · 포텐 터짐", enabled: true, type: "builtin", builtinKey: "fmkorea" },
  { id: "dcinside", name: "DC인사이드 · 실시간 베스트", enabled: true, type: "builtin", builtinKey: "dcinside" },
  { id: "ruliweb", name: "루리웹 · 유머 BEST", enabled: true, type: "builtin", builtinKey: "ruliweb" },
  { id: "theqoo", name: "더쿠 · 핫게시물", enabled: true, type: "builtin", builtinKey: "theqoo", needsCookie: false },
  { id: "bobaedream", name: "보배드림 · 베스트", enabled: true, type: "builtin", builtinKey: "bobaedream" },
  { id: "mlbpark", name: "MLBPark · 불펜 BEST", enabled: true, type: "builtin", builtinKey: "mlbpark" },
  { id: "eomisae", name: "어미새 · 패션정보", enabled: true, type: "builtin", builtinKey: "eomisae" },
];
