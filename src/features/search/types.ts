import { SearchEngineProvider } from '../../types/database';

export interface SearchEngineConfig {
  id: SearchEngineProvider;
  name: string;
  searchUrl: string;
  queryParam: string;
  homeUrl: string;
}

export const SEARCH_ENGINES: Record<SearchEngineProvider, SearchEngineConfig> = {
  google: {
    id: 'google',
    name: 'Google',
    searchUrl: 'https://www.google.com/search',
    queryParam: 'q',
    homeUrl: 'https://www.google.com',
  },
  bing: {
    id: 'bing',
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search',
    queryParam: 'q',
    homeUrl: 'https://www.bing.com',
  },
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    searchUrl: 'https://duckduckgo.com/',
    queryParam: 'q',
    homeUrl: 'https://duckduckgo.com',
  },
};

export interface NavigationResult {
  type: 'direct-url' | 'search-query';
  url: string;
  query?: string;
  provider?: SearchEngineProvider;
}
