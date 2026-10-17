export default defineEventHandler(async event => toPublicOrder(await ownOrder(event)))
