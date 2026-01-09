import { decrypt } from '../lib/crypto';

interface TeamworkConfig {
  subdomain: string;
  apiKey: string;
}

class TeamworkConnector {
  async testConnection(config: TeamworkConfig): Promise<{ success: boolean; message: string }> {
    try {
      const apiKey = decrypt(config.apiKey);
      const baseUrl = `https://${config.subdomain}.teamwork.com`;

      const response = await fetch(`${baseUrl}/desk/v1/me.json`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString('base64')}`,
        },
      });

      if (response.ok) {
        return { success: true, message: 'Connection successful' };
      }

      if (response.status === 401) {
        return { success: false, message: 'Invalid API key' };
      }

      return { success: false, message: `Connection failed: ${response.statusText}` };
    } catch (error) {
      return { success: false, message: `Connection error: ${(error as Error).message}` };
    }
  }

  async getPreview(config: TeamworkConfig): Promise<{ columns: string[]; sampleData: Record<string, unknown>[] }> {
    try {
      const data = await this.fetchData(config, { limit: 10 });
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      return { columns, sampleData: data };
    } catch {
      return { columns: [], sampleData: [] };
    }
  }

  async fetchData(
    config: TeamworkConfig,
    options?: { limit?: number; since?: string }
  ): Promise<Record<string, unknown>[]> {
    const apiKey = decrypt(config.apiKey);
    const baseUrl = `https://${config.subdomain}.teamwork.com`;

    const params = new URLSearchParams();
    if (options?.limit) {
      params.set('pageSize', String(options.limit));
    }
    if (options?.since) {
      params.set('updatedAfter', options.since);
    }

    const response = await fetch(`${baseUrl}/desk/v1/tickets.json?${params}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:x`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Teamwork data: ${response.statusText}`);
    }

    const result = await response.json();
    const tickets = result.tickets || [];

    // Transform tickets to flat records
    return tickets.map((ticket: any) => ({
      id: ticket.id,
      subject: ticket.subject,
      content: ticket.preview || ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      customerEmail: ticket.customer?.email,
      customerName: ticket.customer?.name,
      assignedTo: ticket.assignee?.name,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      tags: ticket.tags?.join(', '),
    }));
  }
}

export const teamworkConnector = new TeamworkConnector();
