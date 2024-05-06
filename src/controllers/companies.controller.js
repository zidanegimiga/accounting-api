const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const {companyService, activityLogService, userService} = require('../services');
const {createSubTypeCompanyAccount,createStandardCompanyAccount,createShadowCompanyAccount}=require('../controllers/accountConfig.controller');

const logActivity = async (userId, module, moduleInfo, action, data) => {
    const user = await userService.getUserById(userId);
    const activity = {
      user,
      module,
      module_info: moduleInfo,
      action,
      data,
    };
    await activityLogService.createLog(activity);
};

const createCompany = catchAsync(async (req, res) => {
    const company = await companyService.createCompany(req.body);
    if (req.body.is_parent_org){
        const user = await userService.updateUserCompanyById(req.user._id, company.company._id);
        logActivity(req.user._id, 'user updated', user, 'new company added to user', req.body);
    }
    const companyPayload=company.company
    !companyPayload.city_code && (companyPayload.city_code=companyPayload.state_code)
    await createStandardCompanyAccount(companyPayload)
    await createSubTypeCompanyAccount(companyPayload)
    // await createShadowCompanyAccount(companyPayload)
    logActivity(req.user._id, 'new company', company, 'user created new company', req.body);
    res.status(httpStatus.CREATED).send({data:company});
});

const getAllCompany = catchAsync(async (req, res) => {
    const filter = { is_deleted: 0 };
    const result = await companyService.getCompany(filter);
    for (let index = 0; index < result.companies.length; index++) {
        result.companies[index].parentID = result.companies[index].parent_company_id.toString()
        result.companies[index].id = result.companies[index]._id.toString()        
    }  

    const arrayToTree = (arr, parent = '0') =>
                            arr
                                .filter(item => item.parentID === parent)
                                .map(child => 
                                    ({ ...child, name: child.company_name, logo: child.company_logo, children: arrayToTree(arr,child.id) })
                                );


    let company_tree = arrayToTree(result.companies)
    res.status(httpStatus.OK).send({data:company_tree});
});

const getAllParentCompany = catchAsync(async (req, res) => {
    const filter = { is_deleted: 0 };
    const project = {_id: 1, company_name: 1}
    const result = await companyService.queryCompanies(filter, project);
    res.status(httpStatus.OK).send({data:result});
});

const getCompanyById = catchAsync(async (req, res) => {
    const result = await companyService.getCompanyById(req.params.id);
    res.status(httpStatus.OK).send({data:result});
});

const updateCompany = catchAsync(async (req, res) => {
    const result = await companyService.updateCompanyById(req.params.id, req.body);
    // logActivity(tag.user_id, 'journal_tags', tag, 'user updated a journal tag', req.body);
    logActivity(req.user._id, 'update company', result, 'user updated a company', req.body);
    res.status(httpStatus.OK).send({data:result});
});


module.exports = {
createCompany,
getAllCompany,
getCompanyById,
updateCompany,
getAllParentCompany
};
