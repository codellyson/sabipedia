const oldHosts = ['www.sabipedia.com', 'sabipedia.kreativekorna.com', 'wikihownaija.kreativekorna.com']

export default defineEventHandler(event => {
 const url = getRequestURL(event)
 if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return
 if (oldHosts.includes(url.hostname)) return sendRedirect(event, `https://sabipedia.com${url.pathname}${url.search}`, 308)
 // cf-visitor carries the scheme the visitor used; the Worker's own URL may not.
 if (getHeader(event, 'cf-visitor')?.includes('"scheme":"http"')) return sendRedirect(event, `https://${url.host}${url.pathname}${url.search}`, 301)
 setHeader(event, 'Strict-Transport-Security', 'max-age=31536000')
})
