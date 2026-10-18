// Stand-in for the payment gateways in local testing: node tests/payment-mock.mjs (PORT, default 4010),
// then ZARINPAL_BASE_URL and TOROBPAY_BASE_URL = http://localhost:4010.
// GET /__torob/log lists the Torob Pay calls, so tests can check amounts and cancels.
import { createServer } from 'node:http'

const port = Number(process.env.PORT) || 4010
const torobLog = []
const ok = response => ({ successful: true, response })

createServer((req, res) => {
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => {
    res.setHeader('content-type', 'application/json')
    const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)) }
    const url = req.url ?? ''
    let json = {}
    try { json = body ? JSON.parse(body) : {} }
    catch {}

    // ZarinPal v4
    if (url.endsWith('/payment/request.json')) return send({ data: { code: 100, authority: `A${Date.now()}`.padEnd(36, '0') }, errors: [] })
    if (url.endsWith('/payment/verify.json')) return send({ data: { code: 100, ref_id: 123456, card_pan: '6037**1234' }, errors: [] })

    // Torob Pay
    if (url.startsWith('/api/online/')) {
      torobLog.push({ path: url.split('?')[0], body: json })
      if (url === '/api/online/v1/oauth/token') {
        return req.headers.authorization?.startsWith('Basic ') ? send({ access_token: 'mock-token' }) : send({ error: { code: 401, message: 'no client' } }, 401)
      }
      if (req.headers.authorization !== 'Bearer mock-token') return send({ successful: false, error: { code: 401, message: 'bad token' } }, 401)
      if (url === '/api/online/payment/v1/token') {
        const paymentToken = `T${Date.now()}${Math.random().toString(36).slice(2, 8)}`
        return send(ok({ paymentToken, paymentPageUrl: `http://localhost:${port}/torob/pay/${paymentToken}` }))
      }
      if (url === '/api/online/payment/v1/verify') return send(ok({ status: 'VERIFY' }))
      if (url === '/api/online/payment/v1/settle') return send(ok({ status: 'SETTLE' }))
      if (url.startsWith('/api/online/payment/v1/status')) return send(ok({ status: 'SETTLE' }))
      if (url === '/api/online/payment/v1/cancel') return send(ok({ status: 'CANCEL' }))
    }
    if (url === '/__torob/log') return send(torobLog)
    send({}, 404)
  })
}).listen(port, () => console.log(`mock payment gateways on :${port}`))
