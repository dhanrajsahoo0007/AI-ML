import type { DiagramSpec } from "@/components/diagrams/types";

// The same homework site behind two kinds of load balancer, one band each.
// Step 1 (top band): a layer 4 balancer sees only addresses and ports, so it hands each whole TCP connection to one
// of three identical app servers. Every server must run every part of the site.
// Step 2 (bottom band): a layer 7 balancer ends TLS, reads each HTTP request and routes it by path to a pool built
// for that job: pages, the homework API, or video lessons.
//
// Layout (centres): clients x 95 | balancers x 330 (w 150) | targets x 700 (w 170, h 48).
// Top band y 85 / 158 / 231, bottom band y 349 / 422 / 495. Targets sit 25 px apart; bands are 30 px apart.
const spec: DiagramSpec = {
  title: "Layer 4 and layer 7 load balancing",
  width: 900,
  height: 560,
  steps: [{ title: "Layer 4: spread connections" }, { title: "Layer 7: route each request" }],
  zones: [
    { id: "clients", title: "Students", tone: "neutral", x: 20, y: 40, w: 150, h: 500 },
    { id: "l4zone", title: "Layer 4: forwards connections", tone: "blue", x: 195, y: 40, w: 685, h: 235 },
    { id: "l7zone", title: "Layer 7: reads each request", tone: "green", x: 195, y: 305, w: 685, h: 235 },
  ],
  nodes: [
    // Step 1: layer 4.
    { id: "client4", label: "Student", sub: "laptop", icon: "browser", x: 95, y: 158 },
    {
      id: "lb4",
      label: "L4 balancer",
      sub: "sees IP and port",
      icon: "load-balancer",
      tone: "blue",
      x: 330,
      y: 158,
      w: 150,
    },
    {
      id: "app1",
      label: "App server 1",
      sub: "runs everything",
      icon: "server",
      tone: "teal",
      x: 700,
      y: 85,
      w: 170,
      h: 48,
    },
    {
      id: "app2",
      label: "App server 2",
      sub: "runs everything",
      icon: "server",
      tone: "teal",
      x: 700,
      y: 158,
      w: 170,
      h: 48,
    },
    {
      id: "app3",
      label: "App server 3",
      sub: "runs everything",
      icon: "server",
      tone: "teal",
      x: 700,
      y: 231,
      w: 170,
      h: 48,
    },

    // Step 2: layer 7.
    { id: "client7", label: "Student", sub: "phone", icon: "phone", x: 95, y: 422, step: 2 },
    {
      id: "lb7",
      label: "L7 balancer",
      sub: "ends TLS, reads path",
      icon: "load-balancer",
      tone: "green",
      accent: true,
      x: 330,
      y: 422,
      w: 150,
      step: 2,
    },
    {
      id: "web",
      label: "Web pages",
      sub: "HTML and CSS",
      icon: "browser",
      tone: "teal",
      x: 700,
      y: 349,
      w: 170,
      h: 48,
      step: 2,
    },
    {
      id: "api",
      label: "Homework API",
      sub: "questions, answers",
      icon: "api",
      tone: "teal",
      x: 700,
      y: 422,
      w: 170,
      h: 48,
      step: 2,
    },
    {
      id: "video",
      label: "Video lessons",
      sub: "large streams",
      icon: "video",
      tone: "teal",
      x: 700,
      y: 495,
      w: 170,
      h: 48,
      step: 2,
    },
  ],
  edges: [
    // Step 1: one connection in, the whole connection out to one server.
    { from: "client4", to: "lb4", label: "TCP :443", flow: true, packet: true },
    { from: "lb4", to: "app1", label: "conn A", flow: true, packet: true, delay: 1 },
    { from: "lb4", to: "app2", label: "conn B", flow: true, packet: true, delay: 1.4 },
    { from: "lb4", to: "app3", label: "conn C", flow: true, packet: true, delay: 1.8 },

    // Step 2: the balancer opens each request and picks a pool by its path.
    { from: "client7", to: "lb7", label: "HTTPS", flow: true, packet: true, step: 2 },
    { from: "lb7", to: "web", label: "path /", flow: true, packet: true, delay: 1, step: 2 },
    { from: "lb7", to: "api", label: "/api/*", flow: true, packet: true, delay: 1.4, step: 2 },
    { from: "lb7", to: "video", label: "/video/*", flow: true, packet: true, delay: 1.8, step: 2 },
  ],
};

export default spec;
