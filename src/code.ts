// SVG Worker – Plugin Code (runs in Figma sandbox)

figma.showUI(__html__, { width: 520, height: 640, title: "SVG Worker" });

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Robust error serialiser.
 * Figma's sandbox throws plain {message:"..."} objects, not proper Errors.
 */
function errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (err !== null && typeof err === "object" && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    try { return JSON.stringify(err); } catch { return "Unknown error"; }
}

/**
 * Validate that a text response is actually an SVG document.
 * Returns a descriptive Error if invalid, or null if OK.
 */
function validateSVG(text: string): Error | null {
    const lower = text.toLowerCase();

    const isHTML =
        lower.startsWith("<!doctype html") ||
        lower.startsWith("<html") ||
        (lower.includes("<html") && !lower.includes("<svg"));

    if (isHTML) {
        return new Error(
            "The URL returned an HTML page, not a raw SVG file.\n" +
            "Use the direct download link (e.g. on SVGRepo: click \"Download SVG\")."
        );
    }

    if (!lower.includes("<svg")) {
        return new Error(
            "The URL did not return a valid SVG. " +
            "Make sure the link points directly to a .svg file."
        );
    }

    return null;
}

/**
 * Try to fetch text from a single URL.
 * Returns { ok: true, text } on success, { ok: false, fatal: bool } on failure.
 * fatal=true means retrying via another proxy won't help (e.g. 404).
 */
async function tryFetch(
    url: string
): Promise<{ ok: true; text: string } | { ok: false; fatal: boolean; status?: number }> {
    try {
        const res = await fetch(url);
        if (res.ok) {
            const text = await res.text();
            return { ok: true, text };
        }
        // 404/403 → fatal (proxy won't fix a missing resource)
        const fatal = res.status === 404 || res.status === 403;
        return { ok: false, fatal, status: res.status };
    } catch {
        // Network / CORS failure → non-fatal, worth retrying via proxy
        return { ok: false, fatal: false };
    }
}

/**
 * Fetch an SVG from a URL with automatic multi-proxy fallback.
 *
 * Context: Figma's plugin main thread runs inside a data:// iframe with
 * origin='null'. Most servers block null-origin requests via CORS, and some
 * (like SVGRepo) also rate-limit popular CORS proxies.
 *
 * Strategy: try direct → corsproxy.io → allorigins.win → thingproxy in order,
 * stopping at the first success. 404/403 are surfaced immediately (no retries).
 */
async function fetchSVGText(originalUrl: string): Promise<string> {
    // Build the proxy URL list (direct first, then fallbacks)
    const candidates: Array<{ label: string; url: string }> = [
        {
            label: "direct",
            url: originalUrl,
        },
        {
            label: "corsproxy.io",
            url: `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`,
        },
        {
            label: "allorigins",
            url: `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
        },
        {
            label: "thingproxy",
            url: `https://thingproxy.freeboard.io/fetch/${originalUrl}`,
        },
    ];

    let lastStatus: number | undefined;

    for (const { url } of candidates) {
        const result = await tryFetch(url);

        if (result.ok) {
            return result.text;
        }

        if (result.fatal) {
            // 404/403 — no proxy will fix this
            throw new Error(
                `The server returned HTTP ${result.status}. ` +
                "Check that the URL is correct and the file exists."
            );
        }

        lastStatus = result.status;
    }

    // All attempts failed
    if (lastStatus === 429) {
        throw new Error(
            "All fetch attempts failed — the SVG host is rate-limiting requests (HTTP 429).\n" +
            "Wait a moment and try again, or use a CDN-hosted SVG instead\n" +
            "(e.g. raw.githubusercontent.com, cdn.jsdelivr.net, unpkg.com)."
        );
    }

    throw new Error(
        "Could not load the SVG after trying direct + 3 CORS proxies.\n" +
        "The server may be blocking automated requests.\n" +
        "Try a CDN-hosted SVG (e.g. raw.githubusercontent.com, cdn.jsdelivr.net)."
    );
}

// ─── SVG export helpers ────────────────────────────────────────────────────────

async function getSelectedSVG(): Promise<string | null> {
    const node = figma.currentPage.selection[0];
    if (!node) return null;
    try {
        const bytes = await node.exportAsync({ format: "SVG_STRING" });
        return bytes as unknown as string;
    } catch (err) {
        return `<!-- Export error: ${errorMessage(err)} -->`;
    }
}

async function sendSVGToUI(): Promise<void> {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.ui.postMessage({ type: "no-selection" });
        return;
    }
    const svg = await getSelectedSVG();
    const nodeName = selection[0].name;
    figma.ui.postMessage({ type: "svg-content", svg, nodeName });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

sendSVGToUI();

figma.on("selectionchange", () => { sendSVGToUI(); });

// ─── Messages from UI ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: { type: string; svg?: string; url?: string }) => {
    switch (msg.type) {

        case "refresh":
            await sendSVGToUI();
            break;

        case "close":
            figma.closePlugin();
            break;

        // ── Fetch SVG (direct + multi-proxy fallback) ─────────────────────────
        case "fetch-svg": {
            if (!msg.url) break;
            try {
                const text = await fetchSVGText(msg.url);
                const trimmed = text.trim();
                const invalid = validateSVG(trimmed);
                if (invalid) throw invalid;
                figma.ui.postMessage({ type: "svg-fetched", svg: trimmed });
            } catch (err) {
                figma.ui.postMessage({ type: "fetch-error", message: errorMessage(err) });
            }
            break;
        }

        // ── Paste extracted SVG onto the Figma canvas ─────────────────────────
        case "paste-svg": {
            if (!msg.svg) break;
            try {
                const node = figma.createNodeFromSvg(msg.svg);
                figma.currentPage.appendChild(node);
                figma.currentPage.selection = [node];
                figma.viewport.scrollAndZoomIntoView([node]);
                figma.ui.postMessage({ type: "paste-success" });
            } catch (err) {
                figma.ui.postMessage({ type: "paste-error", message: errorMessage(err) });
            }
            break;
        }

        default:
            break;
    }
};
