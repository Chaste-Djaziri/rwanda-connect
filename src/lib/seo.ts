import { useEffect } from 'react';

const SITE_NAME = 'HillSide';
const TITLE_SUFFIX = `— ${SITE_NAME}`;

const setMetaTag = (selector: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    if (selector.startsWith('meta[name="')) {
      const name = selector.slice(11, -2);
      tag.setAttribute('name', name);
    } else if (selector.startsWith('meta[property="')) {
      const property = selector.slice(15, -2);
      tag.setAttribute('property', property);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const setLinkTag = (rel: string, href: string) => {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
};

const withSuffix = (title?: string) => {
  if (!title) return SITE_NAME;
  return title.includes(TITLE_SUFFIX) ? title : `${title} ${TITLE_SUFFIX}`;
};

export function usePageMeta({
  title,
  description,
  image,
  url,
}: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}) {
  useEffect(() => {
    const pageTitle = withSuffix(title);
    document.title = pageTitle;

    if (description) {
      setMetaTag('meta[name="description"]', description);
    }
    setMetaTag('meta[property="og:title"]', pageTitle);
    if (description) {
      setMetaTag('meta[property="og:description"]', description);
    }
    if (image) {
      setMetaTag('meta[property="og:image"]', image);
    }
    if (url) {
      setMetaTag('meta[property="og:url"]', url);
      setLinkTag('canonical', url);
    }
    setMetaTag('meta[name="twitter:title"]', pageTitle);
    if (description) {
      setMetaTag('meta[name="twitter:description"]', description);
    }
    if (image) {
      setMetaTag('meta[name="twitter:image"]', image);
    }
  }, [title, description, image, url]);
}
