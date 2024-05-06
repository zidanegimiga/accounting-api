module.exports = {
  success: (data, message = '') => {
    return {
      success: true,
      data,
      message,
    };
  },
  error: (message) => {
    return {
      success: false,
      message,
    };
  },
};
