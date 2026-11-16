/** Structured data for search engines (Organization, LocalBusiness, FAQPage, Article). */
export default function JsonLd({ data }: { data: object }) {
  // "<" is escaped so content can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
