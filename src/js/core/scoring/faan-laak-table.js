/**
 * A special datastructure for housing the
 * faan/laak scoring conversion values.
 */
class FaakLaakTable {
  constructor(no_point_score=0, limits) {
    this.no_point_score = no_point_score;
    this.limits = limits;
    this.generateConversionTable();
  }

  generateConversionTable() {
    let faan;
    this.table = {};
    let limits = this.limits;

    // base points:
    this.table[0] = this.no_point_score;
    for(faan=1; faan < limits[0]; faan++) this.table[faan] = 2**faan;

    // tiered limits:
    let laak = faan;
    for (let i=0, e=limits.length-1; i<e; i++) {
      let limit_s = limits[i];
      let limit_e = limits[i+1];
      for(let j=limit_s; j < limit_e; j++) this.table[j] = 2**laak;
      laak++;
    }
    this.table[limits.slice(-1)] = 2**laak;
  }

  get(points, selfdraw, limit) {
    let highest_limit = this.limits.slice(-1);
    if (limit || points >= highest_limit) return this.table[highest_limit];
    return this.table[points];
  }
}

export { FaakLaakTable };
