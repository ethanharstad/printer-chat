import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { Ai } from '@cloudflare/ai'

type Bindings = {
  AI: Ai
  DB: D1Database
  VECTOR_INDEX: VectorizeIndex
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

app.get('/status', (c) => {
  return c.json({
    status: 'ok'
  })
})

app.post('/facts', async (c) => {
  const ai = new Ai(c.env.AI)

  console.log('Parsing request...')
  const { text } = await c.req.json()
  if ( !text ) {
    return c.text("Missing text", 400)
  }
  console.log(`Parsed: ${text}`)

  console.log('Pushing to database...')
  const { results } = await c.env.DB.prepare("INSERT INTO facts (text) VALUES (?) RETURNING *").bind(text).run()
  const record = results.length ? results[0] : null
  if ( !record ) {
    return c.text("Failed to create fact", 500)
  }
  const id = String(record['id'])
  console.log(`Pushed ${id} to database`)

  console.log('Getting embedding...')
  const { data } = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
  const values = data[0]
  if ( !values ) {
    return c.text("Failed to generate vector embedding", 500)
  }
  console.log(`Got embedding: ${values[0]}, ${values[1]}, ${values[1]}, ...`)

  console.log('Pushing to vector store...')
  try {
    const inserted = await c.env.VECTOR_INDEX.upsert([
      { id, values }
    ])
    console.log('Pushed to vectore store')
    return c.json({ id, text, inserted })
  } catch (err) {
    let message
    if (err instanceof Error) message = err.message
    else message = String(err)
    return c.text(message)
  }
})

app.post('/chat', async (c) => {
  const ai = new Ai(c.env.AI)

  const { text } = await c.req.json()

  const messages = [
    { role: 'system', content: 'You are a friendly assistant' },
    { role: 'user', content: text }
  ]

  const response = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
    messages
  }
  );

  return c.json(response)
})

export const onRequest = handle(app)
