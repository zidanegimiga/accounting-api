const queryExpense = async (filter, search, limit, pageNo) => {
    var nPerPage = parseInt(limit)
    var page = parseInt(pageNo)
    var filterField = {
      $and: [{
        is_deleted: 0
      }]
    };
    const initialAggregateArray = [{
      $match: filter
    },
    {
      $lookup: {
        from: 'customers',
        let: {
          customer: '$payee',
        },
        pipeline: [{
          $match: {
            $expr: {
              $and: [{
                $eq: ['$_id', '$$customer']
              }]
            }
          }
        },
        {
          $project: {
            _id: 1,
            customer_name: 1,
          },
        },
        ],
        as: 'payeeInfo',
      },
    },
    {
      $addFields: {
        customer: {
          $arrayElemAt: ['$customerInfo', 0]
        }
      }
    },
    {
      $project: {
        customerInfo: 0,
      },
    },
    ];
   
    if (search) {
      filterField.$and.push({
        $or: [{
         expense_number: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
   
        ],
      });
      initialAggregateArray[4] = {
        $match: filterField
      };
    }
    const filteredFieldArray = [
    {
      $sort: {
        created_at: 1
      },
    },
    { $skip: page == 0 ? page : page * nPerPage },
    { $limit: nPerPage }
    ];
    const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];
    const expenses = await Expense.aggregate(aggregateArray);
    const total_count = await Expense.find(filterField).count()
    const total_page = Math.ceil(total_count / nPerPage);
    return {
     expenses,
      total_count,
      total_page
    };
   };

   here payee is lookup in payee customer or in supplier collction  please fix this