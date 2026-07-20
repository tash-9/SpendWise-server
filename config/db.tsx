import { MongoClient, Db, ObjectId } from "mongodb";

let client: MongoClient;
let db: Db;

export async function connectDB(): Promise<Db> {
  if (db) return db;
  if (!process.env.MONGODB_URI)
    throw new Error("MONGODB_URI environment variable is required");
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db();

  // Indexes
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("expenses").createIndex({ userId: 1 });
  await db.collection("expenses").createIndex({ date: -1 });
  await db.collection("budgets").createIndex({ userId: 1 });
  await db.collection("goals").createIndex({ userId: 1 });
  await db.collection("chatHistory").createIndex({ userId: 1 });

  console.log("Connected to MongoDB – SpendWise");
  return db;
}

export { ObjectId };