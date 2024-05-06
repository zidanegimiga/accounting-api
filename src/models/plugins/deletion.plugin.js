/* eslint-disable no-param-reassign */

const deletion = (schema) => {
  /**
   * Flag mode as deleted
   * @returns {Promise<Schema>}
   */
  schema.methods.flagAsDeleted = async function () {
    const model = this;
    model.is_deleted = true;
    await model.save();
    return model;
  };

  /**
   * Flag mode as deleted
   * @returns {Promise<Schema>}
   */
  schema.methods.hardDelete = async function () {
    const model = this;
    await model.remove();
    return true;
  };
};

module.exports = deletion;
