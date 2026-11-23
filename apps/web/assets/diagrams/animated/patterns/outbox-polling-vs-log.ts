import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n, optionColumns, optionColumnsSize } from "@/components/diagrams/presets/patterns";

// Two ways to run the outbox relay, compared on the same five questions (outbox-and-cdc, Technical mechanics). A
// polling publisher queries the outbox table on a timer; a log-tailing relay reads the database's write-ahead log
// through a replication slot.
//
// Working (illustrative relay settings, Brightpost numbers from presets/patterns.ts SHOP):
//   Polling every 1 s, up to 500 rows a query: a row waits 0.5 s on average before the next poll picks it up.
//   Sale-day peak 300 orders/s = 300 outbox rows a second < 500 per poll, so one relay keeps up.
//   Queries a day = 86,400 s ÷ 1 s = 86,400, whether or not any order arrived.
//   Log tailing: lag in the tens of milliseconds (illustrative; it depends on the connector and the broker).
// Layout: optionColumns (row labels left, two columns of 260). No steps: a comparison, not a story.
// Colours (PATTERN_TONE): polling teal (a compute job), log tailing green (the relay this page recommends); the one
// red cell is what a stopped log reader does to the database's disk.
// Fact check (2026-11-16): PostgreSQL docs, "replication slots can cause the server to retain so many WAL segments that
// they fill up the space allocated for pg_wal"; `max_slot_wal_keep_size` (PostgreSQL 13+, default -1, unlimited) caps
// it. Debezium's 2019 outbox post deletes the outbox row in the same transaction; the log still carries the insert.

const POLL_S = 1;
const PER_POLL = 500;
const perPollAtPeak = SHOP.peakOrdersPerSecond * POLL_S; // 300 rows, under the 500-row batch
const queriesPerDay = SHOP.secondsPerDay / POLL_S; // 86,400

const opts = {
  rowLabels: ["Finds new rows", "Average lag", "Load at the peak", "Relay down 6 hours", "Sent rows"],
  colW: 260,
  labelW: 140,
  columns: [
    {
      id: "poll",
      title: "Polling publisher",
      tone: PATTERN_TONE.compute,
      rows: [
        { label: `Queries every ${POLL_S} s`, sub: `up to ${PER_POLL} unsent rows` },
        { label: `${(POLL_S / 2).toFixed(1)} s`, sub: "half the poll interval" },
        { label: `${perPollAtPeak} rows per query`, sub: `${n(queriesPerDay)} queries a day, busy or not` },
        { label: "Rows wait in the table", sub: "caught up when it restarts" },
        { label: "Mark sent, delete nightly", sub: "an index on the unsent rows" },
      ],
    },
    {
      id: "log",
      title: "Log-tailing relay",
      tone: PATTERN_TONE.pattern,
      highlight: true,
      rows: [
        { label: "Reads the write-ahead log", sub: "through a replication slot" },
        { label: "Tens of milliseconds", sub: "illustrative" },
        { label: "No queries on the table", sub: "one log reader" },
        { label: "Slot keeps all WAL", sub: "pg_wal grows until the disk fills", tone: PATTERN_TONE.fail },
        { label: "Delete in the same transaction", sub: "the log keeps the insert" },
      ],
    },
  ],
};

const size = optionColumnsSize(opts);
const PAD = 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Polling relay against log-tailing relay",
  width: size.width + 2 * PAD,
  height: size.height + 2 * PAD,
  shapes: optionColumns("cmp", PAD, PAD, opts),
};

export default spec;
