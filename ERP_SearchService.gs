function globalSearch(query) {
  if (!query || query.length < 3) return [];
  query = query.toLowerCase();
  const shipments = getMasterDataList("SHIPMENTS");
  let results = [];
  shipments.forEach(s => {
    const searchString = `${s.Job_No} ${s.BL_No} ${s.Container_No} ${s.Importer} ${s.Supplier}`.toLowerCase();
    if (searchString.includes(query)) results.push(s);
  });
  return results;
}
