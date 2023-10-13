```
npm install
npm run dev
```

```
open http://localhost:8788
```

```
npm run deploy
```

## Preparing Infrastructure

```
npx wrangler vectorize create vector-index --dimensions=768 --metric=cosine

npx wrangler d1 create database
npx wrangler d1 execute database --command "CREATE TABLE IF NOT EXISTS facts (id INTEGER PRIMARY KEY, text TEXT NOT NULL)"
```