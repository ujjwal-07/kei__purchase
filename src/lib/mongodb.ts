import { MongoClient, Db, MongoClientOptions } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Missing environment variable: MONGODB_URI. Please set it in .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'kei_purchase_db';

const options: MongoClientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDatabase(): Promise<Db> {
  const c = await clientPromise;
  return c.db(dbName);
}

export default clientPromise;
