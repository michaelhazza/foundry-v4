import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { sources, sourceMappings, projects } from '../db/schema';
import { NotFoundError } from '../errors';
import { auditService } from './audit.service';

// Target field types for AI training data
const TARGET_FIELDS = [
  'content',
  'question',
  'answer',
  'context',
  'system_prompt',
  'user_input',
  'assistant_response',
  'email',
  'phone',
  'name',
  'date',
  'category',
  'status',
  'metadata',
  'ignore',
] as const;

// Patterns for auto-detection
const FIELD_PATTERNS: Record<string, RegExp[]> = {
  email: [/email/i, /e-mail/i, /mail/i],
  phone: [/phone/i, /tel/i, /mobile/i, /cell/i],
  name: [/name/i, /^full.?name$/i, /^first.?name$/i, /^last.?name$/i],
  date: [/date/i, /time/i, /created/i, /updated/i, /timestamp/i],
  content: [/content/i, /body/i, /message/i, /text/i, /description/i],
  question: [/question/i, /query/i, /ask/i, /inquiry/i],
  answer: [/answer/i, /response/i, /reply/i, /solution/i],
  status: [/status/i, /state/i],
  category: [/category/i, /type/i, /tag/i, /label/i],
};

// PII field indicators
const PII_INDICATORS = ['email', 'phone', 'name', 'address', 'ssn', 'social'];

interface MappingInput {
  id?: number;
  sourceField: string;
  targetField: string;
  isPii: boolean;
}

class MappingService {
  async getBySource(sourceId: number, organizationId: number) {
    // Verify access
    const [source] = await db
      .select({
        source: sources,
        projectOrgId: projects.organizationId,
      })
      .from(sources)
      .innerJoin(projects, eq(projects.id, sources.projectId))
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (!source || source.projectOrgId !== organizationId) {
      throw new NotFoundError('Source', sourceId);
    }

    return db
      .select()
      .from(sourceMappings)
      .where(eq(sourceMappings.sourceId, sourceId))
      .orderBy(sourceMappings.sourceField);
  }

  async updateMappings(
    sourceId: number,
    organizationId: number,
    mappings: MappingInput[],
    userId: number
  ) {
    // Verify access
    const [source] = await db
      .select({
        source: sources,
        projectOrgId: projects.organizationId,
      })
      .from(sources)
      .innerJoin(projects, eq(projects.id, sources.projectId))
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (!source || source.projectOrgId !== organizationId) {
      throw new NotFoundError('Source', sourceId);
    }

    // Delete existing mappings
    await db.delete(sourceMappings).where(eq(sourceMappings.sourceId, sourceId));

    // Insert new mappings
    if (mappings.length > 0) {
      await db.insert(sourceMappings).values(
        mappings.map((m) => ({
          sourceId,
          sourceField: m.sourceField,
          targetField: m.targetField,
          isPii: m.isPii,
          confidence: 'high' as const,
        }))
      );
    }

    // Audit log
    await auditService.log({
      action: 'mapping.updated',
      resourceType: 'source',
      resourceId: sourceId,
      userId,
      organizationId,
      details: { mappingCount: mappings.length },
    });

    return this.getBySource(sourceId, organizationId);
  }

  async autoDetect(sourceId: number, organizationId: number) {
    // Verify access
    const [source] = await db
      .select({
        source: sources,
        projectOrgId: projects.organizationId,
      })
      .from(sources)
      .innerJoin(projects, eq(projects.id, sources.projectId))
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (!source || source.projectOrgId !== organizationId) {
      throw new NotFoundError('Source', sourceId);
    }

    const rawSchema = source.source.rawSchema as Array<{ name: string; type: string; sample: unknown[] }>;

    if (!rawSchema || rawSchema.length === 0) {
      return [];
    }

    // Auto-detect mappings
    const detectedMappings = rawSchema.map((field) => {
      const fieldName = field.name.toLowerCase();
      let targetField = 'metadata';
      let confidence: 'high' | 'medium' | 'low' = 'low';

      // Check patterns
      for (const [target, patterns] of Object.entries(FIELD_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(fieldName)) {
            targetField = target;
            confidence = 'high';
            break;
          }
        }
        if (confidence === 'high') break;
      }

      // Check for PII
      const isPii = PII_INDICATORS.some((indicator) =>
        fieldName.includes(indicator)
      );

      return {
        sourceField: field.name,
        targetField,
        confidence,
        isPii,
      };
    });

    // Save detected mappings
    await db.delete(sourceMappings).where(eq(sourceMappings.sourceId, sourceId));

    if (detectedMappings.length > 0) {
      await db.insert(sourceMappings).values(
        detectedMappings.map((m) => ({
          sourceId,
          ...m,
        }))
      );
    }

    return detectedMappings;
  }

  async getPreview(sourceId: number, organizationId: number) {
    // Verify access
    const [source] = await db
      .select({
        source: sources,
        projectOrgId: projects.organizationId,
      })
      .from(sources)
      .innerJoin(projects, eq(projects.id, sources.projectId))
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (!source || source.projectOrgId !== organizationId) {
      throw new NotFoundError('Source', sourceId);
    }

    const mappings = await this.getBySource(sourceId, organizationId);
    const rawSchema = source.source.rawSchema as Array<{ name: string; type: string; sample: unknown[] }>;

    if (!rawSchema || rawSchema.length === 0) {
      return { mappings, preview: [] };
    }

    // Create preview with mapped fields
    const sampleCount = Math.min(
      3,
      Math.max(...rawSchema.map((f) => f.sample?.length || 0))
    );
    const preview = [];

    for (let i = 0; i < sampleCount; i++) {
      const row: Record<string, unknown> = {};
      for (const mapping of mappings) {
        const field = rawSchema.find((f) => f.name === mapping.sourceField);
        if (field && field.sample) {
          row[mapping.targetField] = field.sample[i];
        }
      }
      preview.push(row);
    }

    return { mappings, preview };
  }
}

export const mappingService = new MappingService();
