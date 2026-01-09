import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { exports as exportsTable, processingJobs, processedRecords, projects } from '../db/schema';
import { NotFoundError, BadRequestError } from '../errors';
import { auditService } from './audit.service';
import { exportEngine } from '../processing/export-engine';

interface ExportOptions {
  systemPrompt?: string;
  contextWindow?: number;
}

class ExportService {
  async createExport(
    jobId: number,
    organizationId: number,
    format: 'jsonl_conversation' | 'jsonl_qa' | 'json_raw',
    options: ExportOptions | undefined,
    userId: number
  ) {
    // Verify job access
    const [job] = await db
      .select({
        job: processingJobs,
        projectOrgId: projects.organizationId,
      })
      .from(processingJobs)
      .innerJoin(projects, eq(projects.id, processingJobs.projectId))
      .where(eq(processingJobs.id, jobId))
      .limit(1);

    if (!job || job.projectOrgId !== organizationId) {
      throw new NotFoundError('Processing job', jobId);
    }

    if (job.job.status !== 'completed') {
      throw new BadRequestError('Can only export completed jobs');
    }

    // Get processed records
    const records = await db
      .select()
      .from(processedRecords)
      .where(eq(processedRecords.jobId, jobId));

    if (records.length === 0) {
      throw new BadRequestError('No records to export');
    }

    // Generate export file
    const exportDir = path.join(process.cwd(), 'data', 'exports', String(organizationId));
    await fs.promises.mkdir(exportDir, { recursive: true });

    const filename = `export-${jobId}-${format}-${Date.now()}${format === 'json_raw' ? '.json' : '.jsonl'}`;
    const filePath = path.join(exportDir, filename);

    const exportData = exportEngine.generate(
      records.map((r) => r.processedData as Record<string, unknown>),
      format,
      options
    );

    await fs.promises.writeFile(filePath, exportData);

    const stats = await fs.promises.stat(filePath);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create export record
    const [exportRecord] = await db
      .insert(exportsTable)
      .values({
        jobId,
        format,
        filePath,
        fileSize: stats.size,
        recordCount: records.length,
        expiresAt,
      })
      .returning();

    // Audit log
    await auditService.log({
      action: 'export.created',
      resourceType: 'export',
      resourceId: exportRecord.id,
      userId,
      organizationId,
      details: { jobId, format, recordCount: records.length },
    });

    return exportRecord;
  }

  async listByJob(jobId: number, organizationId: number) {
    // Verify job access
    const [job] = await db
      .select({
        job: processingJobs,
        projectOrgId: projects.organizationId,
      })
      .from(processingJobs)
      .innerJoin(projects, eq(projects.id, processingJobs.projectId))
      .where(eq(processingJobs.id, jobId))
      .limit(1);

    if (!job || job.projectOrgId !== organizationId) {
      throw new NotFoundError('Processing job', jobId);
    }

    return db
      .select()
      .from(exportsTable)
      .where(eq(exportsTable.jobId, jobId))
      .orderBy(exportsTable.createdAt);
  }

  async getById(id: number, organizationId: number) {
    const [exportRecord] = await db
      .select({
        export: exportsTable,
        projectOrgId: projects.organizationId,
      })
      .from(exportsTable)
      .innerJoin(processingJobs, eq(processingJobs.id, exportsTable.jobId))
      .innerJoin(projects, eq(projects.id, processingJobs.projectId))
      .where(eq(exportsTable.id, id))
      .limit(1);

    if (!exportRecord || exportRecord.projectOrgId !== organizationId) {
      throw new NotFoundError('Export', id);
    }

    return exportRecord.export;
  }

  async download(id: number, organizationId: number) {
    const exportRecord = await this.getById(id, organizationId);

    if (new Date() > exportRecord.expiresAt) {
      throw new BadRequestError('Export has expired');
    }

    const stream = fs.createReadStream(exportRecord.filePath);
    const filename = path.basename(exportRecord.filePath);
    const contentType =
      exportRecord.format === 'json_raw' ? 'application/json' : 'application/x-jsonlines';

    return { stream, filename, contentType };
  }
}

export const exportService = new ExportService();
