type MigrationJournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

declare const migrations: {
  journal: {
    entries: MigrationJournalEntry[];
  };
  migrations: Record<string, string>;
};

export default migrations;
