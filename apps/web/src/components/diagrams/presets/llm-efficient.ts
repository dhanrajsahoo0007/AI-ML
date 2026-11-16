// The running example of "Efficient Attention and Long Context": the page's model, the shape of Llama 2 70B, taken
// to a long context and a real batch. Every number the page quotes beyond the existing specs is computed here.
// MB, GB and TB are 10^6, 10^9 and 10^12 bytes, as on the page.
//
// ── The model ─────────────────────────────────────────────────────────────────────────────────────────────────────
// L = 80 layers, 64 query heads, d_model 8,192, so d_head = 8,192 / 64 = 128; 16-bit values (2 bytes).
// Sources: Touvron et al. 2023 (LLaMA, arXiv 2302.13971) Table 2, 65B: dimension 8,192, 64 heads, 80 layers;
// Touvron et al. 2023 (Llama 2, arXiv 2307.09288) §2.2 and Table 1: 34B and 70B use GQA, context 4k; Meta's
// llama-models repo, `models/sku_list.py`, llama2_70b: dim 8192, n_layers 80, n_heads 64, n_kv_heads 8.
// Weights: "70B" parameters × 2 bytes = 140 GB (nominal; the exact count is a little under 70B).
//
// ── KV cache: bytes = 2 × L × H_kv × d_head × seq × batch × bytes per value ──────────────────────────────────────
// Per token (the numbers `mha-gqa-mqa` draws):
//   MHA, H_kv = 64: 2 × 80 × 64 × 128 × 2 = 2,621,440 B ≈ 2.62 MB
//   GQA, H_kv = 8:  2 × 80 ×  8 × 128 × 2 =   327,680 B ≈ 0.33 MB
//   MQA, H_kv = 1:  2 × 80 ×  1 × 128 × 2 =    40,960 B ≈ 0.04 MB
// At seq = 32,768 tokens (the self-attention page's long-context example), one sequence:
//   MHA 2,621,440 × 32,768 = 85,899,345,920 B ≈ 85.9 GB
//   GQA   327,680 × 32,768 = 10,737,418,240 B ≈ 10.7 GB
//   MQA    40,960 × 32,768 =  1,342,177,280 B ≈ 1.34 GB
// Batch 8 (× 8):  MHA 687,194,767,360 B ≈ 687 GB · GQA 85.9 GB · MQA 10.7 GB.
//
// ── Against one node of 8 GPUs with 80 GB each (A100 80 GB: Dao et al. 2022, arXiv 2205.14135 §2.1, "40-80GB",
// "1.5-2.0TB/s") ──────────────────────────────────────────────────────────────────────────────────────────────────
// Node memory 8 × 80 = 640 GB; weights 140 GB; left for the cache 500 GB (activations ignored).
//   Batch 8 totals: MHA 140 + 687.2 = 827.2 GB (187.2 GB over 640) · GQA 225.9 GB · MQA 150.7 GB.
//   Largest batch at 32,768 tokens: MHA ⌊500 / 85.90⌋ = 5 · GQA ⌊500 / 10.74⌋ = 46 · MQA ⌊500 / 1.342⌋ = 372.
// Each decode step reads every weight and the whole cache once; at 8 × 2.0 TB/s = 16 TB/s that sets a floor on
// the step time (compute and communication ignored):
//   GQA, batch 8: (140 + 85.9) GB / 16 TB/s = 14.1 ms · MQA: 150.7 / 16 = 9.4 ms · MHA (if it fitted): 51.7 ms.
//
// ── FlashAttention, one head of one layer, n = 32,768, d = 128, 16-bit, forward pass ────────────────────────────
// Standard attention (Dao et al. 2022, Algorithm 0): read Q, K (2nd); write S (n²); read S (n²); write P (n²);
// read P (n²) and V (nd); write O (nd). HBM traffic = 4n² + 4nd elements
//   = 4 × 1,073,741,824 + 4 × 4,194,304 = 4,311,744,512 elements × 2 B = 8,623,489,024 B ≈ 8.62 GB.
// The score matrix alone: n² × 2 B = 2,147,483,648 B ≈ 2.1 GB per head per layer (as the self-attention page says);
// 64 heads of one layer at once: 137,438,953,472 B ≈ 137 GB.
// FlashAttention-2 loop order (Dao 2023, arXiv 2307.08691 §3.2: outer loop over query tiles), tiles of B_r = 128
// query rows (§3.3: blocks of {64, 128} × {64, 128}), counting every tile load as an HBM access (no help from the
// L2 cache): read Q once (nd), read K and V once per query tile (T_r = n / B_r = 256 tiles, 2 × 256 × nd), write O
// once (nd). Traffic = nd × (2 + 2 × 256) = 4,194,304 × 514 = 2,155,872,256 elements × 2 B = 4,311,744,512 B
// ≈ 4.31 GB, half the standard count (exactly, because d = B_r). No n × n matrix is written; the only extra state
// is the log-sum-exp L, one fp32 per row: 32,768 × 4 B = 131,072 B ≈ 0.13 MB (Theorem 1: O(n) extra memory).
// Measured (Dao et al. 2022, Figure 2 left; GPT-2 medium, seq 1024, head dim 64, 16 heads, batch 64, A100, forward +
// backward): standard 66.6 GFLOPs, 40.3 GB HBM traffic, 41.7 ms; FlashAttention 75.2 GFLOPs, 4.4 GB, 7.3 ms.
//
// ── Sliding window: Mistral 7B (Jiang et al. 2023, arXiv 2310.06825 Table 1, §2) ─────────────────────────────────
// 32 layers, 8 KV heads, head_dim 128, window W = 4,096. Per token: 2 × 32 × 8 × 128 × 2 = 131,072 B ≈ 0.13 MB.
// At 32,768 tokens a full cache is 4,294,967,296 B ≈ 4.29 GB; the rolling buffer keeps W = 4,096 tokens:
// 536,870,912 B ≈ 0.54 GB, 8× less (the paper: "reduces the cache memory usage by 8x" at 32k). Reach after the
// last layer: 32 × 4,096 = 131,072 tokens (the paper: "approximately 131K tokens").
//
// ── PagedAttention (Kwon et al. 2023, arXiv 2309.06180 §4, §7.2 block size 16) ──────────────────────────────────
// Illustrative request on the GQA model: the server reserves 32,768 slots, the request ends at 1,000 tokens.
//   Reserved: 32,768 × 327,680 = 10,737,418,240 B ≈ 10.7 GB; used: 1,000 × 327,680 = 327,680,000 B ≈ 0.33 GB (3 %).
//   Paged: ⌈1,000 / 16⌉ = 63 blocks = 1,008 slots; 8 empty slots × 327,680 = 2,621,440 B ≈ 2.6 MB wasted.
//   Worst case per sequence: 15 empty slots = 4,915,200 B ≈ 4.9 MB.

const GB = 1e9;

// ── The model ─────────────────────────────────────────────────────────────────────────────────────────────────────
const LAYERS = 80;
const D_HEAD = 128;
const BYTES = 2;
const SEQ = 32_768;
const BATCH = 8;
const perToken = (hKv: number, layers = LAYERS) => 2 * layers * hKv * D_HEAD * BYTES;

/** KV cache of the page's model, per token and at 32,768 tokens × batch 8, for MHA, GQA and MQA. */
export const KV = {
  layers: LAYERS,
  dHead: D_HEAD,
  bytes: BYTES,
  seq: SEQ,
  batch: BATCH,
  variants: [
    { id: "mha", name: "MHA", hKv: 64 },
    { id: "gqa", name: "GQA", hKv: 8 },
    { id: "mqa", name: "MQA", hKv: 1 },
  ].map((v) => ({
    ...v,
    perToken: perToken(v.hKv), // 2,621,440 · 327,680 · 40,960
    perSeq: perToken(v.hKv) * SEQ, // 85.9 GB · 10.7 GB · 1.34 GB
    batchBytes: perToken(v.hKv) * SEQ * BATCH, // 687 GB · 85.9 GB · 10.7 GB
  })),
};

// ── The node ──────────────────────────────────────────────────────────────────────────────────────────────────────
const NODE = 8 * 80 * GB;
const WEIGHTS = 70e9 * BYTES;
const NODE_BW = 8 * 2.0e12; // bytes per second

/** One 8 × 80 GB node: what fits, the largest batch, and the memory-bound floor on one decode step. */
export const BUDGET = {
  node: NODE, // 640 GB
  weights: WEIGHTS, // 140 GB
  free: NODE - WEIGHTS, // 500 GB
  rows: KV.variants.map((v) => ({
    id: v.id,
    total: WEIGHTS + v.batchBytes, // 827.2 · 225.9 · 150.7 GB
    fits: WEIGHTS + v.batchBytes <= NODE, // false · true · true
    maxBatch: Math.floor((NODE - WEIGHTS) / v.perSeq), // 5 · 46 · 372
    stepMs: ((WEIGHTS + v.batchBytes) / NODE_BW) * 1000, // 51.7 · 14.1 · 9.4
  })),
};

// ── FlashAttention traffic, one head of one layer ─────────────────────────────────────────────────────────────────
const N = SEQ;
const D = D_HEAD;
const B_R = 128;

/** HBM bytes for one head of one layer at n = 32,768: standard attention vs FlashAttention-2's tile loop. */
export const FLASH = {
  standardBytes: (4 * N * N + 4 * N * D) * BYTES, // 8,623,489,024
  flashBytes: N * D * (2 + 2 * (N / B_R)) * BYTES, // 4,311,744,512
  scoreBytes: N * N * BYTES, // 2,147,483,648
  layerScoreBytes: 64 * N * N * BYTES, // 137,438,953,472
  statsBytes: N * 4, // 131,072
};

// ── Sliding window, Mistral 7B ────────────────────────────────────────────────────────────────────────────────────
const W = 4_096;
const MISTRAL_TOKEN = perToken(8, 32); // 131,072

/** Mistral 7B's cache at 32,768 tokens, full vs rolling buffer, and the reach of 32 stacked windows. */
export const WINDOW = {
  perToken: MISTRAL_TOKEN,
  full: MISTRAL_TOKEN * SEQ, // 4,294,967,296
  rolling: MISTRAL_TOKEN * W, // 536,870,912
  ratio: SEQ / W, // 8
  reach: 32 * W, // 131,072
};

// ── PagedAttention ────────────────────────────────────────────────────────────────────────────────────────────────
const BLOCK = 16;
const USED = 1_000;
const GQA_TOKEN = perToken(8);
const blocks = Math.ceil(USED / BLOCK); // 63

/** One illustrative request (1,000 tokens) on the GQA model: reserved chunk vs 16-token blocks. */
export const PAGED = {
  reserved: SEQ * GQA_TOKEN, // 10,737,418,240
  used: USED * GQA_TOKEN, // 327,680,000
  blocks,
  wasted: (blocks * BLOCK - USED) * GQA_TOKEN, // 2,621,440
  worst: (BLOCK - 1) * GQA_TOKEN, // 4,915,200
};
