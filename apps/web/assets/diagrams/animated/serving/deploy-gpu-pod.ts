import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC } from "@/components/diagrams/presets/production";
import { WEIGHTS_GB } from "@/components/diagrams/presets/production-deploy";

// One GPU node serving Brightpost's 8 B model (containerization-orchestration, Architecture). The general cluster
// (control plane, nodes, request path) is on cloud/k8s-cluster-anatomy and is linked from the page, not reused: that
// figure has no GPU, device plugin, weights or probes, so this one draws only the GPU node and what it needs.
//
// Six steps: 1 the device plugin tells the scheduler the node has GPUs · 2 the scheduler places the engine pod, which
// asks for 1 GPU · 3 the weights arrive on the model volume · 4 the engine loads them into the GPU and uses shared
// memory for its workers · 5 the readiness probe asks the engine "ready?" · 6 only then does the Service send requests.
// Nodes never move; the Service edge (step 6) and probe edge (step 5) are the last to appear.
//
// Fact checks (Kubernetes and NVIDIA docs, checked November 2026): GPUs are an extended resource named nvidia.com/gpu,
// set under resources.limits (a request, if given, must equal the limit); the NVIDIA device plugin advertises the
// node's GPUs to the kubelet; a probe is run by the kubelet; a Service sends traffic only to pods that are ready.
//
// Layout (880 × 420): three outside nodes on the left at x 85 (scheduler y 85, object storage y 205, Service y 335);
// one zone "GPU node" x 175..865 holding a 3 × 3 grid at columns x 290, 540, 770 and rows y 85, 205, 335. Row 1: device
// plugin (290) and shared memory (770 → column c, above the engine at 540? no: shared memory sits above the engine at
// x 540). Row 2: model volume (290), engine pod (540, accent). Row 3: readiness probe (540). The engine's right-hand
// space (x 770) is left empty on purpose so edge pills have room.
// Colours (four tones plus neutral): the Service orange (traffic), the engine teal (compute), volume, shared memory and
// object storage violet (stores), the probe lime (a check); scheduler and device plugin neutral (control).

const COL = { out: 80, a: 335, b: 670 } as const;
const ROW = { top: 85, mid: 205, bottom: 335 } as const;

const spec: DiagramSpec = {
  title: "One GPU node serving an LLM",
  width: 880,
  height: 420,
  steps: [
    { title: "The device plugin reports the node's GPUs" },
    { title: "The scheduler places a pod that asks for one" },
    { title: "The weights arrive on the model volume" },
    { title: "The engine loads them and shares memory with its workers" },
    { title: "The readiness probe asks if the engine can answer" },
    { title: "Only then does the Service send requests" },
  ],
  zones: [{ id: "node", title: "GPU node", tone: PROD_TONE.compute, x: 225, y: 25, w: 640, h: 380 }],
  nodes: [
    {
      id: "scheduler",
      label: "Scheduler",
      sub: "finds a node",
      icon: "controller",
      tone: PROD_TONE.infra,
      x: COL.out,
      y: ROW.top,
      w: 140,
    },
    {
      id: "plugin",
      label: "Device plugin",
      sub: "advertises GPUs",
      icon: "node",
      tone: PROD_TONE.infra,
      x: COL.a,
      y: ROW.top,
      w: 150,
    },
    {
      id: "storage",
      label: "Object store",
      sub: `weights, ${WEIGHTS_GB} GB`,
      icon: "blob",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 3,
      x: COL.out,
      y: ROW.mid,
      w: 140,
    },
    {
      id: "volume",
      label: "Model volume",
      sub: "local disk or PVC",
      icon: "disk",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 3,
      x: COL.a,
      y: ROW.mid,
      w: 150,
    },
    {
      id: "engine",
      label: "Engine pod",
      sub: "limits: 1 GPU",
      icon: "gpu",
      tone: PROD_TONE.compute,
      accent: true,
      step: 2,
      x: COL.b,
      y: ROW.mid,
      w: 170,
    },
    {
      id: "shm",
      label: "Shared memory",
      sub: "/dev/shm, in RAM",
      icon: "cache",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 4,
      x: COL.b,
      y: ROW.top,
      w: 170,
    },
    {
      id: "probe",
      label: "Readiness probe",
      sub: "GET /health",
      icon: "signal",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 5,
      x: COL.b,
      y: ROW.bottom,
      w: 170,
    },
    {
      id: "service",
      label: "Service",
      sub: `${TRAFFIC.peakPerSecond} req/s at peak`,
      icon: "load-balancer",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      step: 6,
      x: COL.out,
      y: ROW.bottom,
      w: 140,
    },
  ],
  edges: [
    // Step 1: the node reports how many GPUs it has (extended resource nvidia.com/gpu).
    { from: "plugin", to: "scheduler", label: "4 GPUs", packet: true },

    // Step 2: the scheduler binds the pod to this node because it has a free GPU.
    { from: "scheduler", to: "engine", label: "pod wants 1 GPU", packet: true, step: 2 },

    // Step 3: weights are copied from object storage onto the volume before the engine needs them.
    { from: "storage", to: "volume", label: "weights", packet: true, step: 3 },

    // Step 4: the engine reads the weights into GPU memory; its worker processes share data through /dev/shm.
    { from: "volume", to: "engine", label: "load into GPU", packet: true, step: 4 },
    { from: "engine", to: "shm", label: "workers share", bidirectional: true, dashed: true, flow: true, step: 4 },

    // Step 5: the kubelet's probe asks the engine whether it can answer.
    { from: "probe", to: "engine", label: "ready?", packet: true, step: 5 },

    // Step 6: a passing probe adds the pod to the Service; requests flow in.
    { from: "probe", to: "service", label: "ready: add pod", dashed: true, step: 6 },
    { from: "service", to: "engine", label: "requests", packet: true, delay: 0.6, step: 6 },
  ],
};

export default spec;
