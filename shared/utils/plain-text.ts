/**
 * Clean text typed by users (requests, messages, names). The result is meant
 * to be shown as plain text only: tags are removed, control and invisible
 * direction-override characters are dropped, and length is capped.
 * Vue's {{ }} escaping is the main XSS defence; this is a second layer.
 */
export function plainText(input: unknown, max = 2000): string {
  return String(input ?? '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    // HTML tags and comments
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-z!][^>]*>/gi, '')
    // Control characters except newline and tab
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    // Bidi overrides/isolates that can disguise text (zero-width joiner/non-joiner stay: Persian needs them)
    .replace(/[‪-‮⁦-⁩]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
}
