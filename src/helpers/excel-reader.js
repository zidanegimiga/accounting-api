const formatRow = (row, header) => {
    return new Promise((resolve) => {
        const item = {}
        row.forEach(async (field, i, array) => {
            item[header[i]] = field
            
            if(i === array.length - 1) {
                resolve(item)
            }
        })
    })
}

module.exports = {
    formatRow,
};
