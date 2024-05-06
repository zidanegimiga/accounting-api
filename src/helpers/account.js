const accounts=[
    {
        name:'Sales',
        account_id:'',
        account_type:'640079d85869003cd8455cb6',
        details_type:null,
        standard:true,
        description:'',
        parent_account_id:'640079d85869003cd8455cb6',
        parent_account_name:'Income',
        currency:'AED',
        code:'SL',
        is_balance_sheet:false,
        base_view:true,
        account_id:'AC-0001'
    },
    {
        name:'VAT Payable',
        account_id:'',
        account_type:'640078d95869003cd8455cac',
        details_type:null,
        standard:true,
        description:'',
        parent_account_id:'640078d95869003cd8455cac',
        parent_account_name:'Current Liabilities',
        currency:'AED',
        code:'VP',
        is_balance_sheet:true,
        base_view:true,
        account_id:'AC-0002'
    },
    {
        name:'Accounts Payable',
        account_id:'',
        account_type:'640085435869003cd8455d11',
        details_type:null,
        standard:true,
        description:'',
        parent_account_id:'640085435869003cd8455d11',
        parent_account_name:'Accounts Payable (A/P)',
        currency:'AED',
        code:'AP',
        is_balance_sheet:true,
        base_view:true,
        account_id:'AC-0003'

    },
    {
        name:'Bad debts',
        account_id:'',
        account_type:'640081335869003cd8455cdc',
        details_type:null,
        standard:true,
        description:'',
        parent_account_id:'640081335869003cd8455cdc',
        parent_account_name:'Bad debts',
        currency:'AED',
        code:'BD',
        is_balance_sheet:false,
        base_view:true,
        account_id:'AC-0004'
    },
        {
        name:'Accounts Receivable',
        account_id:'',
        account_type:'640081335869003cd8455ce1',
        details_type:null,
        standard:true,
        description:'',
        parent_account_id:'640081335869003cd8455ce1',
        parent_account_name:'Accounts Receivable (A/R)',
        currency:'AED',
        code:'AR',
        is_balance_sheet:false,
        base_view:true,
        account_id:'AC-0005'
    }
 ]

 const getAccounts = () => {
    return accounts;
  };
  
  module.exports = {
    getAccounts,
  };