import type { DiagramSpec } from "@/components/diagrams/types";
import { FLASH_SALE, ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A timed hold on a kettle during the flash sale (concurrency-and-locking, the Architecture figure).
// Four steps: 1 add to basket: take one from stock and place a 10-minute hold (Redis SET NX EX 600, or a row with
// expires_at) · 2 pay within the hold · 3 confirm: the order is written and the hold deleted · 4 the other path: no
// payment in 10 minutes, the hold expires and an expiry job returns the kettle to stock.
// Layout (860 × 440): shopper at x 90; checkout (accent) at x 355 with the card provider above and orders below;
// stock, holds and the expiry job in a column at x 640, the expiry job's return edge routed round the right side.
// Colours (PATTERN_TONE): shopper orange (traffic), checkout teal (compute), holds and stock violet (stores), the expiry
// job lime (a check), the card provider neutral (infra).
// Fact check (2026-11-16): Redis SET with NX sets the key only if it does not exist and returns nil otherwise; EX sets
// the expiry in seconds, so SET hold:4471 shopper NX EX 600 is a 10-minute hold.

const holdSeconds = FLASH_SALE.holdMinutes * 60;

const spec: DiagramSpec = {
  title: "A timed hold during the flash sale",
  width: 860,
  height: 440,
  steps: [
    { title: "Add to basket: a 10-minute hold" },
    { title: "Pay within the hold" },
    { title: "Confirm: write the order, drop the hold" },
    { title: "No payment: the hold expires" },
  ],
  zones: [],
  nodes: [
    {
      id: "shopper",
      label: "Shopper",
      sub: `1 of ${(FLASH_SALE.shoppers / 1000).toFixed(0)}k`,
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 90,
      y: 220,
      w: 140,
    },
    {
      id: "checkout",
      label: "Checkout",
      sub: "reserve, pay, confirm",
      icon: "server",
      tone: PATTERN_TONE.compute,
      accent: true,
      x: 355,
      y: 220,
      w: 190,
    },
    {
      id: "stock",
      label: "Stock",
      sub: `${FLASH_SALE.item}: ${FLASH_SALE.stock.toLocaleString("en-GB")}`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 640,
      y: 110,
      w: 170,
    },
    {
      id: "holds",
      label: "Holds",
      sub: `NX EX ${holdSeconds}`,
      icon: "timer",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 640,
      y: 240,
      w: 170,
    },

    {
      id: "psp",
      label: "Card provider",
      icon: "coin",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 2,
      x: 355,
      y: 75,
      w: 170,
    },

    {
      id: "orders",
      label: "Orders",
      sub: `order ${ORDER.orderId}`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 355,
      y: 370,
      w: 170,
    },

    {
      id: "expiry",
      label: "Expiry job",
      sub: "return held stock",
      icon: "clock",
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step: 4,
      x: 640,
      y: 370,
      w: 170,
    },
  ],
  edges: [
    { from: "shopper", to: "checkout", label: "add to basket", packet: true },
    { from: "checkout", to: "stock", label: "stock − 1 if > 0", packet: true, delay: 0.4 },
    { from: "checkout", to: "holds", label: "hold 10 min", packet: true, delay: 0.6 },

    { from: "checkout", to: "psp", label: `charge £${ORDER.price}`, packet: true, step: 2 },

    { from: "checkout", to: "orders", label: "confirm", packet: true, step: 3 },

    { from: "holds", to: "expiry", label: "expired", dashed: true, step: 4 },
    {
      from: "expiry",
      to: "stock",
      label: "stock + 1",
      dashed: true,
      step: 4,
      via: [
        [810, 370],
        [810, 110],
      ],
    },
  ],
};

export default spec;
