import { siteOrigin } from '../../shared/seo'
import { categorySlug } from '../../shared/guide'
import { environment } from '../utils/auth'

function escapeXml(value: string) {
 return value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]!))
}

export default defineEventHandler(async event => {
 const {results}=await environment(event).DB.prepare(`SELECT g.slug, v.created_at, json_extract(v.content,'$.category') category
  FROM guide g JOIN guide_version v ON v.id=g.current_version_id
  ORDER BY g.slug`).all<{slug:string;created_at:string;category:string}>()
 const topics=[...new Set(results.map(r=>r.category))].map(c=>`<url><loc>${siteOrigin}/topics/${categorySlug(c)}</loc></url>`)
 const urls=[`<url><loc>${siteOrigin}/</loc></url>`,...topics,...results.map(({slug,created_at}) => {
  const location=escapeXml(`${siteOrigin}/guides/${encodeURIComponent(slug)}`)
  const lastModified=escapeXml(created_at.replace(' ','T')+'Z')
  return `<url><loc>${location}</loc><lastmod>${lastModified}</lastmod></url>`
 })]
 setHeader(event,'Content-Type','application/xml; charset=utf-8')
 setHeader(event,'Cache-Control','public, max-age=300, s-maxage=3600')
 return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
})
