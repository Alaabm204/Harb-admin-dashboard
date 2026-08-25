import type { NextApiRequest, NextApiResponse } from 'next'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Upstream backend base URL — overridable via ADMIN_API_BASE_URL in
// .env.local (server-side only), with a safe default fallback.
const UPSTREAM_BASE = process.env.ADMIN_API_BASE_URL || 'https://harb-group.vercel.app/api/v1'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!ALLOWED_METHODS.has(req.method ?? '')) {
      res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE')
      res.status(405).json({ success: false, message: 'Method not allowed' })
      return
    }
    const path = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path ?? '')
    const url = `${UPSTREAM_BASE}/${path}`

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
