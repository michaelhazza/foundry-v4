interface FilterSettings {
  minLength?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
  statuses?: string[];
}

class FilterEngine {
  shouldInclude(record: Record<string, unknown>, settings?: FilterSettings): boolean {
    if (!settings) {
      return true;
    }

    // Check minimum content length
    if (settings.minLength && settings.minLength > 0) {
      const contentFields = ['content', 'message', 'body', 'text', 'description'];
      let hasMinLength = false;

      for (const field of contentFields) {
        const value = record[field];
        if (typeof value === 'string' && value.length >= settings.minLength) {
          hasMinLength = true;
          break;
        }
      }

      // If no content field meets minimum length, exclude
      if (!hasMinLength) {
        // Check if ANY string field meets length
        const anyLongEnough = Object.values(record).some(
          (v) => typeof v === 'string' && v.length >= settings.minLength!
        );
        if (!anyLongEnough) {
          return false;
        }
      }
    }

    // Check date range
    if (settings.dateRange) {
      const dateFields = ['createdAt', 'updatedAt', 'date', 'timestamp'];
      let recordDate: Date | null = null;

      for (const field of dateFields) {
        const value = record[field];
        if (value) {
          const parsed = new Date(value as string);
          if (!isNaN(parsed.getTime())) {
            recordDate = parsed;
            break;
          }
        }
      }

      if (recordDate) {
        if (settings.dateRange.start) {
          const startDate = new Date(settings.dateRange.start);
          if (recordDate < startDate) {
            return false;
          }
        }

        if (settings.dateRange.end) {
          const endDate = new Date(settings.dateRange.end);
          if (recordDate > endDate) {
            return false;
          }
        }
      }
    }

    // Check status filter
    if (settings.statuses && settings.statuses.length > 0) {
      const statusFields = ['status', 'state'];
      let matchedStatus = false;

      for (const field of statusFields) {
        const value = record[field];
        if (typeof value === 'string') {
          if (settings.statuses.some((s) => s.toLowerCase() === value.toLowerCase())) {
            matchedStatus = true;
            break;
          }
        }
      }

      // If record has a status field but doesn't match allowed statuses, exclude
      const hasStatusField = statusFields.some((f) => record[f] !== undefined);
      if (hasStatusField && !matchedStatus) {
        return false;
      }
    }

    return true;
  }

  getFilterStats(
    records: Record<string, unknown>[],
    settings?: FilterSettings
  ): { total: number; passed: number; filtered: number; reasons: Record<string, number> } {
    const reasons: Record<string, number> = {};
    let passed = 0;

    for (const record of records) {
      if (this.shouldInclude(record, settings)) {
        passed++;
      } else {
        // Determine reason
        if (settings?.minLength) {
          const contentFields = ['content', 'message', 'body', 'text', 'description'];
          const hasMinLength = contentFields.some((f) => {
            const v = record[f];
            return typeof v === 'string' && v.length >= settings.minLength!;
          });
          if (!hasMinLength) {
            reasons['minLength'] = (reasons['minLength'] || 0) + 1;
            continue;
          }
        }

        if (settings?.dateRange) {
          reasons['dateRange'] = (reasons['dateRange'] || 0) + 1;
          continue;
        }

        if (settings?.statuses) {
          reasons['status'] = (reasons['status'] || 0) + 1;
          continue;
        }

        reasons['unknown'] = (reasons['unknown'] || 0) + 1;
      }
    }

    return {
      total: records.length,
      passed,
      filtered: records.length - passed,
      reasons,
    };
  }
}

export const filterEngine = new FilterEngine();
