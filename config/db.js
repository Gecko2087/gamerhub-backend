import mongoose from 'mongoose';

export default function connect() {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('✅  MongoDB online'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
