import { eq, and } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { sources, projects, sourceMappings } from '../db/schema';
import { NotFoundError, BadRequestError } from '../errors';
import { encrypt } from '../lib/crypto';
import { auditService } from './audit.service';
import { teamworkConnector } from '../connectors/teamwork.connector';
import { gohighlevelConnector } from '../connectors/gohighlevel.connector';

interface FileInfo {
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
}

interface TeamworkSourceData {
  name: string;
  subdomain: string;
  apiKey: string;
}

interface GoHighLevelSourceData {
  name: string;
  apiKey: string;
  locationId?: string;
}

class SourceService {
  async listByProject(projectId: number, organizationId: number) {
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

    return db
      .select()
      .from(sources)
      .where(eq(sources.projectId, projectId))
      .orderBy(sources.createdAt);
  }

  async createFileSource(
    projectId: number,
    organizationId: number,
    file: FileInfo,
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

    // Ensure upload directory exists
    const uploadDir = path.dirname(file.path);
    await fs.mkdir(uploadDir, { recursive: true });

    // Detect schema from file
    const rawSchema = await this.detectFileSchema(file);

    const [source] = await db
      .insert(sources)
      .values({
        projectId,
        type: 'file',
        name: file.originalname,
        status: 'pending',
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        config: {},
        rawSchema,
      })
      .returning();

    // Audit log
    await auditService.log({
      action: 'source.created',
      resourceType: 'source',
      resourceId: source.id,
      userId,
      organizationId,
      details: { type: 'file', name: file.originalname },
    });

    return source;
  }

  async createTeamworkSource(
    projectId: number,
    organizationId: number,
    data: TeamworkSourceData,
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

    const [source] = await db
      .insert(sources)
      .values({
        projectId,
        type: 'teamwork',
        name: data.name,
        status: 'pending',
        config: {
          subdomain: data.subdomain,
          apiKey: encrypt(data.apiKey),
        },
        rawSchema: [],
      })
      .returning();

    // Audit log
    await auditService.log({
      action: 'source.created',
      resourceType: 'source',
      resourceId: source.id,
      userId,
      organizationId,
      details: { type: 'teamwork', name: data.name },
    });

    return source;
  }

  async createGoHighLevelSource(
    projectId: number,
    organizationId: number,
    data: GoHighLevelSourceData,
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

    const [source] = await db
      .insert(sources)
      .values({
        projectId,
        type: 'gohighlevel',
        name: data.name,
        status: 'pending',
        config: {
          apiKey: encrypt(data.apiKey),
          locationId: data.locationId,
        },
        rawSchema: [],
      })
      .returning();

    // Audit log
    await auditService.log({
      action: 'source.created',
      resourceType: 'source',
      resourceId: source.id,
      userId,
      organizationId,
      details: { type: 'gohighlevel', name: data.name },
    });

    return source;
  }

  async getById(id: number, organizationId: number) {
    const [source] = await db
      .select({
        source: sources,
        projectOrgId: projects.organizationId,
      })
      .from(sources)
      .innerJoin(projects, eq(projects.id, sources.projectId))
      .where(eq(sources.id, id))
      .limit(1);

    if (!source || source.projectOrgId !== organizationId) {
      throw new NotFoundError('Source', id);
    }

    return source.source;
  }

  async update(
    id: number,
    organizationId: number,
    data: { name?: string; config?: Record<string, unknown> },
    userId: number
  ) {
    const source = await this.getById(id, organizationId);

    const [updated] = await db
      .update(sources)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, id))
      .returning();

    // Get project for org ID
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, source.projectId))
      .limit(1);

    // Audit log
    await auditService.log({
      action: 'source.updated',
      resourceType: 'source',
      resourceId: id,
      userId,
      organizationId: project?.organizationId || organizationId,
      details: { changes: Object.keys(data) },
    });

    return updated;
  }

  async delete(id: number, organizationId: number, userId: number) {
    const source = await this.getById(id, organizationId);

    // Delete file if exists
    if (source.filePath) {
      try {
        await fs.unlink(source.filePath);
      } catch {
        // Ignore file deletion errors
      }
    }

    // Delete mappings first
    await db.delete(sourceMappings).where(eq(sourceMappings.sourceId, id));

    // Delete source
    await db.delete(sources).where(eq(sources.id, id));

    // Get project for org ID
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, source.projectId))
      .limit(1);

    // Audit log
    await auditService.log({
      action: 'source.deleted',
      resourceType: 'source',
      resourceId: id,
      userId,
      organizationId: project?.organizationId || organizationId,
      details: { name: source.name },
    });
  }

  async testConnection(id: number, organizationId: number) {
    const source = await this.getById(id, organizationId);

    if (source.type === 'file') {
      // Check file exists
      try {
        await fs.access(source.filePath!);
        return { success: true, message: 'File accessible' };
      } catch {
        return { success: false, message: 'File not found' };
      }
    }

    if (source.type === 'teamwork') {
      return teamworkConnector.testConnection(source.config as any);
    }

    if (source.type === 'gohighlevel') {
      return gohighlevelConnector.testConnection(source.config as any);
    }

    return { success: false, message: 'Unknown source type' };
  }

  async getPreview(id: number, organizationId: number) {
    const source = await this.getById(id, organizationId);

    if (source.type === 'file') {
      return this.getFilePreview(source);
    }

    if (source.type === 'teamwork') {
      return teamworkConnector.getPreview(source.config as any);
    }

    if (source.type === 'gohighlevel') {
      return gohighlevelConnector.getPreview(source.config as any);
    }

    return { columns: [], sampleData: [] };
  }

  private async detectFileSchema(file: FileInfo) {
    const content = await fs.readFile(file.path, 'utf-8');

    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      const records = parse(content, { columns: true, skip_empty_lines: true });
      if (records.length > 0) {
        return Object.keys(records[0]).map((key) => ({
          name: key,
          type: 'string',
          sample: records.slice(0, 3).map((r: any) => r[key]),
        }));
      }
    }

    if (
      file.mimetype.includes('spreadsheet') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json(worksheet);
      if (records.length > 0) {
        return Object.keys(records[0] as object).map((key) => ({
          name: key,
          type: 'string',
          sample: records.slice(0, 3).map((r: any) => r[key]),
        }));
      }
    }

    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      const data = JSON.parse(content);
      const records = Array.isArray(data) ? data : [data];
      if (records.length > 0) {
        return Object.keys(records[0]).map((key) => ({
          name: key,
          type: typeof records[0][key],
          sample: records.slice(0, 3).map((r: any) => r[key]),
        }));
      }
    }

    return [];
  }

  private async getFilePreview(source: typeof sources.$inferSelect) {
    if (!source.filePath) {
      return { columns: [], sampleData: [] };
    }

    const content = await fs.readFile(source.filePath, 'utf-8');

    if (source.mimeType === 'text/csv' || source.filePath.endsWith('.csv')) {
      const records = parse(content, { columns: true, skip_empty_lines: true });
      return {
        columns: records.length > 0 ? Object.keys(records[0]) : [],
        sampleData: records.slice(0, 10),
      };
    }

    if (
      source.mimeType?.includes('spreadsheet') ||
      source.filePath.endsWith('.xlsx') ||
      source.filePath.endsWith('.xls')
    ) {
      const workbook = XLSX.readFile(source.filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json(worksheet);
      return {
        columns: records.length > 0 ? Object.keys(records[0] as object) : [],
        sampleData: records.slice(0, 10),
      };
    }

    if (source.mimeType === 'application/json' || source.filePath.endsWith('.json')) {
      const data = JSON.parse(content);
      const records = Array.isArray(data) ? data : [data];
      return {
        columns: records.length > 0 ? Object.keys(records[0]) : [],
        sampleData: records.slice(0, 10),
      };
    }

    return { columns: [], sampleData: [] };
  }
}

export const sourceService = new SourceService();
