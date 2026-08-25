import type { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  api: {
    bodyParser: false,
  },
}

const UPSTREAM_BASE = 'https://harb-group.vercel.app/api/v1'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const path = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path ?? '')

    // Forward the ORIGINAL query string verbatim. req.query parses it away and
    // the [...path] catch-all only ever contains path segments, so rebuilding
    // the URL from req.query silently dropped every ?search=…&categoryId=…
    // parameter before reaching the upstream API (search/filter appeared dead).
    const rawUrl = req.url ?? ''
    const qsIndex = rawUrl.indexOf('?')
    const queryString = qsIndex >= 0 ? rawUrl.slice(qsIndex) : ''
    const url = `${UPSTREAM_BASE}/${path}${queryString}`

    // Collect raw body
    const chunks: Uint8Array[] = []
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve())
      req.on('error', (err) => reject(err))
    })
    const body = Buffer.concat(chunks)

    console.log('[PROXY]', req.method, url, 'body:', body.toString())

    // Build headers to forward (keep Authorization if present)
    const forwardHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue
      const key = k.toLowerCase()
      // Skip host header
      if (key === 'host') continue
      // Preserve standard header casing for downstream compatibility
      if (key === 'authorization') {
        forwardHeaders['Authorization'] = Array.isArray(v) ? v.join(',') : String(v)
        continue
      }
      if (key === 'content-type') {
        forwardHeaders['Content-Type'] = Array.isArray(v) ? v.join(',') : String(v)
        continue
      }
      if (key === 'cookie') {
        forwardHeaders['Cookie'] = Array.isArray(v) ? v.join(',') : String(v)
        continue
      }
      // For Node fetch, headers must be strings
      forwardHeaders[key] = Array.isArray(v) ? v.join(',') : String(v)
    }

    console.log('[PROXY] forwarding headers:', forwardHeaders)

    const upstreamRes = await fetch(url, {
      method: req.method,
      headers: forwardHeaders,
      body: body.length > 0 ? body : undefined,
    })

    const responseText = await upstreamRes.text()
    console.log('[PROXY] response', upstreamRes.status, responseText.slice(0, 200))

    res.status(upstreamRes.status)
    const contentType = upstreamRes.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    const cacheControl = upstreamRes.headers.get('cache-control')
    if (cacheControl) res.setHeader('Cache-Control', cacheControl)

    // Propagate any Set-Cookie headers
    const setCookie = upstreamRes.headers.get('set-cookie')
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie)
      console.log('[PROXY] Set-Cookie:', setCookie)
    }
    const allSetCookies = upstreamRes.headers.getSetCookie ? upstreamRes.headers.getSetCookie() : undefined
    if (allSetCookies && allSetCookies.length > 1) {
      console.log('[PROXY] All Set-Cookie headers:', allSetCookies)
    }

    res.send(responseText)
  } catch (err) {
    console.error('Proxy error', err)
    res.status(500).json({ success: false, message: 'Proxy error', error: String(err) })
  }
}
