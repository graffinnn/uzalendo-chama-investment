const bcrypt = require('bcryptjs');

const hashPassword = async (plainText) => {
  return bcrypt.hash(plainText, 12);
};

const verifyPassword = async (plainText, hash) => {
  return bcrypt.compare(plainText, hash);
};

module.exports = { hashPassword, verifyPassword };