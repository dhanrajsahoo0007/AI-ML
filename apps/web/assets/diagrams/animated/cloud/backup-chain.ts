import type { DiagramSpec } from "@/components/diagrams/types";

// A backup programme, told as the story of the Sunday a stolen admin session deleted Brightpost's review data
// (cloud/resilience/backups-and-vaults).
// Step 1: the review disk is snapshotted at 02:00 into the shop account; the orders database's 03:00 backup is
// copied to a vault in the audit account. Step 2 (the failure step): an attacker with an admin session in the shop
// account deletes the review disk and all 34 of its snapshots; its delete on the vault is refused, because the vault
// lives in another account. Step 3: one backup policy covers every data store unless a tag opts it out, so the
// review disk is now backed up into the vault too. Step 4: a vault lock stops anyone, even the vault's own admins,
// deleting a backup before 35 days. Step 5: every backup is copied to a second region, still in the audit account.
// Step 6: a monthly drill restores from the region-2 copy into the test account and checks the data.
//
// Nodes never move between steps.
//
// Layout: three columns.
//   Left (x 130), the shop account: local snapshots, review disk, orders database.
//   Middle (x 390): the attacker at the top (outside), then the vault and its lock in the audit account.
//   Right (x 672): the backup policy (organisation), the region-2 copy and the restore drill (test account).
// Rows (centres): 95 | 250 | 325 | 400 | 470-480.
// snaps 130,95 | attacker 390,95 | policy 672,95 | disk 130,250 | vault 390,325 | copy2 672,325 |
// orders 130,400 | lock 390,470 | drill 672,480.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 (the free preview and the
// failure) happen in the left and middle columns. The two backup edges reach the vault from above-left and
// below-left at the same slope, so their labels sit apart. The attacker's refused delete runs straight down into
// the vault, with its label placed in the gap between the Outside band and the audit account's tab.
// The Outside zone is a subnet band (inline label, no tab) because two edges leave through its bottom and side.
// Nodes are sized for the longest name the Services toggle shows ("Enforced retention", "Paired-region copy",
// "Persistent Disk", "RDS PostgreSQL").
const spec: DiagramSpec = {
  title: "From snapshots beside the disk to a locked, tested copy in another account",
  width: 795,
  height: 560,
  steps: [
    { title: "Snapshots beside the disk, one copy away" },
    { title: "One admin session deletes every nearby copy" },
    { title: "One policy covers every store" },
    { title: "Lock the vault" },
    { title: "A copy in a second region" },
    { title: "Prove it: a monthly restore drill" },
  ],
  zones: [
    { id: "shop", title: "Shop account", tone: "violet", x: 10, y: 40, w: 240, h: 420 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 295, y: 40, w: 190, h: 110 },
    { id: "audit", title: "Audit account", tone: "blue", x: 295, y: 215, w: 190, h: 305 },
    { id: "org", title: "Organisation", tone: "orange", x: 560, y: 40, w: 225, h: 110 },
    { id: "region2", title: "Audit account, region 2", tone: "blue", x: 560, y: 215, w: 225, h: 165 },
    { id: "test", title: "Test account", tone: "teal", x: 560, y: 415, w: 225, h: 125 },
  ],
  nodes: [
    // Step 1
    {
      id: "snaps",
      label: "Local snapshots",
      sub: "30 nightly + 4 weekly",
      icon: "snapshot",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 95,
      cloud: {
        aws: { id: "aws-ebs", label: "EBS snapshots" },
        gcp: { id: "gcp-persistent-disk", label: "Disk snapshots" },
        azure: { id: "azure-managed-disks", label: "Disk snapshots" },
      },
    },
    {
      id: "disk",
      label: "Review disk",
      sub: "4,100 reviews",
      icon: "disk",
      tone: "violet",
      x: 130,
      y: 250,
      w: 176,
      cloud: {
        aws: { id: "aws-ebs", label: "EBS volume" },
        gcp: { id: "gcp-persistent-disk", label: "Persistent Disk" },
        azure: { id: "azure-managed-disks", label: "Managed Disk" },
      },
    },
    {
      id: "orders",
      label: "Orders database",
      sub: "PostgreSQL",
      icon: "database",
      tone: "violet",
      x: 130,
      y: 400,
      w: 176,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure Postgres" },
      },
    },
    {
      id: "vault",
      label: "Backup vault",
      sub: "audit account",
      icon: "vault",
      tone: "violet",
      variant: "glyph",
      x: 390,
      y: 325,
      cloud: {
        aws: { id: "aws-backup", label: "Backup vault" },
        gcp: { id: "gcp-backup-dr", label: "Backup vault" },
        azure: "azure-backup",
      },
    },

    // Step 2: the failure
    {
      id: "attacker",
      label: "Attacker",
      sub: "stolen admin session",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 390,
      y: 95,
      w: 176,
    },

    // Step 3
    {
      id: "policy",
      label: "Backup policy",
      sub: "every store, opt-out",
      icon: "policy",
      tone: "orange",
      step: 3,
      x: 672,
      y: 95,
      w: 180,
      cloud: {
        aws: { id: "aws-backup", label: "Backup plan" },
        gcp: { id: "gcp-backup-dr", label: "Backup plan" },
        azure: { id: "azure-backup", label: "Backup policy" },
      },
    },

    // Step 4
    {
      id: "lock",
      label: "Vault lock",
      sub: "35 days, no early delete",
      icon: "lock",
      tone: "red",
      step: 4,
      x: 390,
      y: 470,
      w: 190,
      cloud: {
        aws: { id: "aws-backup", label: "Vault Lock" },
        gcp: { id: "gcp-backup-dr", label: "Enforced retention" },
        azure: { id: "azure-backup", label: "Immutable vault" },
      },
    },

    // Step 5
    {
      id: "copy2",
      label: "Region 2 copy",
      sub: "locked 35 days",
      icon: "vault",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 672,
      y: 325,
      cloud: {
        aws: { id: "aws-backup", label: "Copy in region 2" },
        gcp: { id: "gcp-backup-dr", label: "Multi-region vault" },
        azure: { id: "azure-backup", label: "Paired-region copy" },
      },
    },

    // Step 6
    {
      id: "drill",
      label: "Restore drill",
      sub: "monthly, 41 min",
      icon: "history",
      tone: "teal",
      step: 6,
      x: 672,
      y: 480,
      w: 180,
      cloud: {
        aws: { id: "aws-backup", label: "Restore testing" },
        gcp: { id: "gcp-backup-dr", label: "Test restore" },
        azure: { id: "azure-backup", label: "Test restore" },
      },
    },
  ],
  edges: [
    // Step 1: the disk's snapshots stay beside it; only the orders backup leaves the account.
    { from: "disk", to: "snaps", label: "02:00 snapshot", packet: true },
    { from: "orders", to: "vault", label: "03:00 copy", packet: true, delay: 1 },

    // Step 2: one admin session in the shop account deletes everything there; the vault is in another account.
    { from: "attacker", to: "snaps", label: "deletes all 34", tone: "red", packet: true, step: 2 },
    { from: "attacker", to: "disk", label: "deletes disk", tone: "red", packet: true, delay: 0.8, step: 2 },
    {
      from: "attacker",
      to: "vault",
      label: "delete: refused",
      tone: "red",
      dashed: true,
      labelAt: 0.35,
      step: 2,
    },

    // Step 3: the policy runs every night and includes any store not tagged out, so the disk is backed up too.
    { from: "policy", to: "vault", label: "runs nightly", dashed: true, flow: true, labelAt: 0.4, step: 3 },
    { from: "disk", to: "vault", label: "now included", packet: true, step: 3 },

    // Step 4: the lock refuses any early delete, from the shop or from the audit account's own admins.
    { from: "lock", to: "vault", label: "guards", dashed: true, step: 4 },

    // Step 5: a second copy in another region, still in the audit account.
    { from: "vault", to: "copy2", label: "copy to region 2", packet: true, step: 5 },

    // Step 6: the drill restores from the far copy into the test account and checks the rows.
    { from: "copy2", to: "drill", label: "restore + check", packet: true, step: 6 },
  ],
};

export default spec;
