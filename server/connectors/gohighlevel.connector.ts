import { decrypt } from '../lib/crypto';

interface GoHighLevelConfig {
  apiKey: string;
  locationId?: string;
}

class GoHighLevelConnector {
  private baseUrl = 'https://services.leadconnectorhq.com';

  async testConnection(config: GoHighLevelConfig): Promise<{ success: boolean; message: string }> {
    try {
      const apiKey = decrypt(config.apiKey);

      const response = await fetch(`${this.baseUrl}/locations/${config.locationId || ''}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
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

  async getPreview(config: GoHighLevelConfig): Promise<{ columns: string[]; sampleData: Record<string, unknown>[] }> {
    try {
      const data = await this.fetchData(config, { limit: 10 });
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      return { columns, sampleData: data };
    } catch {
      return { columns: [], sampleData: [] };
    }
  }

  async fetchData(
    config: GoHighLevelConfig,
    options?: { limit?: number; since?: string }
  ): Promise<Record<string, unknown>[]> {
    const apiKey = decrypt(config.apiKey);

    const params = new URLSearchParams();
    if (config.locationId) {
      params.set('locationId', config.locationId);
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }

    const response = await fetch(`${this.baseUrl}/conversations?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GoHighLevel data: ${response.statusText}`);
    }

    const result = await response.json();
    const conversations = result.conversations || [];

    // Transform conversations to flat records
    return conversations.map((conv: any) => ({
      id: conv.id,
      type: conv.type,
      contactId: conv.contactId,
      contactEmail: conv.contact?.email,
      contactPhone: conv.contact?.phone,
      contactName: `${conv.contact?.firstName || ''} ${conv.contact?.lastName || ''}`.trim(),
      lastMessage: conv.lastMessageBody,
      lastMessageType: conv.lastMessageType,
      lastMessageDate: conv.lastMessageDate,
      unreadCount: conv.unreadCount,
      status: conv.status,
      createdAt: conv.dateAdded,
      updatedAt: conv.dateUpdated,
    }));
  }
}

export const gohighlevelConnector = new GoHighLevelConnector();
