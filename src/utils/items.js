const counts = (items) =>
  items.reduce((out, type) => {
    out[type] = (out[type] || 0) + 1;
    return out;
  }, {});
export { counts };
