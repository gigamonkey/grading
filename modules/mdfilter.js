import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import nunjucks from 'nunjucks';

marked.use({
  mangle: false,
  headerIds: false,
});

const env = new nunjucks.Environment();

const window = new JSDOM('').window;
const purify = DOMPurify(window);
const safe = env.getFilter('safe');

/*
 * The filter.
 */
const md = (text, stripParagraphs = true) => {
  try {
    let html = marked(text).trim();
    if (stripParagraphs) {
      html = html.replace(/^<p>|<\/p>$/g, '');
    }
    // FIXME: might want to log anybody whose journal requires purification.
    // Also note that purify seems to strip a bunch of stuff after it cleans
    // something up so depending what you put into your journal entry you may
    // not be able to see anything else after the bad thing. But we're in fact
    // storing the dirty contents so they can be edited to fix things up.
    return safe(purify.sanitize(html));
  } catch (e) {
    console.error('Error processing or purifying markdown:', e);
    return text;
  }
};

/*
 * Install the filter under its default name.
 */
const install = (env, name = 'md') => {
  console.log(`Installing md as ${name}`);
  env.addFilter(name, md);
};

export default { md, install };
