const moment = require('moment');

const getDueDate = (terms, dateInfo) => {
  const { name, days } = terms;
  let due_date = '';
  const newDateInfo = moment(dateInfo, 'YYYY-MM-DD');
  if (days != null) {
    due_date = newDateInfo.add(days, 'days');
  } else if (name == 'Due on Receipt') {
    due_date = newDateInfo;
  } else if (name == 'Due end of next month') {
    due_date = moment(newDateInfo).add(1, 'months').endOf('month');
  } else if (name == 'Due end of the month') {
    due_date = moment(newDateInfo).endOf('month');;
  }
  return due_date;
};

function twoDecimalsAndPositive(value){
  let val = 0.0
  if (value && Number(value) !== 0) {
    if(typeof value == 'string'){
      value = Math.abs(Number(value))
    }else if(typeof value == 'number'){
      value = Math.abs(value)
    }
    
    let newValue = parseFloat(value).toFixed(2)
    const numberFormatter = Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
    const formatted = numberFormatter.format(newValue)
    val = formatted
  } else if (Number(value) == 0) {
    val = 0.0
  } else val = 0.0
  return val
}





module.exports = {
  getDueDate,
};
