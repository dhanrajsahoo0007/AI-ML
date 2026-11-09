import type { DiagramSpec } from "@/components/diagrams/types";

// Addresses and ports, using the kart-game studio from the page's story. An IP address gets a packet to the right
// machine; a port gets it to the right program on that machine. The home router does NAT: the laptop and phone
// have private 192.168.x addresses, and the server only ever sees the router's public address.
// All addresses come from the ranges reserved for documentation (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
// plus the private 192.168.0.0/16 range, so none of them belongs to a real host.
//
// Layout (centres): laptop (110,115) and phone (110,245) in the home zone; router (350,180); web (620,115) and
// game (620,245) in the server zone with the database (830,180) beside them. Boxes are 150-170 wide, at least
// 50 px apart horizontally and 72 px apart vertically, so the edge label pills (about 6.2 px a character plus
// padding) sit in the gaps between boxes. The server's address is in its zone title, so edge labels stay short.
const spec: DiagramSpec = {
  title: "IP addresses find the machine, ports find the program",
  width: 940,
  height: 340,
  steps: [
    { title: "An address finds the machine, a port finds the program" },
    { title: "One machine, many programs, one port each" },
  ],
  zones: [
    { id: "home", title: "Your home", tone: "neutral", x: 20, y: 50, w: 180, h: 270 },
    { id: "edge", title: "Home router", tone: "blue", x: 245, y: 50, w: 210, h: 270 },
    { id: "server", title: "Server 203.0.113.7", tone: "green", x: 515, y: 50, w: 405, h: 270 },
  ],
  nodes: [
    { id: "laptop", label: "Laptop", sub: "192.168.1.20", icon: "browser", x: 110, y: 115, w: 150, h: 58 },
    { id: "phone", label: "Phone", sub: "192.168.1.31", icon: "phone", x: 110, y: 245, w: 150, h: 58, step: 2 },
    {
      id: "router",
      label: "NAT router",
      sub: "public 198.51.100.24",
      icon: "network",
      tone: "blue",
      x: 350,
      y: 180,
      w: 160,
      h: 64,
    },
    {
      id: "web",
      label: "Web server",
      sub: "TCP port 443",
      icon: "server",
      tone: "green",
      accent: true,
      x: 620,
      y: 115,
      w: 170,
      h: 58,
    },
    {
      id: "game",
      label: "Game server",
      sub: "UDP port 7777",
      icon: "server",
      tone: "teal",
      x: 620,
      y: 245,
      w: 170,
      h: 58,
      step: 2,
    },
    {
      id: "db",
      label: "Database",
      sub: "TCP port 5432",
      icon: "database",
      tone: "violet",
      x: 830,
      y: 180,
      w: 150,
      h: 58,
      step: 2,
    },
  ],
  edges: [
    // Step 1: the browser's request. Private address and port 52114 inside the home, public address outside.
    { from: "laptop", to: "router", label: "from :52114", flow: true, packet: true },
    { from: "router", to: "web", label: "to port 443", flow: true, packet: true, delay: 1.2 },

    // Step 2: the game on the phone uses the same router and the same server machine, but a different port.
    { from: "phone", to: "router", label: "from :41822", flow: true, packet: true, step: 2 },
    { from: "router", to: "game", label: "to :7777 (UDP)", flow: true, packet: true, delay: 1.2, step: 2 },
    { from: "web", to: "db", label: ":5432", dashed: true, step: 2 },
  ],
};

export default spec;
