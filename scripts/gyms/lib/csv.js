// Minimal RFC4180-ish CSV line parser (stdlib only, no dependency). Handles
// double-quoted fields with embedded commas and escaped quotes ("").
// Does NOT handle a quoted field containing a literal newline — none of
// this pipeline's CSV sources (NI Active Places, Companies House, ONSPD,
// the ONSPD lookup tables) use multi-line fields.

/**
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  const len = line.length;
  while (i <= len) {
    let field = '';
    if (line[i] === '"') {
      i += 1;
      while (i < len) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i += 1;
            break;
          }
        } else {
          field += line[i];
          i += 1;
        }
      }
    } else {
      while (i < len && line[i] !== ',') {
        field += line[i];
        i += 1;
      }
    }
    fields.push(field);
    if (line[i] === ',') {
      i += 1;
    } else {
      break;
    }
  }
  return fields;
}

/**
 * Parse a header line into column names.
 * @param {string} headerLine
 * @returns {string[]}
 */
function parseCsvHeader(headerLine) {
  return parseCsvLine(headerLine).map((h) => h.trim());
}

/**
 * Zip a header array and a data-line's fields into a plain object.
 * @param {string[]} header
 * @param {string} line
 * @returns {Record<string,string>}
 */
function csvLineToRecord(header, line) {
  const fields = parseCsvLine(line);
  const record = {};
  for (let i = 0; i < header.length; i += 1) {
    record[header[i]] = fields[i] !== undefined ? fields[i] : '';
  }
  return record;
}

module.exports = { parseCsvLine, parseCsvHeader, csvLineToRecord };
