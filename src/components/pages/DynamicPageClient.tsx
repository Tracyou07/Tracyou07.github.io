'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SiteConfig } from '@/lib/config';

import PublicationsList from '@/components/publications/PublicationsList';
import TextPage from '@/components/pages/TextPage';
import CardPage from '@/components/pages/CardPage';
import { Publication } from '@/types/publication';
import {
  PublicationPageConfig,
  TextPageConfig,
  CardPageConfig,
} from '@/types/page';
import { useLocaleStore } from '@/lib/stores/localeStore';

export type DynamicPageLocaleData =
  | { type: 'publication'; config: PublicationPageConfig; publications: Publication[] }
  | { type: 'text'; config: TextPageConfig; content: string }
  | { type: 'card'; config: CardPageConfig };

interface DynamicPageClientProps {
  dataByLocale: Record<string, DynamicPageLocaleData>;
  defaultLocale: string;
  siteConfig: Pick<SiteConfig, 'site' | 'author' | 'navigation'>;
}

export default function DynamicPageClient({ dataByLocale, defaultLocale, siteConfig }: DynamicPageClientProps) {
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const fallback = dataByLocale[defaultLocale] || Object.values(dataByLocale)[0];
  const pageData = dataByLocale[locale] || fallback;

  if (!pageData) {
    return null;
  }

  return (
    <div className="academic-homepage academic-subpage">
      <header className="academic-page-header">
        <Link href="/" className="academic-page-brand">{siteConfig.author.name}</Link>
        <nav className="academic-links" aria-label="Site navigation">
          {siteConfig.navigation.map((item) => (
            <Link key={item.target} href={item.href} prefetch={false} aria-current={pathname === item.href ? 'page' : undefined}>{item.title}</Link>
          ))}
        </nav>
      </header>
      {pageData.type === 'publication' && (
        <PublicationsList config={pageData.config} publications={pageData.publications} />
      )}
      {pageData.type === 'text' && (
        <TextPage config={pageData.config} content={pageData.content} />
      )}
      {pageData.type === 'card' && (
        <CardPage config={pageData.config} />
      )}
      <footer className="academic-footer"><span>© {siteConfig.author.name}</span><span>Last updated: {siteConfig.site.last_updated}</span></footer>
    </div>
  );
}
