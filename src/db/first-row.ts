/**
 * Unwraps the single row an INSERT ... RETURNING produces. Postgres always
 * returns the inserted row, so an empty result means the driver failed.
 */
export function firstRow<Row>(rows: Row[]): Row {
  const [row] = rows;
  if (row === undefined) {
    throw new Error("Expected the database to return the written row.");
  }
  return row;
}
