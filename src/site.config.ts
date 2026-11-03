import type { TranslationKey } from './lib/i18n';

interface NavigationItem {
  href: string;
  label: string;
  translationKey: Extract<TranslationKey, `nav.${string}`>;
  icon?: string;
  catIcon?: boolean;
}

export const SITE_TITLE = 'Haruki Scarfy';
export const SITE_DESCRIPTION = 'IIScarfy';

export const NAV_ITEMS: readonly NavigationItem[] = [
  {
    href: '/',
    label: 'Home',
    translationKey: 'nav.home',
    catIcon: true,
  },
  {
    href: '/archive',
    label: 'Archive',
    translationKey: 'nav.archive',
    icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 2h2v5.4l3.3 2-1 1.7-4.3-2.6Z',
  },
  {
    href: '/search',
    label: 'Search',
    translationKey: 'nav.search',
    icon: 'M10.5 3a7.5 7.5 0 1 0 4.906 13.174l4.71 4.71a.75.75 0 1 0 1.06-1.06l-4.71-4.71A7.5 7.5 0 0 0 10.5 3Zm-6 7.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z',
  },
  {
    href: '/friends',
    label: 'Friends',
    translationKey: 'nav.friends',
    icon: 'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM8.5 13C4.4 13 1 15.7 1 19.2v.8c0 .8.7 1.5 1.5 1.5h12c.8 0 1.5-.7 1.5-1.5v-.8c0-3.5-3.4-6.2-7.5-6.2ZM17 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17.6 13a8.4 8.4 0 0 1 1.9 5.3v1.2c0 .7-.2 1.4-.5 2h2.5c.8 0 1.5-.7 1.5-1.5v-.8c0-3.2-2.3-5.7-5.4-6.2Z',
  },
  {
    href: '/about',
    label: 'About',
    translationKey: 'nav.about',
    icon: 'M12 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 13c-5 0-9 3-9 7v.5c0 .8.7 1.5 1.5 1.5h15c.8 0 1.5-.7 1.5-1.5V20c0-4-4-7-9-7Z',
  },
];

export const FRIEND_LINKS: {
  name: string;
  url: string;
  description?: string;
}[] = [
  { name: 'Anna Li', url: 'https://blog.nana14.com/' },
  { name: 'BCMonomial', url: 'https://bcmonomial.xyz/' },
  { name: 'BYVoid', url: 'https://byvoid.com/zht/' },
  { name: 'Haruki Nikaidou', url: 'https://blog.plr.moe/' },
  { name: 'Huanyu Shi', url: 'https://huanyushi.github.io/' },
  { name: 'Lostune', url: 'https://lostune.github.io/' },
  { name: 'Uranium92', url: 'https://uranium92.top/' },
];

export const PROFILE = {
  name: 'Haruki Scarfy',
  github: 'https://github.com/xwxsparkle',
  twitter: 'https://twitter.com/xwxsparkle',
  bilibili: 'https://space.bilibili.com/3747568745975076',
};
