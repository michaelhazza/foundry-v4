import nlp from 'compromise';

interface PiiSettings {
  allowList?: string[];
  customPatterns?: Array<{ name: string; pattern: string }>;
}

interface MappingInfo {
  sourceField: string;
  targetField: string;
  isPii: boolean;
}

interface ProcessResult {
  processedData: Record<string, unknown>;
  tokensMap: Record<string, string>;
}

// PII detection patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  creditCard: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  zipCode: /\b\d{5}(-\d{4})?\b/g,
};

class PiiEngine {
  private tokenCounter = 0;
  private tokenCache: Map<string, string> = new Map();

  process(
    record: Record<string, unknown>,
    mappings: MappingInfo[],
    settings?: PiiSettings
  ): ProcessResult {
    const processedData: Record<string, unknown> = {};
    const tokensMap: Record<string, string> = {};
    const allowList = new Set(settings?.allowList?.map((s) => s.toLowerCase()) || []);

    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== 'string') {
        processedData[key] = value;
        continue;
      }

      // Check if field is marked as PII in mappings
      const mapping = mappings.find((m) => m.sourceField === key);
      const isPiiField = mapping?.isPii ?? false;

      // Process the value
      let processedValue = value;
      const fieldTokens: Record<string, string> = {};

      // Detect and tokenize named entities (names)
      if (isPiiField || this.containsPii(value, 'name')) {
        const doc = nlp(value);
        const people = doc.people().out('array');

        for (const name of people) {
          if (allowList.has(name.toLowerCase())) continue;

          const token = this.getOrCreateToken(name, 'NAME');
          fieldTokens[name] = token;
          processedValue = processedValue.replace(new RegExp(this.escapeRegex(name), 'gi'), token);
        }
      }

      // Detect and tokenize pattern-based PII
      for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
        const matches = value.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (allowList.has(match.toLowerCase())) continue;

            const token = this.getOrCreateToken(match, piiType.toUpperCase());
            fieldTokens[match] = token;
            processedValue = processedValue.replace(new RegExp(this.escapeRegex(match), 'g'), token);
          }
        }
      }

      // Apply custom patterns
      if (settings?.customPatterns) {
        for (const { name, pattern } of settings.customPatterns) {
          try {
            const regex = new RegExp(pattern, 'gi');
            const matches = value.match(regex);
            if (matches) {
              for (const match of matches) {
                if (allowList.has(match.toLowerCase())) continue;

                const token = this.getOrCreateToken(match, name.toUpperCase());
                fieldTokens[match] = token;
                processedValue = processedValue.replace(new RegExp(this.escapeRegex(match), 'g'), token);
              }
            }
          } catch {
            // Invalid regex pattern, skip
          }
        }
      }

      processedData[key] = processedValue;
      Object.assign(tokensMap, fieldTokens);
    }

    return { processedData, tokensMap };
  }

  private containsPii(text: string, type: string): boolean {
    if (type === 'name') {
      const doc = nlp(text);
      return doc.people().length > 0;
    }

    for (const pattern of Object.values(PII_PATTERNS)) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  private getOrCreateToken(value: string, type: string): string {
    const cacheKey = `${type}:${value}`;

    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey)!;
    }

    this.tokenCounter++;
    const token = `[${type}_${this.tokenCounter.toString().padStart(4, '0')}]`;
    this.tokenCache.set(cacheKey, token);

    return token;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  reset(): void {
    this.tokenCounter = 0;
    this.tokenCache.clear();
  }
}

export const piiEngine = new PiiEngine();
