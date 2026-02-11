import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

import { typeDefs, resolvers } from "./schema.js";
import { ArchitectureOneStore } from "./services/store.js";
import { seedStore } from "./services/seed.js";

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "127.0.0.1";
const app = express();
const store = new ArchitectureOneStore();

seedStore(store);

const server = new ApolloServer({
  typeDefs,
  resolvers
});

await server.start();

app.use(cors());
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "yield-accounting-backend", timestamp: new Date().toISOString() });
});

app.use(
  "/graphql",
  express.json(),
  expressMiddleware(server, {
    context: async () => ({ store })
  })
);

app.listen(port, host, () => {
  console.log(`Backend running at http://${host}:${port}`);
  console.log(`GraphQL endpoint http://${host}:${port}/graphql`);
});
