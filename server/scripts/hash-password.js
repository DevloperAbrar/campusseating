// Usage: node scripts/hash-password.js "Abrar@123"
const bcrypt = require("bcryptjs");
const password = process.argv[2];
if (!password) { console.error("Usage: node hash-password.js <password>"); process.exit(1); }
bcrypt.hash(password, 12).then((hash) => console.log(hash));