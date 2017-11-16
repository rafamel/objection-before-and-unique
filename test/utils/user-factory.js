const Model = require('objection').Model;
const beforeUnique = require('../../lib');

module.exports = (buildObj = {}) => {
    return class User extends beforeUnique(buildObj)(Model) {
        static get tableName() { return 'users'; }
    };
};
