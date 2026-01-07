interface ExportOptions {
  systemPrompt?: string;
  contextWindow?: number;
}

class ExportEngine {
  generate(
    records: Record<string, unknown>[],
    format: 'jsonl' | 'qa' | 'raw',
    options?: ExportOptions
  ): string {
    switch (format) {
      case 'jsonl':
        return this.generateJsonl(records, options);
      case 'qa':
        return this.generateQA(records, options);
      case 'raw':
        return this.generateRaw(records);
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  private generateJsonl(records: Record<string, unknown>[], options?: ExportOptions): string {
    const lines: string[] = [];

    for (const record of records) {
      const conversation: any = {
        messages: [],
      };

      // Add system prompt if configured
      if (options?.systemPrompt) {
        conversation.messages.push({
          role: 'system',
          content: options.systemPrompt,
        });
      }

      // Build conversation from record fields
      const content = this.extractContent(record);
      const question = this.extractQuestion(record);
      const answer = this.extractAnswer(record);

      if (question && answer) {
        // Q&A format
        conversation.messages.push(
          { role: 'user', content: question },
          { role: 'assistant', content: answer }
        );
      } else if (content) {
        // Single message format
        conversation.messages.push({
          role: 'user',
          content: content,
        });
      }

      // Add context if requested
      if (options?.contextWindow && options.contextWindow > 0) {
        const context = this.extractContext(record);
        if (context) {
          conversation.context = context;
        }
      }

      if (conversation.messages.length > 0) {
        lines.push(JSON.stringify(conversation));
      }
    }

    return lines.join('\n');
  }

  private generateQA(records: Record<string, unknown>[], options?: ExportOptions): string {
    const lines: string[] = [];

    for (const record of records) {
      const question = this.extractQuestion(record) || this.extractContent(record);
      const answer = this.extractAnswer(record);

      if (question) {
        const qa: any = {
          question,
          answer: answer || '',
        };

        if (options?.systemPrompt) {
          qa.system_prompt = options.systemPrompt;
        }

        lines.push(JSON.stringify(qa));
      }
    }

    return lines.join('\n');
  }

  private generateRaw(records: Record<string, unknown>[]): string {
    return JSON.stringify(records, null, 2);
  }

  private extractContent(record: Record<string, unknown>): string | null {
    const fields = ['content', 'message', 'body', 'text', 'description', 'user_input'];

    for (const field of fields) {
      const value = record[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private extractQuestion(record: Record<string, unknown>): string | null {
    const fields = ['question', 'query', 'ask', 'inquiry', 'subject'];

    for (const field of fields) {
      const value = record[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private extractAnswer(record: Record<string, unknown>): string | null {
    const fields = ['answer', 'response', 'reply', 'solution', 'assistant_response'];

    for (const field of fields) {
      const value = record[field];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private extractContext(record: Record<string, unknown>): string | null {
    const fields = ['context', 'metadata', 'category', 'tags'];

    const contextParts: string[] = [];

    for (const field of fields) {
      const value = record[field];
      if (typeof value === 'string' && value.trim()) {
        contextParts.push(`${field}: ${value.trim()}`);
      } else if (typeof value === 'object' && value !== null) {
        contextParts.push(`${field}: ${JSON.stringify(value)}`);
      }
    }

    return contextParts.length > 0 ? contextParts.join('; ') : null;
  }
}

export const exportEngine = new ExportEngine();
