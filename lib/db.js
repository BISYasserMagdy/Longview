import { MongoClient } from "mongodb";

// Reuse the connection between invocations of the same serverless instance.
let cached = globalThis.__longviewMongo;
if (!cached) cached = globalThis.__longviewMongo = { promise: null };

export async function stateCollection() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!cached.promise) {
    cached.promise = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }).connect();
  }
  try {
    const client = await cached.promise;
    return client.db(process.env.MONGODB_DB || "longview").collection("state");
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}
