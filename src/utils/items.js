const counts = (items) =>
  items.reduce((out, item) => {
    const type = typeof item === "string" ? item : item.type;
    out[type] = (out[type] || 0) + 1;
    return out;
  }, {});
export { counts };
