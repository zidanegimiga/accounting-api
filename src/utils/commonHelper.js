module.exports = {
  getAlphabets() {
    return 'abcdefghijklmnopqrstuvwxyz';
  },
  getIndexofAlphabet(index) {
    const alphabet = this.getAlphabets();
    return alphabet.charAt(index);
  },
};
