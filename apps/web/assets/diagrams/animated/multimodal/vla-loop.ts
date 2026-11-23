import type { DiagramSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { OPENVLA } from "@/components/diagrams/presets/production-vla";

// "The vision-language-action loop" on the Robotics & VLA page: a warehouse picking arm at Brightpost, told as one trip
// round the loop. The instruction ("pick the kettle for order 4471") and a camera image go to the model; it returns one
// action (7 numbers, see action-tokenization); the controller turns it into motion; the arm moves and the shelf looks
// different; the camera sees it; the model is asked again. The control rate is a published figure: OpenVLA runs at about
// 6 Hz on one RTX 4090 (arXiv 2406.09246), so 1,000 / 6 = 167 ms between actions.
//
// Steps: 1 the instruction and a camera image reach the model · 2 the model returns one action to the controller · 3 the controller moves
// the arm · 4 the shelf changes and the camera sees it · 5 the loop repeats at the control rate. Nodes never move.
// Layout (centres): instruction (150, 80) · model (440, 170) · controller (730, 170) · camera (150, 330) · shelf (440, 330)
// · arm (730, 330) · loop clock (440, 40). Loop: model -> controller -> arm -> shelf -> camera -> model.
// Colours (MODALITY_TONE + PROD_TONE): instruction orange (text), camera and shelf blue (images), the model green (the
// accent), controller and arm teal (a robot action), the clock neutral.

const spec: DiagramSpec = {
  title: "The vision-language-action loop: a warehouse arm picks a kettle",
  width: 880,
  height: 410,
  steps: [
    { title: "The instruction and a camera image reach the model" },
    { title: "The model returns one action" },
    { title: "The controller moves the arm" },
    { title: "The shelf changes and the camera sees it" },
    { title: "The loop repeats, about six times a second" },
  ],
  zones: [],
  nodes: [
    {
      id: "instr",
      label: "Instruction",
      sub: `pick the ${BRIGHTPOST.item}, order ${BRIGHTPOST.orderId}`,
      icon: "message-square",
      tone: MODALITY_TONE.text,
      fill: "pastel",
      x: 150,
      y: 80,
      w: 230,
    },
    {
      id: "camera",
      label: "Camera",
      sub: "image of the shelf",
      icon: "image",
      tone: MODALITY_TONE.image,
      variant: "glyph",
      x: 150,
      y: 330,
    },
    {
      id: "model",
      label: "VLA model",
      sub: "image + words in, action out",
      icon: "model",
      tone: MODALITY_TONE.model,
      accent: true,
      x: 440,
      y: 170,
      w: 212,
    },
    {
      id: "ctrl",
      label: "Robot controller",
      sub: "action to joint motion",
      icon: "controller",
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 2,
      x: 750,
      y: 170,
      w: 180,
    },
    {
      id: "arm",
      label: "Picking arm",
      sub: "reaches and grips",
      icon: "robot",
      tone: PROD_TONE.compute,
      variant: "glyph",
      step: 3,
      x: 750,
      y: 330,
    },
    {
      id: "shelf",
      label: "Warehouse shelf",
      sub: "the scene changes",
      icon: "package",
      tone: MODALITY_TONE.image,
      fill: "pastel",
      step: 4,
      x: 440,
      y: 330,
      w: 190,
    },
    {
      id: "clock",
      label: "Control rate",
      sub: `about ${OPENVLA.hz} a second`,
      icon: "timer",
      tone: PROD_TONE.infra,
      fill: "pastel",
      step: 5,
      x: 440,
      y: 40,
      w: 190,
    },
  ],
  edges: [
    { from: "instr", to: "model", label: "words", packet: true },
    { from: "camera", to: "model", label: "image", packet: true },
    { from: "model", to: "ctrl", label: "7 numbers", packet: true, step: 2 },
    { from: "ctrl", to: "arm", label: "joint targets", packet: true, step: 3 },
    { from: "arm", to: "shelf", label: "moves, grips", packet: true, step: 4 },
    { from: "shelf", to: "camera", label: "new image", packet: true, step: 4 },
    { from: "clock", to: "model", label: `${OPENVLA.periodMs} ms`, dashed: true, flow: true, step: 5 },
  ],
};

export default spec;
