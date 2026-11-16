import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The object design of one machine (vending-machine, Step 1 and Deep dive 1: the class diagram the interviewer asks
// for). Two steps: 1 the parts: the VendingMachine owns an Inventory of slots (each holds a product and a count), a
// ChangeMaker with coin tubes, a Dispenser (motor and drop sensor) and an EventLog (append with a sequence number,
// upload later) · 2 the two seams: the machine delegates every button and coin to its current State object (IdleState,
// HasCreditState, AuthorisingState, DispensingState, SettlingState, RefundingState), and takes money through a
// PaymentMethod (CashPayment, CardPayment), so a new state or a new way to pay is a new class.
// Layout (880 × 556): rows at y 20, 120, 250, 370, 480. The machine sits in the middle of row 2 with PaymentMethod on
// its left and State on its right (step 2), their implementations above them; the four parts fan out below on row 3
// (x 20, 230, 440, 650, w 180); Slot, CoinTube and Product hang under the parts that hold them.
// Colours (PATTERN_TONE): the machine and its stores violet, the hardware teal, money orange, the State and
// PaymentMethod seams and their implementations green (the part this figure is about).

const H = 56;
const R = [20, 120, 250, 370, 480];

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE],
  step = 1
): LayoutShape => ({ id, type: "box", x, y, w, h: H, label, sub, tone, fill: "pastel", step });

const arrow = (id: string, from: string, to: string, label?: string, step = 1, dashed = false): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
  dashed,
});

const shapes: LayoutShape[] = [
  box("machine", 260, R[1], 200, "VendingMachine", "state, parts, events", PATTERN_TONE.store),
  box("inventory", 20, R[2], 180, "Inventory", "slots by code", PATTERN_TONE.store),
  box("change", 230, R[2], 180, "ChangeMaker", "makeChange(cents)", PATTERN_TONE.traffic),
  box("dispenser", 440, R[2], 180, "Dispenser", "motor, drop sensor", PATTERN_TONE.compute),
  box("eventlog", 650, R[2], 180, "EventLog", "append(seq), upload", PATTERN_TONE.store),
  box("slot", 20, R[3], 180, "Slot", "code, count, price", PATTERN_TONE.store),
  box("tube", 230, R[3], 180, "CoinTube", "value, count", PATTERN_TONE.traffic),
  box("product", 20, R[4], 180, "Product", "name, SKU", PATTERN_TONE.store),

  box("payment", 20, R[1], 170, "PaymentMethod", "authorise, settle", PATTERN_TONE.pattern, 2),
  box("state", 520, R[1], 190, "State", "insert, select, cancel", PATTERN_TONE.pattern, 2),
  box("pay-impl", 20, R[0], 170, "CashPayment", "CardPayment", PATTERN_TONE.pattern, 2),
  box("state-impl", 520, R[0], 190, "IdleState", "HasCredit, Dispensing…", PATTERN_TONE.pattern, 2),

  arrow("m-inv", "machine", "inventory"),
  arrow("m-change", "machine", "change"),
  arrow("m-disp", "machine", "dispenser"),
  arrow("m-log", "machine", "eventlog"),
  arrow("inv-slot", "inventory", "slot", "1..n"),
  arrow("slot-product", "slot", "product", "holds"),
  arrow("change-tube", "change", "tube", "1..n"),

  arrow("m-state", "machine", "state", "current", 2),
  arrow("m-pay", "machine", "payment", "uses", 2),
  arrow("si-state", "state-impl", "state", "implements", 2, true),
  arrow("pi-pay", "pay-impl", "payment", "implements", 2, true),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The classes of one vending machine",
  width: 880,
  height: R[4] + H + 20,
  steps: [{ title: "The machine and its parts" }, { title: "State and payment as seams" }],
  shapes,
};

export default spec;
