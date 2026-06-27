const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await mongoose.connection.collection('exams').updateMany({}, { $set: { isLocked: false } });
  console.log('All exams unlocked');
  process.exit();
});