/* eslint-disable no-param-reassign */

const paginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (filter, options) {
    let sort = '';
    if (options.sortBy) {
      const sortingCriteria = {};
      options.sortBy.split(',').forEach((sortOption) => {
        let [key, order] = sortOption.split(':');
        order = order === 'desc' || order === '-1' ? -1 : 1;
        sortingCriteria[key] = order;
      });

      sort = sortingCriteria;
    } else {
      sort = { created_at: -1 };
    }

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    const countPromise = this.countDocuments(filter).exec();
    let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate) {
      options.populate.split(',').forEach((populateOption) => {
        docsPromise = docsPromise.populate(
          populateOption
            .split('.')
            .reverse()
            .reduce((a, b) => ({ path: b, populate: a }))
        );
      });
    }

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults / limit);
      const result = {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  };
  schema.statics.paginateLookup = async function (filter, options, body = []) {
    let sort = {};
    if (options.sortBy) {
      const sortingCriteria = {};
      options.sortBy.split(',').forEach((sortOption) => {
        let [key, order] = sortOption.split(':');
        order = order === 'desc' || order === '-1' ? -1 : 1;
        sortingCriteria[key] = order;
      });
      sort = sortingCriteria;
    } else {
      sort = {
        created_at: -1,
      };
    }
    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;
    const initialPipeline = [
      {
        $match: filter,
      },
      ...body,
    ];
    const additionalQueries = [
      { $set: { id: '$_id' } },
      {
        $sort: sort,
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];
    // const countPromise = this.countDocuments(filter).exec();
    const countPromise = this.aggregate([...initialPipeline, { $count: 'count' }]);
    const docsPromise = this.aggregate([...initialPipeline, ...additionalQueries]);
    // const docsCountPromise = this.aggregate(countPipeline);
    // let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit);
    return Promise.all([countPromise, docsPromise]).then((values) => {
      let [totalResults, results] = values;
      totalResults = totalResults.length > 0 ? totalResults[0].count : 0;
      const totalPages = Math.ceil(totalResults / limit);
      const result = {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  };

  schema.statics.paginateSelect = async function (filter, options, select) {
    let sort = '';
    if (options.sortBy) {
      const sortingCriteria = {};
      options.sortBy.split(',').forEach((sortOption) => {
        let [key, order] = sortOption.split(':');
        order = order === 'desc' || order === '-1' ? -1 : 1;
        sortingCriteria[key] = order;
      });

      sort = sortingCriteria;
    } else {
      sort = { created_at: -1 };
    }

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    const countPromise = this.countDocuments(filter).exec();
    let docsPromise = this.find(filter).select(select).sort(sort);
    // let docsPromise = sorted.skip(skip).limit(limit);

    if (options.populate) {
      options.populate.split(',').forEach((populateOption) => {
        docsPromise = docsPromise.populate(
          populateOption
            .split('.')
            .reverse()
            .reduce((a, b) => ({ path: b, populate: a }))
        );
      });
    }

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults / limit);
      const result = {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  }
};

module.exports = paginate;
