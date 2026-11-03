import {
  normalizeSearch,
  searchPosts,
  searchExcerpt,
  localizeSearchPost,
  parseSearchIndex,
  type SearchDocument,
} from '../lib/search';
import { currentLanguage, translate } from './i18n';
import { formatPostDate } from '../lib/dates';
import { categoryLabel, tagLabel } from '../lib/taxonomy';

const indexes = new Map<string, Promise<SearchDocument[]>>();

/** Reuse pending requests; a failed fetch remains retryable. */
function loadSearchIndex(url: string): Promise<SearchDocument[]> {
  const cached = indexes.get(url);
  if (cached) return cached;
  const pending = fetch(url, { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error('Search index unavailable');
      return parseSearchIndex(await response.json(), window.location.href);
    })
    .catch((error: unknown) => {
      indexes.delete(url);
      throw error;
    });
  indexes.set(url, pending);
  return pending;
}

const initializedPanels = new WeakSet<HTMLElement>();

/** Bind a search panel once; keep fetching, history, and rendering local to the panel. */
export function initSearchPanels(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-search-panel]').forEach((panel) => {
    if (initializedPanels.has(panel)) return;
    const form = panel.querySelector<HTMLFormElement>('form');
    const input = panel.querySelector<HTMLInputElement>('input[name="q"]');
    const clear = panel.querySelector<HTMLButtonElement>('[data-search-clear]');
    const status = panel.querySelector<HTMLElement>('[data-search-status]');
    const results = panel.querySelector<HTMLOListElement>('[data-search-results]');
    const retry = panel.querySelector<HTMLButtonElement>('[data-search-retry]');
    const divider = panel.querySelector<HTMLHRElement>('[data-search-divider]');
    if (!form || !input || !clear || !status || !results || !retry) return;
    const { indexUrl, searchUrl: searchPath } = panel.dataset;
    if (!indexUrl || !searchPath) return;
    initializedPanels.add(panel);
    let revision = 0;
    let editing = false;
    let composing = false;

    const searchUrl = (query: string) => {
      const url = new URL(searchPath, window.location.href);
      if (query.trim()) url.searchParams.set('q', query.trim());
      return url;
    };
    const updateUrl = (commit: boolean) => {
      const url = searchUrl(input.value);
      if (url.href !== window.location.href) {
        if (editing) history.replaceState(null, '', url);
        else history.pushState(null, '', url);
        editing = !commit;
      } else if (commit) {
        editing = false;
      }
    };
    const render = async () => {
      const version = ++revision;
      const query = input.value.trim();
      const normalizedQuery = normalizeSearch(query);
      if (divider) divider.hidden = !normalizedQuery;
      clear.hidden = !query;
      retry.hidden = true;
      results.hidden = true;
      results.replaceChildren();
      if (!normalizedQuery) {
        status.textContent = '';
        return;
      }
      status.textContent = translate('search.loading');
      try {
        const documents = await loadSearchIndex(indexUrl);
        if (version !== revision) return;
        const matches = searchPosts(documents, query);
        status.textContent = matches.length
          ? translate(
              matches.length === 1 ? 'search.matches.one' : 'search.matches.other',
              currentLanguage(),
              { count: matches.length, query }
            )
          : translate('search.empty', currentLanguage(), { query });
        const fragment = document.createDocumentFragment();
        matches.forEach((post, index) => {
          const localized = localizeSearchPost(post, currentLanguage());
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = post.href;
          link.dataset.searchResult = '';
          const heading = document.createElement('h2');
          heading.id = `${input.id}-result-${index}`;
          heading.textContent = localized.title;
          link.setAttribute('aria-labelledby', heading.id);
          const meta = document.createElement('p');
          meta.className = 'result-meta';
          const date = formatPostDate(new Date(post.pubDate), currentLanguage());
          meta.textContent = [
            date,
            categoryLabel(post.category, currentLanguage()),
            ...post.tags.map((tag) => `#${tagLabel(tag, currentLanguage())}`),
          ]
            .filter(Boolean)
            .join(' · ');
          const excerpt = document.createElement('p');
          excerpt.className = 'result-excerpt';
          excerpt.textContent = searchExcerpt(localized, query, 180);
          link.append(heading, meta, excerpt);
          item.append(link);
          fragment.append(item);
        });
        results.append(fragment);
        results.hidden = !matches.length;
      } catch {
        if (version !== revision) return;
        status.textContent = translate('search.error');
        retry.hidden = false;
      }
    };

    const onInput = () => {
      updateUrl(false);
      void render();
    };
    input.addEventListener('compositionstart', () => {
      composing = true;
    });
    input.addEventListener('input', (event) => {
      if (!composing && !(event as InputEvent).isComposing) onInput();
    });
    input.addEventListener('compositionend', () => {
      composing = false;
      onInput();
    });
    form.addEventListener('submit', (event) => {
      if (composing) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      input.value = input.value.trim();
      updateUrl(true);
      void render();
    });
    clear.addEventListener('click', () => {
      input.value = '';
      updateUrl(true);
      void render();
      input.focus();
    });
    retry.addEventListener('click', () => {
      void render();
    });
    input.addEventListener('keydown', (event) => {
      if (composing || event.isComposing || event.keyCode === 229) return;
      const first = results.querySelector<HTMLAnchorElement>('[data-search-result]');
      if (event.key === 'ArrowDown' && first) {
        event.preventDefault();
        first.focus();
      }
    });
    results.addEventListener('keydown', (event) => {
      const links = [...results.querySelectorAll<HTMLAnchorElement>('[data-search-result]')];
      const index = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (index < 0) return;
      const columns = window.matchMedia('(max-width: 640px)').matches ? 1 : 2;
      const step =
        event.key === 'ArrowDown'
          ? columns
          : event.key === 'ArrowUp'
            ? -columns
            : event.key === 'ArrowRight'
              ? 1
              : event.key === 'ArrowLeft'
                ? -1
                : 0;
      if (!step) return;
      event.preventDefault();
      if (index + step < 0) input.focus();
      else links[Math.min(links.length - 1, index + step)]?.focus();
    });
    const syncUrl = () => {
      editing = false;
      input.value = new URL(window.location.href).searchParams.get('q') ?? '';
      void render();
    };
    document.addEventListener('site:language-change', () => {
      void render();
    });
    window.addEventListener('popstate', syncUrl);
    syncUrl();
  });
}
