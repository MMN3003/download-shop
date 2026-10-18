// Minimal ZarinPal v4 stand-in for local testing: node tests/zarinpal-mock.mjs, then ZARINPAL_BASE_URL=http://localhost:4010
import { createServer } from 'node:http'
createServer((req, res) => {
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    if (req.url.endsWith('/payment/request.json')) return res.end(JSON.stringify({ data: { code: 100, authority: `A${Date.now()}`.padEnd(36, '0') }, errors: [] }))
    if (req.url.endsWith('/payment/verify.json')) return res.end(JSON.stringify({ data: { code: 100, ref_id: 123456, card_pan: '6037**1234' }, errors: [] }))
    res.statusCode = 404
    res.end('{}')
  })
}).listen(Number(process.env.PORT) || 4010, () => console.log(`mock zarinpal on :${Number(process.env.PORT) || 4010}`))
