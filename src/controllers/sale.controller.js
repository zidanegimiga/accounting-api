const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const {saleService} = require('../services');
const { ObjectId } = require('mongodb');

  const getSaleLocation = catchAsync(async (req, res) => {
    const result = await saleService.getSaleLocation();
    res.status(httpStatus.OK).send({data:result});
  });

  const getAll = catchAsync(async (req, res) => {
    const { search, limit, page } = req.query;
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter = { is_deleted: 0,  company: { $in: companyIds }};
    const data=await saleService.querySalesAndDebitNotes(filter, search, limit, page)
    res.status(httpStatus.OK).send({ data: data });
  });

  const getSaleMenu = catchAsync(async (req, res) => {
    const result = await saleService.getSaleMenu();
    res.status(httpStatus.OK).send({data:result});
  });




module.exports = {
    getSaleLocation,
    getAll,
    getSaleMenu
};
