import { it } from './i18n/it.js';

const TRANSLATIONS = { it };
const LANG_PREFIXES = Object.keys(TRANSLATIONS);
const PAGE_PATHS = ['/', '/tools/n8n-cli/', '/tools/x-cli/'];

// Bots that should NOT be auto-redirected (so they index both versions)
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegram|embedly|quora|pinterest|redditbot|applebot|yandex|duckduckbot|baiduspider|sogou|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt|anthropic|claude|perplexity/i;

function isBot(request) {
  const ua = request.headers.get('user-agent') || '';
  return BOT_PATTERN.test(ua);
}

function prefersItalian(request) {
  const accept = request.headers.get('accept-language') || '';
  if (!accept) return false;
  // Parse first language in Accept-Language header
  const primary = accept.split(',')[0].trim().split(';')[0].trim();
  return primary.startsWith('it');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check for language prefix: /it/...
    let lang = null;
    let assetPath = pathname;

    for (const prefix of LANG_PREFIXES) {
      if (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`)) {
        lang = prefix;
        assetPath = pathname.slice(prefix.length + 1) || '/';
        break;
      }
    }

    // Redirect /it to /it/
    if (lang && pathname === `/${lang}`) {
      return Response.redirect(`${url.origin}/${lang}/`, 301);
    }

    // No language prefix — English page
    if (!lang) {
      // Auto-redirect Italian visitors to /it/ (skip bots)
      if (!isBot(request) && prefersItalian(request)) {
        const italianUrl = `${url.origin}/it${pathname}${url.search}`;
        return new Response(null, {
          status: 302,
          headers: { 'Location': italianUrl, 'Vary': 'Accept-Language' },
        });
      }

      const response = await env.ASSETS.fetch(request);
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('text/html')) return response;

      // Inject hreflang tags into English pages
      return new HTMLRewriter()
        .on('head', new HreflangInjector(pathname))
        .transform(response);
    }

    const translations = TRANSLATIONS[lang];
    if (!translations) {
      return env.ASSETS.fetch(request);
    }

    // Fetch the English asset
    const assetUrl = new URL(url);
    assetUrl.pathname = assetPath;
    assetUrl.search = '';
    const response = await env.ASSETS.fetch(
      new Request(assetUrl.toString(), {
        method: request.method,
        headers: request.headers,
      })
    );

    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return response;

    // Transform HTML with translations
    const transformed = new HTMLRewriter()
      .on('[data-i18n]', new TranslationHandler(translations))
      .on('[data-i18n-meta]', new MetaTranslationHandler(translations))
      .on('html', new LangSetter(lang))
      .on('head', new HeadTransformer(assetPath, lang, translations))
      .on('a[href]', new LinkRewriter(`/${lang}`))
      .transform(response);

    const headers = new Headers(transformed.headers);
    headers.set('Content-Language', lang);
    headers.set('Vary', 'Accept-Language');

    return new Response(transformed.body, {
      status: transformed.status,
      headers,
    });
  },
};

// Replace innerHTML of elements with data-i18n attribute
class TranslationHandler {
  constructor(t) {
    this.t = t;
  }
  element(el) {
    const key = el.getAttribute('data-i18n');
    if (key && this.t[key]) {
      el.setInnerContent(this.t[key], { html: true });
    }
  }
}

// Replace content attribute of meta elements with data-i18n-meta
class MetaTranslationHandler {
  constructor(t) {
    this.t = t;
  }
  element(el) {
    const key = el.getAttribute('data-i18n-meta');
    if (key && this.t[key]) {
      el.setAttribute('content', this.t[key]);
    }
  }
}

// Set <html lang="xx">
class LangSetter {
  constructor(lang) {
    this.lang = lang;
  }
  element(el) {
    el.setAttribute('lang', this.lang);
  }
}

// Inject hreflang tags and update canonical/og:url for translated pages
class HeadTransformer {
  constructor(path, currentLang = 'en', translations = null) {
    this.path = path.endsWith('/') || path === '/' ? path : path + '/';
    this.currentLang = currentLang;
    this.translations = translations;
  }
  element(el) {
    el.append(
      `\n<link rel="alternate" hreflang="en" href="https://agntly.io${this.path}">`,
      { html: true }
    );
    el.append(
      `\n<link rel="alternate" hreflang="it" href="https://agntly.io/it${this.path}">`,
      { html: true }
    );
    el.append(
      `\n<link rel="alternate" hreflang="x-default" href="https://agntly.io${this.path}">`,
      { html: true }
    );
  }
}

// Also inject hreflang into English pages
class HreflangInjector {
  constructor(path) {
    this.path = path.endsWith('/') || path === '/' ? path : path + '/';
  }
  element(el) {
    el.append(
      `\n<link rel="alternate" hreflang="en" href="https://agntly.io${this.path}">`,
      { html: true }
    );
    el.append(
      `\n<link rel="alternate" hreflang="it" href="https://agntly.io/it${this.path}">`,
      { html: true }
    );
    el.append(
      `\n<link rel="alternate" hreflang="x-default" href="https://agntly.io${this.path}">`,
      { html: true }
    );
  }
}

// Rewrite internal page links to include language prefix
class LinkRewriter {
  constructor(langPrefix) {
    this.prefix = langPrefix;
  }
  element(el) {
    const href = el.getAttribute('href');
    if (!href) return;

    // Only rewrite internal page links, not assets or external URLs
    if (href.startsWith('/') && !href.startsWith('//')) {
      const basePath = href.split('#')[0].split('?')[0];

      // Check if it's a known page path or root with anchor
      if (
        PAGE_PATHS.includes(basePath) ||
        basePath === '' ||
        href.startsWith('/#')
      ) {
        el.setAttribute('href', this.prefix + href);
      }
    }
  }
}
