/**
 * Ponto de entrada serverless para a Vercel. A Vercel não roda um servidor
 * Node persistente (sem `app.listen`) — cada requisição invoca esta função,
 * que reaproveita a MESMA fábrica de app Express usada por `src/index.ts`
 * (dev/outros hosts). Uma instância Express é uma função válida de
 * (req, res), então basta exportá-la como default.
 */
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'

const config = loadConfig()
const app = createApp(config)

export default app
