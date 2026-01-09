import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../db';
import { processingJobs, processedRecords, sources, projects, sourceMappings } from '../db/schema';
import { NotFoundError, BadRequestError } from '../errors';
import { auditService } from './audit.service';
import { piiEngine } from '../processing/pii-engine';
import { filterEngine } from '../processing/filter-engine';

interface ListOptions {
  page: number;
  limit: number;
  offset: number;
}

class ProcessingService {
  async startJob(
    projectId: number,
    organizationId: number,
    sourceIds: number[] | undefined,
    userId: number
  ) {
    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))
      )
      .limit(1);

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Get sources to process
    let projectSources = await db
      .select()
      .from(sources)
      .where(eq(sources.projectId, projectId));

    if (sourceIds && sourceIds.length > 0) {
      projectSources = projectSources.filter((s) => sourceIds.includes(s.id));
    }

    if (projectSources.length === 0) {
      throw new BadRequestError('No sources available to process');
    }

    // Create job
    const [job] = await db
      .insert(processingJobs)
      .values({
        projectId,
        status: 'pending',
        progress: 0,
        recordsTotal: 0,
        recordsProcessed: 0,
        configSnapshot: {
          piiSettings: project.piiSettings,
          filterSettings: project.filterSettings,
          sourceIds: projectSources.map((s) => s.id),
        },
      })
      .returning();

    // Audit log
    await auditService.log({
      action: 'job.started',
      resourceType: 'processing_job',
      resourceId: job.id,
      userId,
      organizationId,
      details: { projectId, sourceCount: projectSources.length },
    });

    // Start processing in background
    this.processJob(job.id, projectSources, project).catch((error) => {
      console.error('Processing job failed:', error);
    });

    return job;
  }

  async listJobs(projectId: number, organizationId: number, options: ListOptions) {
    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))
      )
      .limit(1);

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(processingJobs)
        .where(eq(processingJobs.projectId, projectId))
        .orderBy(desc(processingJobs.createdAt))
        .limit(options.limit)
        .offset(options.offset),
      db
        .select({ total: count() })
        .from(processingJobs)
        .where(eq(processingJobs.projectId, projectId)),
    ]);

    return {
      items,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  }

  async getJob(id: number, organizationId: number) {
    const [job] = await db
      .select({
        job: processingJobs,
        projectOrgId: projects.organizationId,
      })
      .from(processingJobs)
      .innerJoin(projects, eq(projects.id, processingJobs.projectId))
      .where(eq(processingJobs.id, id))
      .limit(1);

    if (!job || job.projectOrgId !== organizationId) {
      throw new NotFoundError('Processing job', id);
    }

    return job.job;
  }

  async cancelJob(id: number, organizationId: number, userId: number) {
    const job = await this.getJob(id, organizationId);

    if (!['pending', 'processing'].includes(job.status)) {
      throw new BadRequestError('Job cannot be cancelled');
    }

    const [updated] = await db
      .update(processingJobs)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(processingJobs.id, id))
      .returning();

    // Audit log
    await auditService.log({
      action: 'job.cancelled',
      resourceType: 'processing_job',
      resourceId: id,
      userId,
      organizationId,
      details: {},
    });

    return updated;
  }

  private async processJob(
    jobId: number,
    projectSources: Array<typeof sources.$inferSelect>,
    project: typeof projects.$inferSelect
  ) {
    try {
      // Update status to processing
      await db
        .update(processingJobs)
        .set({ status: 'processing', startedAt: new Date() })
        .where(eq(processingJobs.id, jobId));

      let totalRecords = 0;
      let processedCount = 0;
      const warnings: string[] = [];

      // Process each source
      for (const source of projectSources) {
        // Check if job was cancelled
        const [currentJob] = await db
          .select()
          .from(processingJobs)
          .where(eq(processingJobs.id, jobId))
          .limit(1);

        if (currentJob?.status === 'cancelled') {
          return;
        }

        // Get mappings for source
        const mappings = await db
          .select()
          .from(sourceMappings)
          .where(eq(sourceMappings.sourceId, source.id));

        // Get source data (simplified - in production, use streaming)
        const sourceData = await this.getSourceData(source);
        totalRecords += sourceData.length;

        // Update total count
        await db
          .update(processingJobs)
          .set({ recordsTotal: totalRecords })
          .where(eq(processingJobs.id, jobId));

        // Process records
        for (const record of sourceData) {
          // Apply mappings
          const mappedRecord: Record<string, unknown> = {};
          for (const mapping of mappings) {
            if (record[mapping.sourceField] !== undefined) {
              mappedRecord[mapping.targetField] = record[mapping.sourceField];
            }
          }

          // Apply filters
          if (!filterEngine.shouldInclude(mappedRecord, project.filterSettings as any)) {
            warnings.push(`Record filtered out by quality rules`);
            processedCount++;
            continue;
          }

          // Detect and tokenize PII
          const piiResult = piiEngine.process(mappedRecord, mappings, project.piiSettings as any);

          // Store processed record
          await db.insert(processedRecords).values({
            jobId,
            sourceId: source.id,
            originalData: record,
            processedData: piiResult.processedData,
            piiTokensMap: piiResult.tokensMap,
          });

          processedCount++;

          // Update progress
          const progress = Math.round((processedCount / totalRecords) * 100);
          await db
            .update(processingJobs)
            .set({
              recordsProcessed: processedCount,
              progress,
              updatedAt: new Date(),
            })
            .where(eq(processingJobs.id, jobId));
        }
      }

      // Mark job as completed
      await db
        .update(processingJobs)
        .set({
          status: 'completed',
          progress: 100,
          recordsProcessed: processedCount,
          completedAt: new Date(),
          warnings: warnings.length > 0 ? warnings.slice(0, 100) : null,
          updatedAt: new Date(),
        })
        .where(eq(processingJobs.id, jobId));
    } catch (error) {
      // Mark job as failed
      await db
        .update(processingJobs)
        .set({
          status: 'failed',
          errors: [(error as Error).message],
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(processingJobs.id, jobId));
    }
  }

  private async getSourceData(source: typeof sources.$inferSelect): Promise<Record<string, unknown>[]> {
    // For file sources, parse the file
    if (source.type === 'file' && source.filePath) {
      const { sourceService } = await import('./source.service');
      const preview = await sourceService.getPreview(source.id, -1);
      // This is simplified - in production, read full file with streaming
      return (preview as any).sampleData || [];
    }

    // For API sources, fetch data
    if (source.type === 'teamwork') {
      const { teamworkConnector } = await import('../connectors/teamwork.connector');
      return teamworkConnector.fetchData(source.config as any);
    }

    if (source.type === 'gohighlevel') {
      const { gohighlevelConnector } = await import('../connectors/gohighlevel.connector');
      return gohighlevelConnector.fetchData(source.config as any);
    }

    return [];
  }
}

export const processingService = new ProcessingService();
