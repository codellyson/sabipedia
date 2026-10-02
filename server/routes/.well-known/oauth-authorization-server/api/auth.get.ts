import { authFor } from '../../../../utils/auth'

export default defineEventHandler(async event => sendWebResponse(event, await authFor(event).handler(toWebRequest(event))))
