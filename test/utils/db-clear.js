const User = require('./user-factory')();

module.exports = async () => {
  await User.query().delete();
};
