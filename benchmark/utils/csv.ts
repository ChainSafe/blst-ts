export class Csv<K extends string> {
  rows: Record<K, number>[] = [];

  addRow(row: Record<K, number>) {
    this.rows.push(row);
  }

  print(): string {
    if (this.rows.length < 1) return "";

    const keys = Object.keys(this.rows[0]) as K[];
    return [
      keys.join(", "),
      ...this.rows.map((row) => keys.map((key) => row[key]).join(", ")),
    ].join("\n");
  }

  logToConsole(): void {
    console.log(`
CSV
\`\`\`
${this.print()}
\`\`\`
`);
  }
}
