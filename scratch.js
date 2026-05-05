const cheerio = require('cheerio');

(async () => {
  try {
    const res = await fetch('https://eomisae.co.kr/fs/2108073', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log("Detail page wrappers:");
    const possibleBody = $('.xe_content, .rd_body, article, .board_content');
    possibleBody.each((i, el) => {
       console.log('Body candidate:', el.tagName, $(el).attr('class'));
    });
  } catch(e) { console.error(e); }
})();
