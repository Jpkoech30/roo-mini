/**
 * Lightweight Web Tools
 *
 * Uses Node.js built-in fetch (available since Node 18) for HTTP requests.
 * No additional dependencies needed.
 *
 * - web_fetch: Fetch any URL, strip HTML, return text
 * - web_search: Search using DuckDuckGo's API endpoint (returns JSON)
 */

const TIMEOUT = 10_000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/**
 * Fetch a URL and return clean text content.
 * Strips HTML, scripts, styles for readability.
 */
export async function webFetch(_cwd, args) {
  if (!args.url || typeof args.url !== "string")
    return "Missing 'url' (string required).";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(args.url, {
      signal: controller.signal,
      headers: HEADERS,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const text = await response.text();

    // Strip HTML for readability
    const cleaned = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/g, " ")
      .replace(/&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const maxLen = 5000;
    return cleaned.length > maxLen
      ? cleaned.slice(0, maxLen) + `\n\n[... ${(cleaned.length - maxLen)} more chars truncated]`
      : cleaned || "(empty response)";
  } catch (err) {
    if (err.name === "AbortError")
      return `⏱ Request timed out after ${TIMEOUT / 1000}s.`;
    return `❌ Failed to fetch: ${err.message}`;
  }
}

/**
 * Search using DuckDuckGo's instant answer API (returns JSON, no API key).
 * Includes related topics when available.
 */
export async function webSearch(_cwd, args) {
  if (!args.query || typeof args.query !== "string")
    return "Missing 'query' (string required).";

  const query = encodeURIComponent(args.query);

  try {
    // Try DuckDuckGo instant answer API first
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(
      `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`,
      { signal: controller.signal, headers: HEADERS }
    );
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const parts = [];

    // Abstract (instant answer)
    if (data.AbstractText) {
      parts.push(`📖 ${data.Headline || "Answer"}:`);
      parts.push(data.AbstractText.slice(0, 500));
      if (data.AbstractURL) parts.push(`   Source: ${data.AbstractURL}`);
      parts.push("");
    }

    // Definition
    if (data.Definition && !data.AbstractText) {
      parts.push(`📖 ${data.Definition}`);
      if (data.DefinitionURL) parts.push(`   ${data.DefinitionURL}`);
      parts.push("");
    }

    // Related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      parts.push("🔍 Related:");
      for (const topic of data.RelatedTopics.slice(0, 8)) {
        if (topic.Text) {
          parts.push(`  • ${topic.Text.slice(0, 200)}`);
          if (topic.FirstURL) parts.push(`    ${topic.FirstURL}`);
        }
        // Nested topics
        if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 3)) {
            if (sub.Text) parts.push(`  • ${sub.Text.slice(0, 200)}`);
          }
        }
      }
    }

    if (parts.length === 0) {
      // Fallback: return what we got as raw info
      const info = [];
      if (data.Heading) info.push(`Heading: ${data.Heading}`);
      if (data.Type) info.push(`Type: ${data.Type}`);
      if (data.Results && data.Results.length > 0) {
        for (const r of data.Results.slice(0, 5)) {
          if (r.Text) info.push(`  • ${r.Text.slice(0, 200)}`);
        }
      }
      if (info.length > 0) {
        return `Results for "${args.query}":\n${info.join("\n")}`;
      }
      return `No instant results for "${args.query}". Try web_fetch with a specific URL like "https://en.wikipedia.org/wiki/${query}".`;
    }

    return `Search results for "${args.query}":\n\n${parts.join("\n").trim()}`;
  } catch (err) {
    if (err.name === "AbortError")
      return `⏱ Search timed out. Try a more specific query.`;
    return `❌ Search failed: ${err.message}. Try web_fetch with a specific URL instead.`;
  }
}
