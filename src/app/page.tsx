import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import Link from 'next/link';
import { getConfig } from '@/lib/config';
import { getMarkdownContent, getBibtexContent, getPageConfig } from '@/lib/content';
import { parseBibTeX } from '@/lib/bibtexParser';
import FormattedBibTeXText from '@/components/publications/FormattedBibTeXText';
import type { CardPageConfig } from '@/types/page';

export default function Home() {
  const config = getConfig();
  const publications = parseBibTeX(getBibtexContent('publications.bib')).filter((paper) => paper.selected);
  const research = getPageConfig<CardPageConfig>('research');
  const about = getPageConfig<{ profile?: { research_interests?: string[] } }>('about');
  const biography = getMarkdownContent('bio.md').split(/\r?\n\r?\n/)[0];
  const news = publications.filter((paper) => paper.id === 'you2026regimevggt');
  const honours = getMarkdownContent('cv.md').split('## Honours & Awards')[1]?.split('## Contact')[0];

  return (
    <div className="academic-homepage">
      <header className="academic-intro" id="about">
        <Image className="academic-portrait" src={config.author.avatar} alt={config.author.name} width="200" height="250" />
        <div className="academic-biography">
          <h1>{config.author.name}</h1>
          <nav className="academic-links" aria-label="Profile links">
            {config.social.google_scholar && <a href={config.social.google_scholar}>Google Scholar</a>}
            {config.social.github && <a href={config.social.github}>GitHub</a>}
            <a href={`mailto:${config.social.email}`}>Email</a>
            <Link href="/cv/" prefetch={false}>CV &amp; Background</Link>
          </nav>
          <div className="academic-copy"><ReactMarkdown>{biography}</ReactMarkdown></div>
          {about?.profile?.research_interests && <p>My research interests include {about.profile.research_interests.map((interest) => interest.toLowerCase()).join(', ')}.</p>}
          <p className="academic-email"><a href={`mailto:${config.social.email}`}>{config.social.email}</a><span aria-hidden="true"> · </span><a href="mailto:you7@seas.upenn.edu">you7@seas.upenn.edu</a></p>
        </div>
      </header>

      <nav className="section-links" aria-label="Page sections">
        <a href="#news">News</a><a href="#publications">Publications</a><a href="#experience">Experience</a><a href="#education">Education</a><a href="#honours">Honours &amp; Awards</a>
      </nav>

      {news.length > 0 && <section id="news" className="academic-section">
        <h2>News</h2>
        <ul className="academic-news">{news.map((paper) => <li key={paper.id}><span className="news-date">[{paper.year}]</span> <Link href="/regimevggt/" prefetch={false}>RegimeVGGT</Link> — {paper.conference} {paper.year}, <strong>Poster</strong>.</li>)}</ul>
      </section>}

      <section id="publications" className="academic-section">
        <div className="academic-section-heading"><h2>Publications</h2><span>Full list: <Link href="/publications/" prefetch={false}>all publications</Link>{config.social.google_scholar && <> / <a href={config.social.google_scholar}>Google Scholar</a></>}</span></div>
        <div className="academic-papers">{publications.map((paper) => {
          const isRegime = paper.id === 'you2026regimevggt';
          const destination = isRegime ? '/regimevggt/' : paper.url;
          return <article className={`academic-paper${paper.preview || isRegime ? '' : ' academic-paper-text'}`} key={paper.id}>
            {(paper.preview || isRegime) && <a className="paper-image-link" href={destination} aria-label={`Read ${paper.title}`}><Image src={paper.preview || '/regimevggt/assets/overview.webp'} alt={`${paper.title} — method overview`} width="240" height="145" loading="lazy" /></a>}
            <div>
              <h3>{destination ? <a href={destination}><FormattedBibTeXText nodes={paper.titleNodes} fallback={paper.title} /></a> : <FormattedBibTeXText nodes={paper.titleNodes} fallback={paper.title} />}</h3>
              <p className="paper-authors">{paper.authors.map((author, index) => <span key={`${author.name}-${index}`}>{index > 0 && ', '}{author.isHighlighted ? <strong>{author.name}</strong> : author.name}{author.isCorresponding && <sup>†</sup>}</span>)}</p>
              <p className="paper-venue">{paper.conference || paper.journal}, {paper.year}{isRegime && <> · <strong className="paper-highlight">Poster</strong></>}</p>
              <p className="paper-links">{paper.url && <a href={paper.url}>[Paper]</a>}{isRegime && <Link href="/regimevggt/" prefetch={false}>[Project]</Link>}{paper.code && <a href={paper.code}>[Code]</a>}</p>
            </div>
          </article>;
        })}</div>
      </section>

      <section id="experience" className="academic-section">
        <div className="academic-section-heading"><h2>Research Experience</h2><Link href="/research/" prefetch={false}>Research details</Link></div>
        <ul className="academic-experience">{research?.items.map((item) => <li key={item.title}><div className="experience-heading"><strong>{item.title}</strong><span>{item.date}</span></div><p>{item.subtitle}</p></li>)}</ul>
      </section>

      <section id="education" className="academic-section"><h2>Education</h2><div className="academic-copy academic-education"><ReactMarkdown>{getMarkdownContent('education.md')}</ReactMarkdown></div></section>
      {honours && <section id="honours" className="academic-section"><h2>Honours &amp; Awards</h2><div className="academic-copy"><ReactMarkdown>{honours}</ReactMarkdown></div></section>}
      <footer className="academic-footer"><span>© {config.author.name}</span><span>Last updated: {config.site.last_updated}</span></footer>
    </div>
  );
}
