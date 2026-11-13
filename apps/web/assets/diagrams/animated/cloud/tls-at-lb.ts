import type { SequenceSpec } from "@/components/diagrams/types";

// TLS at the load balancer, then again to the backend (cloud/resilience/encryption-and-keys).
// Step 1: the cloud's certificate service checks that Brightpost owns its domain and hands the balancer a
// certificate. Step 2: a shopper's phone and the balancer run the TLS handshake: the phone checks the certificate's
// name and issuer, and both sides agree on session keys that exist only for this connection. Step 3: the request
// travels encrypted to the balancer, which decrypts it to read the path, then opens a second TLS connection to the
// app server, so nothing crosses the private network in plain text. Step 4: on day 60 of a 90-day certificate the
// service renews it, with no restart and no ticket. The 90 days are Brightpost's; real lifetimes differ by provider.
// Lanes are cloud-neutral and ordered along the path of the request; the certificate service sits beside the balancer.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "TLS at the load balancer, then again to the backend",
  width: 800,
  steps: [
    { title: "The balancer gets a managed certificate" },
    { title: "The handshake with the shopper" },
    { title: "Decrypt, read the path, encrypt again" },
    { title: "Renewal without a restart" },
  ],
  lanes: [
    { id: "phone", label: "Shopper's phone", icon: "phone", tone: "neutral" },
    { id: "lb", label: "Load balancer", icon: "load-balancer", tone: "blue" },
    { id: "certs", label: "Cert service", icon: "certificate", tone: "red" },
    { id: "app", label: "App server", icon: "server", tone: "teal" },
  ],
  messages: [
    // Step 1: the certificate is issued to the balancer; nobody copies a file by hand.
    { from: "certs", to: "lb", label: "certificate for the shop's name", step: 1 },

    // Step 2: hello, certificate, check, keys agreed.
    { from: "phone", to: "lb", label: "hello: TLS, please", step: 2 },
    { from: "lb", to: "phone", label: "certificate + key share", kind: "return", step: 2 },
    { from: "phone", to: "lb", label: "finished: session keys agreed", step: 2 },

    // Step 3: one encrypted hop to the balancer, a second encrypted hop to the server.
    { from: "phone", to: "lb", label: "GET /invoice/4127 (encrypted)", step: 3, delay: 0.4 },
    { from: "lb", to: "app", label: "new TLS: GET /invoice/4127", step: 3 },
    { from: "app", to: "lb", label: "200, the invoice (encrypted)", kind: "return", step: 3 },
    { from: "lb", to: "phone", label: "200, the invoice (encrypted)", kind: "return", step: 3 },

    // Step 4: renewal is the service's job.
    { from: "certs", to: "lb", label: "day 60: renewed certificate", step: 4, delay: 0.6 },
  ],
  notes: [
    { lane: "certs", text: "Checks Brightpost owns the domain", step: 1, at: 0.5 },
    { lane: "phone", text: "Name matches? Trusted issuer?", step: 2, at: 2.5 },
    { lane: "lb", text: "Decrypts, reads the path, encrypts again", step: 3, at: 4.5 },
    { lane: "lb", text: "No restart, no ticket", step: 4 },
  ],
};

export default spec;
