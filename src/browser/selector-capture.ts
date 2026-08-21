/** A short-lived reference to the exact element in the current observation. */
export interface BrowserTargetReference {
  target: string
}

export type SelectorStrategy =
  | 'id'
  | 'attribute'
  | 'link-route'
  | 'structural-fallback'

export type SelectorCaptureResult =
  | {
      status: 'captured'
      selector: {
        kind: 'css' | 'xpath'
        value: string
        strategy: SelectorStrategy
      }
      quality:
        | 'stable-attribute'
        | 'stable-route'
        | 'content-attribute'
        | 'structural-fallback'
    }
  | { status: 'unresolved'; message: string; rawOutput?: string }

/**
 * Fixed page function invoked only by the product-owned browser adapter. It
 * receives the exact element resolved from the latest Playwright MCP snapshot
 * target and proves every returned candidate is unique and points to it.
 */
export const selectorCaptureFunction = String.raw`(element) => {
  const uniqueExact = (selector) => {
    try {
      const matches = document.querySelectorAll(selector);
      return matches.length === 1 && matches[0] === element;
    } catch {
      return false;
    }
  };
  const attributeSelector = (tag, name, value) => 
    tag + '[' + name + '=' + JSON.stringify(value) + ']';
  const accept = (selector, quality, strategy) =>
    uniqueExact(selector) ? { status: 'captured', selector: { kind: 'css', value: selector, strategy }, quality } : undefined;
  const tag = element.localName;

  if (element.id) {
    const candidate = '#' + CSS.escape(element.id);
    const captured = accept(candidate, 'stable-attribute', 'id');
    if (captured) return captured;
  }
  for (const name of ['data-testid', 'data-test', 'data-qa', 'data-cy']) {
    const value = element.getAttribute(name);
    if (value) {
      const captured = accept(attributeSelector(tag, name, value), 'stable-attribute', 'attribute');
      if (captured) return captured;
    }
  }
  for (const name of ['name', 'aria-label']) {
    const value = element.getAttribute(name);
    if (value) {
      const captured = accept(attributeSelector(tag, name, value), 'stable-attribute', 'attribute');
      if (captured) return captured;
    }
  }
  if (tag === 'a') {
    const href = element.getAttribute('href');
    if (href) {
      try {
        const url = new URL(href, document.baseURI);
        const route = url.pathname;
        if (
          (url.protocol === 'http:' || url.protocol === 'https:') &&
          route &&
          route !== '/'
        ) {
          const captured = accept(attributeSelector(tag, 'href$', route), 'stable-route', 'link-route');
          if (captured) return captured;
        }
      } catch {
        // Non-URL link targets, such as JavaScript postbacks, are not routes.
      }
    }
  }
  if (element.getAttribute('title')) {
    const captured = accept(attributeSelector(tag, 'title', element.getAttribute('title')), 'content-attribute', 'attribute');
    if (captured) return captured;
  }

  const segments = [];
  for (let current = element; current && current.nodeType === Node.ELEMENT_NODE; current = current.parentElement) {
    let segment = current.localName;
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter((sibling) => sibling.localName === current.localName)
      : [];
    if (siblings.length > 1) segment += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
    segments.unshift(segment);
    const candidate = segments.join(' > ');
    if (uniqueExact(candidate)) return { status: 'captured', selector: { kind: 'css', value: candidate, strategy: 'structural-fallback' }, quality: 'structural-fallback' };
  }
  return { status: 'unresolved', message: 'No unique CSS selector could be generated for the current target.' };
}`

export function parseSelectorCaptureOutput(
  output: string
): SelectorCaptureResult {
  for (const candidate of jsonCandidates(output)) {
    const result = parsedSelectorCaptureResult(candidate)
    if (result) return result
  }
  return {
    status: 'unresolved',
    message: 'Playwright MCP did not return a selector-capture result.',
    rawOutput: output
  }
}

function jsonCandidates(output: string): string[] {
  const candidates = [output.trim()]
  for (const match of output.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    candidates.push(match[1].trim())
  }
  const resultBody = output.match(
    /^### Result\s*\r?\n([\s\S]*?)(?=^### |(?![\s\S]))/m
  )?.[1]
  if (resultBody) {
    candidates.push(resultBody.trim())
  }
  return candidates
}

function parsedSelectorCaptureResult(
  candidate: string
): SelectorCaptureResult | undefined {
  try {
    const parsed = JSON.parse(candidate) as unknown
    if (isCapturedSelector(parsed) || isUnresolvedSelector(parsed)) {
      return parsed
    }
  } catch {
    // Ignore non-JSON MCP diagnostic text and continue searching.
  }
  return undefined
}

function isCapturedSelector(
  value: unknown
): value is Extract<SelectorCaptureResult, { status: 'captured' }> {
  return Boolean(
    isRecord(value) &&
    value.status === 'captured' &&
    isRecord(value.selector) &&
    (value.selector.kind === 'css' || value.selector.kind === 'xpath') &&
    typeof value.selector.value === 'string' &&
    isSelectorStrategy(value.selector.strategy) &&
    (value.quality === 'stable-attribute' ||
      value.quality === 'stable-route' ||
      value.quality === 'content-attribute' ||
      value.quality === 'structural-fallback')
  )
}

function isSelectorStrategy(value: unknown): value is SelectorStrategy {
  return (
    value === 'id' ||
    value === 'attribute' ||
    value === 'link-route' ||
    value === 'structural-fallback'
  )
}

function isUnresolvedSelector(
  value: unknown
): value is Extract<SelectorCaptureResult, { status: 'unresolved' }> {
  return Boolean(
    isRecord(value) &&
    value.status === 'unresolved' &&
    typeof value.message === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
