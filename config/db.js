import mongoose from 'mongoose';

let connection;
export default async function connect() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connection) connection = mongoose.connect(process.env.MONGODB_URI,
    { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 }).catch(error => { connection = null; throw error; });
  return connection;
}
